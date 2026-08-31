import { classifyDay, segmentsForDay } from "./rules";
import { addDays } from "./time";
import { NO_LEAVE, type LeaveDays } from "./parse";
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
  /** Days on leave, which are not paid by the hour. */
  leave: LeaveDays;
  /** Vacation pay included in the gross. */
  semesterPay: number;
  sick: SickResult;
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

/**
 * The same walk as splitShift, but keeping the segments in clock order instead
 * of totalling them. Karensperioden is the *first* part of a sick period, so
 * it has to be taken off the front of the day rather than off a total.
 */
export function shiftSegments(
  shift: Shift,
  ruleSet: RuleSet,
): { tierId: string; minutes: number }[] {
  const out: { tierId: string; minutes: number }[] = [];
  let cursor = shift.startMin;

  while (cursor < shift.endMin) {
    const dayIndex = Math.floor(cursor / 1440);
    const dayStart = dayIndex * 1440;
    const chunkEnd = Math.min(shift.endMin, dayStart + 1440);
    const day = classifyDay(addDays(shift.date, dayIndex));

    for (const seg of segmentsForDay(ruleSet, day)) {
      const from = Math.max(cursor, seg.from + dayStart);
      const to = Math.min(chunkEnd, seg.to + dayStart);
      if (to > from) out.push({ tierId: seg.tierId ?? BASE_KEY, minutes: to - from });
    }
    cursor = chunkEnd;
  }

  return out;
}

export type SickResult = {
  /** Hours that fell inside karensperioden and are therefore unpaid. */
  karensMinutes: number;
  /** Hours paid at the sjuklön rate. */
  paidMinutes: number;
  perTier: TierMinutes;
  amount: number;
  /** Days past the fourteenth of a sick period — Försäkringskassan's, not the employer's. */
  daysBeyondPeriod: number;
};

const SICK_RATE = 0.8;
const KARENS_SHARE = 0.2;
const SICK_PERIOD_DAYS = 14;
/** A new spell within five calendar days continues the previous one (§15.1). */
const RELAPSE_DAYS = 5;

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000,
  );
}

/**
 * Sjuklön for an hourly-paid worker, per Detaljhandelsavtalet §15.4.
 *
 * Sick days are grouped into periods — a fresh spell starting within five
 * calendar days of the last continues it, so it draws no second karens. Each
 * period opens with a karensperiod whose *length in hours* is 20 % of the
 * agreed average working week, taken from the front; nothing is paid for it.
 * Everything after is paid at 80 %, including 80 % of the OB those hours would
 * have earned.
 *
 * `include` narrows what is *reported* without narrowing what is *walked*. A
 * sick period that opens on 29 August and runs into September has one karens,
 * charged in August; filtering the days down to September before the walk
 * would open a second one and pay the month short. So every sick day is always
 * walked for the period bookkeeping, and only the days the caller asks for are
 * added to the totals.
 */
export function computeSickPay(
  sickDays: Shift[],
  ruleSet: RuleSet,
  settings: Settings,
  include: (day: Shift) => boolean = () => true,
): SickResult {
  const perTier: TierMinutes = {};
  let karensMinutes = 0;
  let paidMinutes = 0;
  let amount = 0;
  let daysBeyondPeriod = 0;

  const days = [...sickDays].sort((a, b) => a.date.localeCompare(b.date));
  const karensPerPeriod = Math.max(0, (settings.weeklyHours || 0) * 60 * KARENS_SHARE);

  let periodStart: string | null = null;
  let previousDay: string | null = null;
  let karensLeft = 0;

  for (const day of days) {
    const isNewPeriod =
      previousDay == null || daysBetween(previousDay, day.date) > RELAPSE_DAYS;
    if (isNewPeriod) {
      periodStart = day.date;
      karensLeft = karensPerPeriod;
    }
    previousDay = day.date;

    // Days outside the caller's window still consume karens and still advance
    // the period, they just do not appear in the figures.
    const reported = include(day);

    // Past day fourteen the employer stops paying and Försäkringskassan starts.
    if (periodStart != null && daysBetween(periodStart, day.date) >= SICK_PERIOD_DAYS) {
      if (reported) daysBeyondPeriod++;
      continue;
    }

    // What the day would have paid had it been worked, break included.
    const worked = computeShift(day, ruleSet, settings);
    const scale =
      worked.paidMinutes > 0
        ? worked.paidMinutes / shiftSegments(day, ruleSet).reduce((a, b) => a + b.minutes, 0)
        : 0;

    for (const seg of shiftSegments(day, ruleSet)) {
      let minutes = seg.minutes * scale;
      if (karensLeft > 0) {
        const swallowed = Math.min(karensLeft, minutes);
        karensLeft -= swallowed;
        if (reported) karensMinutes += swallowed;
        minutes -= swallowed;
      }
      if (minutes <= 0 || !reported) continue;

      perTier[seg.tierId] = (perTier[seg.tierId] ?? 0) + minutes;
      paidMinutes += minutes;

      const tier = ruleSet.tiers.find((t) => t.id === seg.tierId);
      const hourly = settings.baseRate * (1 + (tier ? tier.percent / 100 : 0));
      amount += (minutes / 60) * hourly * SICK_RATE;
    }
  }

  return { karensMinutes, paidMinutes, perTier, amount, daysBeyondPeriod };
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

/**
 * Totals for one month, or for everything loaded when `month` is null.
 *
 * The shift results are filtered by the caller, but leave is not: sjuklön has
 * to see every sick day to get its periods right, so the whole set is passed
 * in and narrowed here.
 */
export function computeTotals(
  results: ShiftResult[],
  settings: Settings,
  leave: LeaveDays = NO_LEAVE(),
  ruleSet?: RuleSet,
  month: string | null = null,
): Totals {
  const within = (day: Shift) => month == null || day.date.startsWith(month);
  const visibleLeave: LeaveDays = {
    semester: leave.semester.filter(within),
    sick: leave.sick.filter(within),
    other: leave.other.filter(within),
  };

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
  //
  // Other leave stays out — tjänstledighet and the rest may not be paid at all,
  // and the export does not say which.
  const semesterPay = visibleLeave.semester.length * (settings.semesterPayPerDay || 0);
  gross += semesterPay;

  const sick = ruleSet
    ? computeSickPay(leave.sick, ruleSet, settings, within)
    : { karensMinutes: 0, paidMinutes: 0, perTier: {}, amount: 0, daysBeyondPeriod: 0 };
  gross += sick.amount;

  const tax = gross * (settings.taxRate / 100);

  return {
    shifts: results.length,
    leave: visibleLeave,
    semesterPay,
    sick,
    paidMinutes,
    perTier,
    baseAmount,
    tierAmounts,
    gross,
    tax,
    net: gross - tax,
  };
}
