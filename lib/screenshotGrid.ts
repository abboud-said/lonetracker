/**
 * Read a month-calendar screenshot: seven weekday columns, one row per week,
 * the shift's start and end stacked inside each day cell.
 *
 * Line-based reading is useless here — a row of cells comes back as
 * "29 30 1 2 3 4 5" followed by a jumble of times, and nothing lines up. So
 * this works from where each word sits on the picture instead. The weekday
 * header letters give the seven column centres, the "W. 27 - 22:15" labels
 * give the week rows and, with the year from the heading, each row's Monday
 * exactly. A time then belongs to the cell its centre falls in.
 *
 * The grey day numbers in such apps mostly do not survive OCR, so they are
 * not relied on; the few that do read are checked against the computed dates
 * and any disagreement is reported rather than hidden.
 *
 * The week label's hours ("22:15") are the app's own total for that week
 * after breaks — the one figure in the picture that can be held against the
 * shifts, so it is passed on for the review to show.
 *
 * Returns null when the picture does not look like a grid at all, so the
 * line-based reader can have a go instead.
 */

import { MONTHS, type ReadFlag, type ReadShift, type ScreenshotRead, type WeekTotal } from "./screenshotText";

export type OcrWord = {
  text: string;
  /** 0–100 */
  conf: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type Tok = OcrWord & { cx: number; cy: number; h: number };

const DAY_SV = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"];

function fixDigits(s: string): string {
  return s.replace(/[Oo]/g, "0").replace(/[IlL|]/g, "1");
}

/** "12:00", "12.00", with the usual OCR digit slips. Minutes from midnight, or null. */
function asTime(text: string): number | null {
  const m = text.trim().match(/^([0-9OoIlL|]{1,2})[:.;]([0-9OoIlL|]{2})$/);
  if (!m) return null;
  const h = Number(fixDigits(m[1]));
  const min = Number(fixDigits(m[2]));
  if (!Number.isInteger(h) || !Number.isInteger(min) || h > 24 || min > 59) return null;
  return h * 60 + min;
}

function asDayNumber(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 31 ? n : null;
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

function plusDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** The Monday that opens ISO week `week` of `year`. Week 1 is the one holding 4 January. */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const back = (jan4.getDay() + 6) % 7;
  return plusDays(jan4, -back + (week - 1) * 7);
}

/** Group words into visual lines by vertical overlap, each line left to right. */
function toLines(words: Tok[]): Tok[][] {
  const sorted = [...words].sort((a, b) => a.cy - b.cy);
  const lines: Tok[][] = [];
  for (const w of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].cy - w.cy) <= Math.max(last[0].h, w.h) * 0.6) last.push(w);
    else lines.push([w]);
  }
  for (const l of lines) l.sort((a, b) => a.x0 - b.x0);
  return lines;
}

type WeekLabel = { cy: number; x0: number; week: number; minutes: number | null; text: string };

/** "W. 27 - 22:15", "V. 27", "v27 – 20:00". The hours part is the week's total after breaks. */
function asWeekLabel(line: Tok[]): WeekLabel | null {
  const text = line.map((t) => t.text).join(" ");
  const m = text.match(/^\s*[WVwv]+\.?\s*(\d{1,2})\b(?:\s*[-–—]\s*([0-9OoIlL|]{1,3})[:.]([0-5]\d))?/);
  if (!m) return null;
  const week = Number(m[1]);
  if (week < 1 || week > 53) return null;
  const minutes = m[2] ? Number(fixDigits(m[2])) * 60 + Number(m[3]) : null;
  return { cy: line[0].cy, x0: line[0].x0, week, minutes, text: text.trim() };
}

function asHeading(line: Tok[]): { month: number; year: number | null } | null {
  const text = line.map((t) => t.text).join(" ").toLowerCase();
  const m = text.match(/(^|[^a-zåäö])(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)[a-zåäö]*\.?(?:\s+(\d{4}))?/);
  if (!m) return null;
  return { month: MONTHS[m[2]], year: m[3] ? Number(m[3]) : null };
}

