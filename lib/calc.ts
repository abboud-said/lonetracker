import { segmentsForDay } from "./rules";
import { addDays, weekdayOf } from "./time";
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
  perTier: TierMinutes;
  /** Base pay on every paid hour, before any supplement. */
  baseAmount: number;
  /** Supplement per tier id, on top of base. */
  tierAmounts: Record<string, number>;
  gross: number;
};

export type Totals = {
  shifts: number;
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
 */
export function splitShift(shift: Shift, ruleSet: RuleSet): TierMinutes {
  const out: TierMinutes = { [BASE_KEY]: 0 };

  let cursor = shift.startMin;
  while (cursor < shift.endMin) {
    const dayIndex = Math.floor(cursor / 1440);
    const dayStart = dayIndex * 1440;
    const chunkEnd = Math.min(shift.endMin, dayStart + 1440);
    const dow = weekdayOf(addDays(shift.date, dayIndex));

    for (const seg of segmentsForDay(ruleSet, dow)) {
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
  const rawTotal = Object.values(raw).reduce((a, b) => a + b, 0);
  const breakMinutes = Math.max(0, shift.breakMin || 0);

  // The unpaid break is spread proportionally over the tiers rather than taken
  // off the end, so a break never silently eats the highest-paid hours.
  const factor = rawTotal > 0 ? Math.max(0, rawTotal - breakMinutes) / rawTotal : 1;

  const perTier: TierMinutes = {};
  for (const [key, minutes] of Object.entries(raw)) perTier[key] = minutes * factor;
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
    perTier,
    baseAmount,
    tierAmounts,
    gross,
  };
}

export function computeTotals(results: ShiftResult[], settings: Settings): Totals {
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

  const tax = gross * (settings.taxRate / 100);

  return {
    shifts: results.length,
    paidMinutes,
    perTier,
    baseAmount,
    tierAmounts,
    gross,
    tax,
    net: gross - tax,
  };
}
