import type { Language, Weekday } from "./types";

/**
 * Parse a cell into minutes from midnight. Accepts "17:30", "17:30:00", an ISO
 * timestamp, and Excel's fractional-day serial (0.5 = noon), which is what the
 * xlsx reader hands back for time-formatted cells.
 */
export function toMinutes(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  const iso = s.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) return Number(iso[1]) * 60 + Number(iso[2]);

  const hm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);

  const n = parseFloat(s.replace(",", "."));
  if (isFinite(n) && n > 0 && n < 2) return Math.round(n * 24 * 60);
  return null;
}

/** Format minutes-from-midnight as HH:MM, wrapping past midnight. */
export function hhmm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}

function clock(h: number, m: number): number | null {
  if (m > 59) return null;
  const min = h * 60 + m;
  return min >= 0 && min <= 1440 ? min : null;
}

/**
 * Read a clock time the way someone actually types one.
 *
 * A phone raises a digits-only keypad for these fields, and on iOS it has no
 * colon key at all — so insisting on "17:00" locked out anyone entering shifts
 * by hand on an iPhone, which is the one route that is meant to work for
 * everybody. Bare digits are accepted for that reason: 1700, 930 and 17 all
 * mean what they look like.
 */
export function fromHhmm(value: string): number | null {
  const s = value.trim();
  if (s === "") return null;

  // 17:00 and 17.00, plus 17:5 — which nobody means as 17:50.
  const sep = s.match(/^(\d{1,2})[:.,](\d{1,2})$/);
  if (sep) return clock(Number(sep[1]), Number(sep[2].padStart(2, "0")));

  const bare = s.match(/^\d{1,4}$/);
  if (bare) {
    const d = bare[0];
    if (d.length <= 2) return clock(Number(d), 0);
    return clock(Number(d.slice(0, -2)), Number(d.slice(-2)));
  }

  return null;
}

/**
 * Read a break length. A bare number is minutes, because that is how a break
 * is spoken and written — "30" is half an hour, not thirty hours. Separated
 * forms still mean hours and minutes, so 1:15 is 75 minutes.
 */
export function parseDuration(value: string): number | null {
  const s = value.trim();
  if (s === "") return null;

  const sep = s.match(/^(\d{1,2})[:.,](\d{1,2})$/);
  if (sep) {
    const m = Number(sep[2].padStart(2, "0"));
    return m > 59 ? null : Number(sep[1]) * 60 + m;
  }

  const bare = s.match(/^\d{1,4}$/);
  if (bare) {
    const min = Number(bare[0]);
    return min <= 1440 ? min : null;
  }

  return null;
}

export function weekdayOf(isoDate: string): Weekday {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay() as Weekday;
}

/** Add whole days to an ISO date string, without touching the local timezone. */
export function addDays(isoDate: string, days: number): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, mo - 1, d + days);
  return (
    dt.getFullYear() +
    "-" +
    String(dt.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dt.getDate()).padStart(2, "0")
  );
}

const MONTHS: Record<Language, string[]> = {
  sv: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const MONTHS_LONG: Record<Language, string[]> = {
  sv: [
    "januari", "februari", "mars", "april", "maj", "juni",
    "juli", "augusti", "september", "oktober", "november", "december",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

/** The month picker's value for "do not narrow to a month at all". */
export const ALL_MONTHS = "all";

/** The distinct YYYY-MM present in a set of dates, oldest first. */
export function monthsOf(dates: string[]): string[] {
  return [...new Set(dates.map((d) => d.slice(0, 7)))].sort();
}

/** "2026-08" as "augusti 2026". */
export function monthLabel(month: string, lang: Language): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS_LONG[lang][m - 1] ?? month;
  return `${name} ${y}`;
}

const WEEKDAYS: Record<Language, string[]> = {
  sv: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function weekdayLabel(dow: Weekday, lang: Language): string {
  return WEEKDAYS[lang][dow];
}

export function dateLabel(isoDate: string, lang: Language): string {
  const [, mo, d] = isoDate.split("-").map(Number);
  const dow = weekdayOf(isoDate);
  return `${WEEKDAYS[lang][dow]} ${d} ${MONTHS[lang][mo - 1]}`;
}

/** Currency is always SEK — OB is a Swedish concept — but grouping follows the UI language. */
export function money(n: number, lang: Language): string {
  const locale = lang === "sv" ? "sv-SE" : "en-GB";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
  return `${formatted} kr`;
}

export function hours(min: number, lang: Language): string {
  const v = (min / 60).toFixed(2);
  return (lang === "sv" ? v.replace(".", ",") : v) + " h";
}

/** Parse a number the user typed, accepting both comma and dot decimals. */
export function parseNumber(value: string): number {
  const n = parseFloat(String(value).replace(",", "."));
  return isFinite(n) ? n : 0;
}

/**
 * Parse a number the user is part-way through typing, keeping "not a number
 * yet" distinct from zero. Emptying a field to retype it used to commit a 0,
 * which then sat in front of everything typed next.
 *
 * "177," and "177." parse to 177 so totals keep up mid-keystroke, while the
 * field goes on showing what was typed. Negatives are refused: a rate or a tax
 * percentage below zero has no meaning here.
 */
export function parseNumberOrNull(value: string): number | null {
  const s = value.trim().replace(",", ".");
  if (s === "" || s === "." || !/^\d*\.?\d*$/.test(s)) return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

/** Show a number back using the decimal separator of the UI language. */
export function formatNumberInput(n: number, lang: Language): string {
  const s = String(n);
  return lang === "sv" ? s.replace(".", ",") : s;
}