/** A line of single weekday letters — M T W T F S S, or M T O T F L S — gives the column centres. */
function asWeekdayHeader(line: Tok[]): number[] | null {
  const letters = line.filter((t) => /^([MTWOFLS])\1?$/i.test(t.text.trim()));
  if (letters.length !== 7) return null;
  const xs = letters.map((t) => t.cx);
  // Evenly spaced, or it is not the header.
  const pitch = (xs[6] - xs[0]) / 6;
  if (pitch <= 0) return null;
  for (let i = 1; i < 7; i++) if (Math.abs(xs[i] - xs[i - 1] - pitch) > pitch * 0.35) return null;
  return xs;
}

export function readScheduleGrid(
  words: OcrWord[],
  image: { width: number; height: number },
  today: string,
): ScreenshotRead | null {
  const toks: Tok[] = words
    .filter((w) => w.text.trim() !== "")
    .map((w) => ({ ...w, cx: (w.x0 + w.x1) / 2, cy: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 }));
  const lines = toLines(toks);

  let heading: { month: number; year: number | null } | null = null;
  let columns: number[] | null = null;
  const labels: WeekLabel[] = [];
  for (const line of lines) {
    const label = asWeekLabel(line);
    if (label) {
      labels.push(label);
      continue;
    }
    if (!columns) columns = asWeekdayHeader(line);
    if (!heading) heading = asHeading(line);
  }
  labels.sort((a, b) => a.cy - b.cy);

  const times = toks
    .map((t) => ({ t, min: asTime(t.text) }))
    .filter((x): x is { t: Tok; min: number } => x.min != null);
  if (times.length < 2) return null;

  // Only a picture with the marks of a calendar grid is read as one: the
  // week labels down the side, or the row of weekday letters across the top.
  // A list of days has neither, and its "09:00 – 17:00" on one line would
  // otherwise be split across two invented columns.
  const headerRead = columns != null;
  if (labels.length < 2 && !headerRead) return null;

  // Columns: the header letters when read, else seven equal parts of the
  // grid's width, taken as the picture minus the margin the week labels sit at.
  if (!columns) {
    const left = Math.max(0, (labels.length ? Math.min(...labels.map((l) => l.x0)) : Math.min(...toks.map((t) => t.x0))) - 10);
    const right = image.width - left;
    const pitch = (right - left) / 7;
    if (pitch <= 0) return null;
    columns = Array.from({ length: 7 }, (_, i) => left + pitch * (i + 0.5));
  }
  const pitch = (columns[6] - columns[0]) / 6;
  const colOf = (cx: number): number | null => {
    let best = 0;
    for (let i = 1; i < 7; i++) if (Math.abs(columns![i] - cx) < Math.abs(columns![best] - cx)) best = i;
    return Math.abs(columns[best] - cx) <= pitch * 0.5 ? best : null;
  };

  // Not a grid unless the times spread across columns and stack inside
  // cells — a start above an end — rather than sit side by side on a line.
  const colsUsed = new Set(times.map((x) => colOf(x.t.cx)).filter((c) => c != null));
  if (colsUsed.size < 2) return null;
  const stacked = times.filter((a) =>
    times.some(
      (b) =>
        b !== a &&
        colOf(b.t.cx) === colOf(a.t.cx) &&
        Math.abs(b.t.cy - a.t.cy) > a.t.h &&
        Math.abs(b.t.cy - a.t.cy) < a.t.h * 3.5,
    ),
  );
  if (stacked.length < times.length * 0.6) return null;

  // Row bands and each one's Monday.
  const todayYear = Number(today.slice(0, 4));
  let yearAssumed = false;
  type Band = { top: number; bottom: number; monday: Date; label: WeekLabel | null };
  const bands: Band[] = [];

  if (labels.length > 0) {
    let year = heading?.year ?? null;
    if (year == null) {
      year = todayYear;
      yearAssumed = true;
    }
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      let y = year;
      // A December heading over week 1, or a January one over week 52: the
      // row belongs to the neighbouring year.
      if (heading?.month === 12 && l.week <= 2) y = year + 1;
      if (heading?.month === 1 && l.week >= 52) y = year - 1;
      bands.push({
        top: l.cy,
        bottom: i + 1 < labels.length ? labels[i + 1].cy : Infinity,
        monday: isoWeekMonday(y, l.week),
        label: l,
      });
    }
  } else {
    // No week labels: rows are found from the gaps between the times, and
    // the first row's Monday from the heading, on a Monday-first calendar.
    if (!heading) return null;
    let year = heading.year;
    if (year == null) {
      year = todayYear;
      yearAssumed = true;
    }
    const first = new Date(year, heading.month - 1, 1);
    const monday0 = plusDays(first, -((first.getDay() + 6) % 7));
    const ys = times.map((x) => x.t.cy).sort((a, b) => a - b);
    const h = times[0].t.h;
    const starts: number[] = [ys[0]];
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > h * 3) starts.push(ys[i]);
    if (starts.length < 2) return null;
    for (let i = 0; i < starts.length; i++) {
      bands.push({
        top: starts[i] - h * 2,
        bottom: i + 1 < starts.length ? starts[i + 1] - h * 2 : Infinity,
        monday: plusDays(monday0, 7 * i),
        label: null,
      });
    }
  }
  const bandOf = (cy: number) => bands.findIndex((b) => cy >= b.top && cy < b.bottom);

  // The day numbers that did read, held against the computed dates.
  let matched = 0;
  let mismatched = 0;
  for (const t of toks) {
    const n = asDayNumber(t.text);
    if (n == null) continue;
    const b = bandOf(t.cy);
    const c = colOf(t.cx);
    if (b < 0 || c == null) continue;
    // Week-label numbers ("27") sit on the label line, not in a cell.
    if (bands[b].label && Math.abs(t.cy - bands[b].label!.cy) < t.h) continue;
    if (plusDays(bands[b].monday, c).getDate() === n) matched++;
    else mismatched++;
  }

  // Times into cells, then pairs into shifts.
  const cells = new Map<string, { band: number; col: number; times: { min: number; cy: number; text: string }[] }>();
  for (const { t, min } of times) {
    const b = bandOf(t.cy);
    const c = colOf(t.cx);
    if (b < 0 || c == null) continue;
    if (bands[b].label && Math.abs(t.cy - bands[b].label!.cy) < t.h) continue;
    const key = `${b}:${c}`;
    const cell = cells.get(key) ?? { band: b, col: c, times: [] };
    cell.times.push({ min, cy: t.cy, text: t.text });
    cells.set(key, cell);
  }

  const shifts: ReadShift[] = [];
  const unread: ScreenshotRead["unread"] = [];
  for (const cell of cells.values()) {
    const band = bands[cell.band];
    const date = iso(plusDays(band.monday, cell.col));
    const where = `${band.label ? "v." + band.label.week : ""} ${DAY_SV[cell.col]}`.trim();
    const ts = [...cell.times].sort((a, b) => a.cy - b.cy);
    const flags: ReadFlag[] = yearAssumed ? ["year"] : [];

    for (let i = 0; i + 1 < ts.length; i += 2) {
      const startMin = ts[i].min;
      const rawEnd = ts[i + 1].min;
      const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;
      const own = [...flags];
      // A month grid never shows the break, so a long shift is always asked about.
      if (endMin - startMin > 5 * 60) own.push("noBreak");
      shifts.push({
        date, startMin, endMin, breakMin: 0, kind: "work",
        source: `${where} · ${ts[i].text}–${ts[i + 1].text}`,
        flags: own,
      });
    }
    if (ts.length % 2 === 1) {
      unread.push({ date, source: `${where} · ${ts[ts.length - 1].text}` });
    }
  }

  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);

  const weeks: WeekTotal[] = bands
    .filter((b) => b.label)
    .map((b) => ({ monday: iso(b.monday), week: b.label!.week, pictureMinutes: b.label!.minutes }));

  return { shifts, unread, yearAssumed, weeks, gridCheck: { matched, mismatched } };
}
