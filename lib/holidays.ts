/**
 * Swedish public holidays (allmänna helgdagar) and the three eves that
 * Detaljhandelsavtalet §8.1 equates with Saturdays.
 *
 * These matter because "söndagar och helgdagar" pays 100 % OB regardless of
 * which weekday the date happens to fall on — a Thursday that is Kristi
 * himmelsfärdsdag pays Sunday rates all day.
 */

/** Anonymous Gregorian computus. Returns Easter Sunday for the given year. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function iso(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function shift(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

/** The single Saturday inside an inclusive date range — used for the two
 *  holidays Sweden defines as "the Saturday that falls between X and Y". */
function saturdayBetween(year: number, fromMonth: number, fromDay: number): Date {
  const start = new Date(year, fromMonth - 1, fromDay);
  for (let i = 0; i < 7; i++) {
    const candidate = shift(start, i);
    if (candidate.getDay() === 6) return candidate;
  }
  return start;
}

type YearDays = { holidays: Set<string>; eves: Set<string> };

const cache = new Map<number, YearDays>();

function daysFor(year: number): YearDays {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const midsummerDay = saturdayBetween(year, 6, 20); // lördagen 20–26 juni

  const holidays = new Set<string>([
    iso(new Date(year, 0, 1)), // nyårsdagen
    iso(new Date(year, 0, 6)), // trettondedag jul
    iso(shift(easter, -2)), // långfredagen
    iso(easter), // påskdagen
    iso(shift(easter, 1)), // annandag påsk
    iso(new Date(year, 4, 1)), // första maj
    iso(shift(easter, 39)), // kristi himmelsfärdsdag
    iso(shift(easter, 49)), // pingstdagen
    iso(new Date(year, 5, 6)), // sveriges nationaldag
    iso(midsummerDay), // midsommardagen
    iso(saturdayBetween(year, 10, 31)), // alla helgons dag, lördagen 31 okt–6 nov
    iso(new Date(year, 11, 25)), // juldagen
    iso(new Date(year, 11, 26)), // annandag jul
  ]);

  // "Med lördagar jämställs jul-, nyårs- och midsommarafton" (§8.1).
  const eves = new Set<string>([
    iso(new Date(year, 11, 24)), // julafton
    iso(new Date(year, 11, 31)), // nyårsafton
    iso(shift(midsummerDay, -1)), // midsommarafton
  ]);

  const result = { holidays, eves };
  cache.set(year, result);
  return result;
}

export function isHelgdag(isoDate: string): boolean {
  return daysFor(Number(isoDate.slice(0, 4))).holidays.has(isoDate);
}

export function isSaturdayEve(isoDate: string): boolean {
  return daysFor(Number(isoDate.slice(0, 4))).eves.has(isoDate);
}
