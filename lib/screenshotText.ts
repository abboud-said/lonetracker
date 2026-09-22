/**
 * Turn the text read off a schedule screenshot into shifts.
 *
 * OCR output is not a pasted roster. The date, the times and the break of one
 * day usually land on separate lines, the year is almost never in the picture,
 * weekday names are, and digits come back with the odd O for 0 or l for 1. So
 * this reads in blocks: a line that carries a date opens a day, and the lines
 * after it belong to that day until the next date.
 *
 * Nothing here is trusted enough to load unseen. Every day found is handed
 * back with the lines it came from and any doubt about it, so the person can
 * hold the table against the picture before a single krona is calculated.
 * A day that had a date but no readable times is returned by name rather
 * than dropped — a month quietly one shift short is the worst outcome.
 *
 * Deliberately free of imports so it can be run under plain Node for checks.
 */

export type ReadKind = "work" | "sick" | "semester";

/** Why a row deserves a second look before it is used. */
export type ReadFlag =
  /** A weekday was in the picture and does not match the date arrived at. */
  | "weekday"
  /** No year anywhere in the picture, so one was assumed. */
  | "year"
  /**
   * Over five hours and nothing about a break was read — neither a length nor
   * "ingen rast". Break lines are small grey text and the first thing OCR
   * loses, and a lost break pays the whole shift: wrong in the one direction
   * a pay figure must never be.
   */
  | "noBreak";

export type ReadShift = {
  date: string;
  startMin: number;
  endMin: number;
  breakMin: number;
  kind: ReadKind;
  /** The lines this was read from, joined, for showing beside the row. */
  source: string;
  flags: ReadFlag[];
};

