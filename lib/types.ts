/** Day of week, matching JavaScript's Date#getDay: 0 = Sunday .. 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * One OB level. `percent` is the supplement paid on top of the base rate, so a
 * tier at 50 pays baseRate * 0.5 per hour *in addition to* the base rate.
 */
export type ObTier = {
  id: string;
  /** Shown as-is in the UI, e.g. "OB 50%". Free text so it fits any agreement. */
  label: string;
  percent: number;
};

/**
 * What a calendar date counts as when matching rules. Beyond the seven
 * weekdays, a date can be a public holiday, or one of the three eves that
 * Detaljhandelsavtalet §8.1 equates with Saturdays.
 */
export type DayKey = Weekday | "holiday" | "eve";

/**
 * A slice of the clock on given day types that pays a tier. Minutes are counted
 * from midnight, so `to: 1440` means "up to end of day". Windows may not
 * overlap within a rule set — validateRuleSet enforces that.
 */
export type ObWindow = {
  id: string;
  days: DayKey[];
  from: number;
  to: number;
  tierId: string;
};

/** A full collective-agreement configuration. Hours in no window pay base only. */
export type RuleSet = {
  id: string;
  name: string;
  tiers: ObTier[];
  windows: ObWindow[];
};

/** One work shift, as read from an uploaded schedule. */
export type Shift = {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Minutes from midnight on `date`. */
  startMin: number;
  /** Minutes from midnight on `date`; may exceed 1440 for overnight shifts. */
  endMin: number;
  /** Unpaid break, in minutes. */
  breakMin: number;
};

export type Settings = {
  baseRate: number;
  taxRate: number;
  /**
   * Rast is unpaid and outside working time (Detaljhandelsavtalet §6.1), so it
   * is deducted by default. A måltidsuppehåll under §6.5, and any paus under
   * arbetstidslagen, counts as working time — set this when the break column
   * holds one of those instead.
   */
  breakIsPaid: boolean;
  /**
   * Semesterlön per vacation day, in kronor. The employer works this out from
   * average earnings, so it cannot be derived from an hourly rate — it is read
   * off a payslip ("Semesterlön betald ... a 1 622,25") and typed in.
   */
  semesterPayPerDay: number;
};

export type Language = "sv" | "en";
