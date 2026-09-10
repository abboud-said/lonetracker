/**
 * Semesterlön and semesterersättning under Detaljhandelsavtalet §14.
 *
 * The exact kr/dag figure is on the lönebesked, and when someone has it that
 * figure always wins — the employer's own calculation includes things this
 * cannot see, such as semesterlönegrundande frånvaro (§14.7). What is here is
 * the agreement's formula, for the person who has no such payslip yet.
 */

/** §14.6 A: semesterlön is 13 % of the year's semesterlöneunderlag. */
export const SEMESTER_PERCENT = 13;

/** §14.6 B 2: the hours a full-time year counts as, for pro-rating the guarantee. */
export const SEMESTERLONEFAKTOR = 1796;

/**
 * §14.6 B 1: the lowest semesterlön per paid day for a full-time employee,
 * from each date. "Experienced" is three years of branschvana.
 */
const GARANTIBELOPP = [
  { from: "2025-04-01", adult: 1470, experienced: 1740 },
  { from: "2026-04-01", adult: 1515, experienced: 1790 },
] as const;

/**
 * The guarantee in force on a date. Before the agreement's first step the
 * first step is used; after its last, the last — the 2025–2027 agreement is
 * the only one encoded, and a later one will need adding here.
 */
export function garantibelopp(date: string, experienced: boolean): number {
  let row: (typeof GARANTIBELOPP)[number] = GARANTIBELOPP[0];
  for (const step of GARANTIBELOPP) {
    if (date >= step.from) row = step;
  }
  return experienced ? row.experienced : row.adult;
}

export type SemesterEstimate = {
  /** 13 % of the underlag, spread over the paid days. */
  fromPercent: number;
  /**
   * The guarantee, pro-rated by hours worked (§14.6 B 2). Null when the hours
   * were not given, in which case the estimate cannot be checked against it.
   */
  guarantee: number | null;
  perDay: number;
  guaranteeWins: boolean;
};

/**
 * Semesterlön per day, estimated from the agreement.
 *
 * `underlag` is the pay for work done in the intjänandeår (1 April – 31 March):
 * timlön and OB, not semesterlön or sjuklön (§14.6 A). The 13 % is the whole
 * year's semesterlön, shared across the paid days that year earned — 25 for a
 * full year's employment.
 *
 * Hourly-paid staff are part-time under the agreement (§7.3 B), so the
 * guarantee is always pro-rated by hours. Starting or leaving mid-year uses a
 * two-step pro-rating (§14.6 B 3) that is not modelled; it only matters when
 * the guarantee is what decides the figure.
 */
export function estimateSemesterPerDay({
  underlag,
  paidDays,
  hoursWorked,
  experienced,
  date,
}: {
  underlag: number;
  paidDays: number;
  hoursWorked: number;
  experienced: boolean;
  date: string;
}): SemesterEstimate | null {
  if (!(underlag > 0) || !(paidDays > 0)) return null;

  const fromPercent = (underlag * SEMESTER_PERCENT) / 100 / paidDays;
  const guarantee =
    hoursWorked > 0
      ? (hoursWorked * garantibelopp(date, experienced)) / SEMESTERLONEFAKTOR
      : null;
  const guaranteeWins = guarantee != null && guarantee > fromPercent;
  const perDay = round2(guaranteeWins ? guarantee! : fromPercent);

  return { fromPercent: round2(fromPercent), guarantee: guarantee == null ? null : round2(guarantee), perDay, guaranteeWins };
}

/**
 * Semesterersättning paid with each month's pay, for someone whose payslip
 * shows it that way: the same 13 % (§14.8), on the month's pay for work.
 */
export function monthlySemesterersattning(workPay: number): number {
  return (workPay * SEMESTER_PERCENT) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