export type ScreenshotRead = {
  shifts: ReadShift[];
  /** Days with a date but fewer than two readable times. Named, never dropped. */
  unread: { date: string | null; source: string }[];
  /** True when no year was found anywhere and today's was used. */
  yearAssumed: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

// Full words and the usual abbreviations only. A bare prefix match would turn
// "Sundbyberg" on a location line into a Sunday.
const WEEKDAYS: Record<string, number> = {
  söndag: 0, sön: 0, sunday: 0, sun: 0,
  måndag: 1, mån: 1, monday: 1, mon: 1,
  tisdag: 2, tis: 2, tuesday: 2, tue: 2, tues: 2,
  onsdag: 3, ons: 3, wednesday: 3, wed: 3,
  torsdag: 4, tor: 4, tors: 4, thursday: 4, thu: 4, thur: 4, thurs: 4,
  fredag: 5, fre: 5, friday: 5, fri: 5,
  lördag: 6, lör: 6, saturday: 6, sat: 6,
};

const MONTH_RE = "(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)[a-zåäö]*\\.?";
const WEEKDAY_RE = new RegExp(`(^|[^a-zåäö])(${Object.keys(WEEKDAYS).join("|")})(?![a-zåäö])`, "i");

// Two-digit minutes are required, and the hour is bounded, so "3.8" is not a
// time and "17.00" is.
const TIME_RE = /(^|[^\d])([01]?\d|2[0-4])[:.]([0-5]\d)(?!\d)(?:\s*([ap])\.?m\b\.?)?/gi;

const SICK_RE = /(^|[^a-zåäö])(sjuk|sick)/i;
const SEMESTER_RE = /(^|[^a-zåäö])(semester|vacation|holiday)/i;
const OFF_RE = /(^|[^a-zåäö])(ledig|day off|off)(?![a-zåäö])/i;

/** Fix the digit confusions OCR makes inside a clock time: O for 0, l or I for 1. */
function repairDigits(line: string): string {
  const fix = (s: string) => s.replace(/[Oo]/g, "0").replace(/[IlL|]/g, "1");
  // The trailing check refuses ".<digit>", or "08.08.2026" becomes a time.
  return line
    .replace(
      /(^|[\s(\-–—])([0-9OoIlL|]{1,2})\s*[:.;]\s*([0-9OoIlL|]{2})(?=$|[\s)\-–—,]|\.(?!\d))/g,
      (_, pre, h, m) => `${pre}${fix(h)}:${fix(m)}`,
    )
    .replace(/(^|[^\dA-Za-zåäö])([0-9OoIlL|]{1,3})(?=\s*min\b)/gi, (_, pre, n) => `${pre}${fix(n)}`);
}

function normalise(line: string): string {
  return repairDigits(
    line
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function valid(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getMonth() === m - 1 && dt.getDate() === d;
}

function weekdayOf(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d).getDay();
}

type DatePart = { day: number; month: number | null; year: number | null; rest: string };

/**
 * Find the date on a line. Returns what was actually present: a year and a
 * month only when the picture said so, since assuming them is a separate step
 * that has to be reported.
 */
function findDate(line: string): DatePart | null {
  let m: RegExpMatchArray | null;

  // 2026-08-03
  if ((m = line.match(/(^|[^\d])(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/))) {
    return {
      year: Number(m[2]), month: Number(m[3]), day: Number(m[4]),
      rest: line.replace(m[0], m[1] + " "),
    };
  }
  // 03.08.2026, 3/8/2026, 3-8-2026
  if ((m = line.match(/(^|[^\d])(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/))) {
    return {
      year: Number(m[4]), month: Number(m[3]), day: Number(m[2]),
      rest: line.replace(m[0], m[1] + " "),
    };
  }
  // 3 aug, 3 augusti, 3 aug 2026, 3. augusti
  const dm = new RegExp(`(^|[^\\d])(\\d{1,2})\\.?\\s*${MONTH_RE}(?:\\s+(\\d{4}))?`, "i");
  if ((m = line.match(dm))) {
    return {
      year: m[4] ? Number(m[4]) : null, month: MONTHS[m[3].toLowerCase()], day: Number(m[2]),
      rest: line.replace(m[0], m[1] + " "),
    };
  }
  // Aug 3, August 3 2026
  const md = new RegExp(`(^|[^a-zåäö])${MONTH_RE}\\s+(\\d{1,2})(?![\\d:.])(?:,?\\s+(\\d{4}))?`, "i");
  if ((m = line.match(md))) {
    return {
      year: m[4] ? Number(m[4]) : null, month: MONTHS[m[2].toLowerCase()], day: Number(m[3]),
      rest: line.replace(m[0], m[1] + " "),
    };
  }
  // 3/8 — day and month, no year. The slash form only: "3.8" with a dot is
  // rare in a schedule and too close to a time to risk.
  if ((m = line.match(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?![\d/])/))) {
    return {
      year: null, month: Number(m[3]), day: Number(m[2]),
      rest: line.replace(m[0], m[1] + " "),
    };
  }
  // Mån 3, Måndag 3 — a weekday and a day number, month from the heading.
  const wd = new RegExp(`(^|[^a-zåäö])(${Object.keys(WEEKDAYS).join("|")})\\.?\\s+(\\d{1,2})(?![\\d:./])`, "i");
  if ((m = line.match(wd))) {
    return {
      year: null, month: null, day: Number(m[3]),
      rest: line.replace(m[0], m[1] + m[2] + " "),
    };
  }
  return null;
}

/** "Augusti 2026" or "aug 2026" in a heading gives the month and year for lines without one. */
function findHeading(line: string): { month: number; year: number } | null {
  const m = line.match(new RegExp(`(^|[^a-zåäö])${MONTH_RE}\\s+(\\d{4})(?!\\d)`, "i"));
  if (!m) return null;
  return { month: MONTHS[m[2].toLowerCase()], year: Number(m[3]) };
}

function findWeekday(line: string): number | null {
  const m = line.match(WEEKDAY_RE);
  return m ? WEEKDAYS[m[2].toLowerCase()] : null;
}

function findTimes(line: string): number[] {
  return Array.from(line.matchAll(TIME_RE)).map((m) => {
    let h = Number(m[2]);
    const half = m[4]?.toLowerCase();
    if (half === "p" && h < 12) h += 12;
    if (half === "a" && h === 12) h = 0;
    return h * 60 + Number(m[3]);
  });
}

/** "Rast 30 min", "30 min rast", "ingen rast". Null when the line says nothing about it. */
function findBreak(line: string): number | null {
  if (/ingen rast|no break|utan rast/i.test(line)) return 0;
  let m = line.match(/rast\D{0,8}(\d{1,3})\s*min/i);
  if (m) return Number(m[1]);
  m = line.match(/(\d{1,3})\s*min(?:uter|utes|s)?\b(?!\s*(?:sen|late|innan|before))/i);
  if (m && Number(m[1]) <= 180) return Number(m[1]);
  return null;
}

type Block = {
  date: DatePart;
  weekday: number | null;
  times: number[];
  breakMin: number | null;
  lines: string[];
};

export function readScheduleText(text: string, today: string): ScreenshotRead {
  const lines = text.split(/\r?\n/).map(normalise).filter(Boolean);
  const todayYear = Number(today.slice(0, 4));

  // Pass one: what the picture says about month and year as a whole.
  let heading: { month: number; year: number } | null = null;
  const yearsSeen = new Set<number>();
  for (const line of lines) {
    const h = findHeading(line);
    if (h && !heading) heading = h;
    const d = findDate(line);
    if (d?.year) yearsSeen.add(d.year);
  }

  // Pass two: group lines into days.
  const blocks: Block[] = [];
  let current: Block | null = null;
  // A weekday on a line of its own belongs to the date on the next line — the
  // "MÅNDAG / 3 AUGUSTI" layout some scheduling apps use.
  let pendingWeekday: number | null = null;

  for (const line of lines) {
    const date = findDate(line);
    if (date) {
      const weekday = findWeekday(line) ?? pendingWeekday;
      pendingWeekday = null;
      current = { date, weekday, times: [], breakMin: null, lines: [line] };
      blocks.push(current);
      absorb(current, date.rest);
      continue;
    }

    const weekday = findWeekday(line);
    if (weekday != null && !/\d/.test(line)) {
      pendingWeekday = weekday;
      continue;
    }

    if (current) {
      current.lines.push(line);
      absorb(current, line);
    }
  }

  // Pass three: settle each day's date and build the rows.
  const monthsSeen = blocks.map((b) => b.date.month).filter((m): m is number => m != null);
  const contextMonth = heading?.month ?? mostCommon(monthsSeen);
  const contextYear = heading?.year ?? (yearsSeen.size === 1 ? [...yearsSeen][0] : null);
  const yearAssumed = contextYear == null && blocks.some((b) => b.date.year == null);

  const shifts: ReadShift[] = [];
  const unread: ScreenshotRead["unread"] = [];

  for (const b of blocks) {
    const source = b.lines.join(" · ");
    const month = b.date.month ?? contextMonth;
    if (month == null) {
      unread.push({ date: null, source });
      continue;
    }

    const flags: ReadFlag[] = [];
    let year = b.date.year ?? contextYear;
    if (year == null) {
      year = todayYear;
      flags.push("year");
    }

    // A weekday in the picture is the one check the picture itself offers.
    // With no year in it, a mismatch most likely means the wrong year was
    // assumed, so the neighbouring years are tried before giving up.
    if (b.weekday != null && valid(year, month, b.date.day)) {
      if (weekdayOf(year, month, b.date.day) !== b.weekday) {
        const fixed =
          b.date.year == null
            ? [year - 1, year + 1].find((y) => weekdayOf(y, month, b.date.day) === b.weekday)
            : undefined;
        if (fixed != null) year = fixed;
        else flags.push("weekday");
      }
    }

    if (!valid(year, month, b.date.day)) {
      unread.push({ date: null, source });
      continue;
    }
    const date = iso(year, month, b.date.day);

    const all = b.lines.join(" ");
    const kind: ReadKind = SICK_RE.test(all) ? "sick" : SEMESTER_RE.test(all) ? "semester" : "work";

    if (kind === "semester") {
      shifts.push({ date, startMin: 0, endMin: 0, breakMin: 0, kind, source, flags });
      continue;
    }

    if (b.times.length < 2) {
      // A day off is not a shift that failed to read.
      if (b.times.length === 0 && OFF_RE.test(all)) continue;
      unread.push({ date, source });
      continue;
    }

    // Pairs of times are shifts; one short time left over is the break.
    const times = [...b.times];
    let breakMin = b.breakMin;
    if (times.length % 2 === 1) {
      const last = times.pop()!;
      if (breakMin == null && last > 0 && last <= 180) breakMin = last;
    }
    for (let i = 0; i + 1 < times.length; i += 2) {
      const startMin = times[i];
      const rawEnd = times[i + 1];
      const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;
      const own = [...flags];
      if (breakMin == null && endMin - startMin > 5 * 60) own.push("noBreak");
      shifts.push({ date, startMin, endMin, breakMin: breakMin ?? 0, kind, source, flags: own });
    }
  }

  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  return { shifts, unread, yearAssumed };
}

function absorb(block: Block, text: string) {
  block.times.push(...findTimes(text));
  const brk = findBreak(text);
  if (brk != null && block.breakMin == null) block.breakMin = brk;
}

function mostCommon(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
