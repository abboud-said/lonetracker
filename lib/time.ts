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

/** Format "HH:MM" back into minutes; returns null on anything unparseable. */
export function fromHhmm(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min >= 0 && min <= 1440 ? min : null;
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
