import { classifyDay, segmentsForDay } from "./rules";
import { addDays } from "./time";
import type { RuleSet, Settings, Shift } from "./types";

/** Minutes worked per tier. The empty-string key holds plain base-rate minutes. */
export type TierMinutes = Record<string, number>;

export const BASE_KEY = "";

export type ShiftResult = {
  shift: Shift;
  /** Minutes actually paid, after the unpaid break is removed. */
  paidMinutes: number;
  /** Clock time from start to end, break included — used for shift duration. */
  spanMinutes: number;
  breakMinutes: number;
  /**
   * Scheduled more than five hours with no rast recorded. Arbetstidslagen §15
   * entitles the worker to one, so this usually means the schedule export left
   * the break out — or that the schedule itself is non-compliant.
   */
  missingBreak: boolean;
  perTier: TierMinutes;
  /** Base pay on every paid hour, before any supplement. */
  baseAmount: number;
  /** Supplement per tier id, on top of base. */
  tierAmounts: Record<string, number>;
  gross: number;
};

export type Totals = {
  shifts: number;
  /** Days on leave, paid as semesterlön rather than by the hour. */
  absenceDays: number;
  semesterPay: number;
  paidMinutes: number;
  perTier: TierMinutes;
  baseAmount: number;
  tierAmounts: Record<string, number>;
  gross: number;
  tax: number;
  net: number;
};

/**
 * Distribute a shift's minutes across OB tiers.
 *
 * Shifts that run past midnight are walked day by day, so the hours after
 * midnight are matched against the *next* day's windows — a Saturday 18:00–02:00
 * shift correctly pays Sunday rates for its last two hours.
 *
 * Each day is classified before matching, so a public holiday pays holiday
 * rates whatever weekday it lands on.
 */
export function splitShift(shift: Shift, ruleSet: RuleSet): TierMinutes {
  const out: TierMinutes = { [BASE_KEY]: 0 };

  let cursor = shift.startMin;
  while (cursor < shift.endMin) {
    const dayIndex = Math.floor(cursor / 1440);
    const dayStart = dayIndex * 1440;
    const chunkEnd = Math.min(shift.endMin, dayStart + 1440);
    const day = classifyDay(addDays(shift.date, dayIndex));

    for (const seg of segmentsForDay(ruleSet, day)) {
      const overlap =
        Math.min(chunkEnd - dayStart, seg.to) - Math.max(cursor - dayStart, seg.from);
      if (overlap > 0) {
        const key = seg.tierId ?? BASE_KEY;
        out[key] = (out[key] ?? 0) + overlap;
      }
    }

    cursor = chunkEnd;
  }

  return out;
}

export function computeShift(shift: Shift, ruleSet: RuleSet, settings: Settings): ShiftResult {
  const raw = splitShift(shift, ruleSet);
  const breakMinutes = Math.max(0, shift.breakMin || 0);

  // A rast is unpaid and falls outside working time (Detaljhandelsavtalet
  // §6.1); a måltidsuppehåll or paus counts as working time and is not
  // deducted at all.
  //
  // Schedules record how long the break was but never when it fell, so it is
  // placed as one block in the middle of the shift and removed from whichever
  // tiers it lands on. Checked against two months of real Bestseller payroll
  // data, this reproduced the employer's own per-tier figures on 28 of 31
  // days, where both proportional splitting and taking it off base first were
  // wrong on roughly a third of them: an evening shift takes its break during
  // OB hours, a daytime shift does not.
  const deducted = settings.breakIsPaid ? 0 : breakMinutes;
  const perTier: TierMinutes = { ...raw };

  if (deducted > 0) {
    const middle = (shift.startMin + shift.endMin) / 2;
    const breakStart = middle - deducted / 2;
    const breakEnd = middle + deducted / 2;

    let cursor = shift.startMin;
    while (cursor < shift.endMin) {
      const dayIndex = Math.floor(cursor / 1440);
      const dayStart = dayIndex * 1440;
      const chunkEnd = Math.min(shift.endMin, dayStart + 1440);
      const day = classifyDay(addDays(shift.date, dayIndex));

      for (const seg of segmentsForDay(ruleSet, day)) {
        const segFrom = Math.max(cursor, seg.from + dayStart);
        const segTo = Math.min(chunkEnd, seg.to + dayStart);
        if (segTo <= segFrom) continue;
        const overlap = Math.min(segTo, breakEnd) - Math.max(segFrom, breakStart);
        if (overlap > 0) {
          const key = seg.tierId ?? BASE_KEY;
          perTier[key] = Math.max(0, (perTier[key] ?? 0) - overlap);
        }
      }
      cursor = chunkEnd;
    }
  }

  const paidMinutes = Object.values(perTier).reduce((a, b) => a + b, 0);

  const baseAmount = (paidMinutes / 60) * settings.baseRate;
  const tierAmounts: Record<string, number> = {};
  for (const tier of ruleSet.tiers) {
    const minutes = perTier[tier.id] ?? 0;
    if (minutes > 0) {
      tierAmounts[tier.id] = (minutes / 60) * settings.baseRate * (tier.percent / 100);
    }
  }

  const gross = baseAmount + Object.values(tierAmounts).reduce((a, b) => a + b, 0);

  return {
    shift,
    paidMinutes,
    spanMinutes: shift.endMin - shift.startMin,
    breakMinutes,
    missingBreak: breakMinutes === 0 && shift.endMin - shift.startMin > 5 * 60,
    perTier,
    baseAmount,
    tierAmounts,
    gross,
  };
}

export function computeTotals(
  results: ShiftResult[],
  settings: Settings,
  absenceDays = 0,
): Totals {
  const perTier: TierMinutes = {};
  const tierAmounts: Record<string, number> = {};
  let paidMinutes = 0;
  let baseAmount = 0;
  let gross = 0;

  for (const r of results) {
    paidMinutes += r.paidMinutes;
    baseAmount += r.baseAmount;
    gross += r.gross;
    for (const [key, minutes] of Object.entries(r.perTier)) {
      perTier[key] = (perTier[key] ?? 0) + minutes;
    }
    for (const [key, amount] of Object.entries(r.tierAmounts)) {
      tierAmounts[key] = (tierAmounts[key] ?? 0) + amount;
    }
  }

  // Semesterlön is its own line on the payslip and carries no OB, but it is
  // taxed with everything else, so it joins the gross before tax is taken.
  const semesterPay = absenceDays * (settings.semesterPayPerDay || 0);
  gross += semesterPay;

  const tax = gross * (settings.taxRate / 100);

  return {
    shifts: results.length,
    absenceDays,
    semesterPay,
    paidMinutes,
    perTier,
    baseAmount,
    tierAmounts,
    gross,
    tax,
    net: gross - tax,
  };
}
