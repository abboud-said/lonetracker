import { newId } from "./rules";
import { toMinutes } from "./time";
import type { Shift } from "./types";

export type ParseErrorCode = "noDate" | "noTimes" | "noShifts" | "badExcel" | "noSheet" | "unknown";

export class ScheduleParseError extends Error {
  code: ParseErrorCode;
  constructor(code: ParseErrorCode) {
    super(code);
    this.code = code;
  }
}

type Row = (string | undefined)[];

/**
 * Read the first worksheet of an .xlsx file into raw rows.
 *
 * The zip is unpacked by hand and inflated with the browser's built-in
 * DecompressionStream, so the app ships no spreadsheet dependency at all.
 */
export async function readXlsxRows(buffer: ArrayBuffer): Promise<Row[]> {
  const buf = new Uint8Array(buffer);
  const ru16 = (o: number) => buf[o] | (buf[o + 1] << 8);
  const ru32 = (o: number) => (buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)) >>> 0;

  // Locate the zip's end-of-central-directory record by scanning backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (ru32(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new ScheduleParseError("badExcel");

  const cdOffset = ru32(eocd + 16);
  const cdCount = ru16(eocd + 10);
  const entries: Record<string, { compMethod: number; compSize: number; localOffset: number }> = {};

  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (ru32(p) !== 0x02014b50) break;
    const compMethod = ru16(p + 10);
    const compSize = ru32(p + 20);
    const nameLen = ru16(p + 28);
    const extraLen = ru16(p + 30);
    const commentLen = ru16(p + 32);
    const localOffset = ru32(p + 42);
    const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nameLen));
    entries[name] = { compMethod, compSize, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }

  async function extract(name: string): Promise<string | null> {
    const e = entries[name];
    if (!e) return null;
    const lp = e.localOffset;
    const nameLen = ru16(lp + 26);
    const extraLen = ru16(lp + 28);
    const dataStart = lp + 30 + nameLen + extraLen;
    const data = buf.slice(dataStart, dataStart + e.compSize);
    if (e.compMethod === 0) return new TextDecoder("utf-8").decode(data);
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new TextDecoder("utf-8").decode(await new Response(stream).arrayBuffer());
  }

  const dp = new DOMParser();

  // Follow workbook.xml -> rels to find the first sheet, rather than assuming sheet1.xml.
  let sheetTarget = "worksheets/sheet1.xml";
  const wbXml = await extract("xl/workbook.xml");
  const relsXml = await extract("xl/_rels/workbook.xml.rels");
  if (wbXml && relsXml) {
    const wbDoc = dp.parseFromString(wbXml, "application/xml");
    const firstSheet = wbDoc.querySelector("sheets sheet");
    const rid = firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttribute("id");
    if (rid) {
      const relsDoc = dp.parseFromString(relsXml, "application/xml");
      const rel = Array.from(relsDoc.getElementsByTagName("Relationship")).find(
        (r) => r.getAttribute("Id") === rid,
      );
      const target = rel?.getAttribute("Target");
      if (target) sheetTarget = target.replace(/^\/?xl\//, "").replace(/^\//, "");
    }
  }

  const sheetXml = (await extract("xl/" + sheetTarget)) ?? (await extract(sheetTarget));
  if (!sheetXml) throw new ScheduleParseError("noSheet");

  const sharedStrings: string[] = [];
  const sharedXml = await extract("xl/sharedStrings.xml");
  if (sharedXml) {
    const sDoc = dp.parseFromString(sharedXml, "application/xml");
    for (const si of Array.from(sDoc.getElementsByTagName("si"))) {
      sharedStrings.push(
        Array.from(si.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join(""),
      );
    }
  }

  const colIndexOf = (letters: string) => {
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };

  const sheetDoc = dp.parseFromString(sheetXml, "application/xml");
  const rows: Row[] = [];
  for (const rowEl of Array.from(sheetDoc.getElementsByTagName("row"))) {
    const arr: Row = [];
    for (const c of Array.from(rowEl.children)) {
      if (c.tagName !== "c") continue;
      const ref = c.getAttribute("r");
      const letters = ref?.match(/^[A-Z]+/)?.[0];
      if (!letters) continue;
      const type = c.getAttribute("t") ?? "n";
      const vEl = Array.from(c.children).find((ch) => ch.tagName === "v");
      let val = "";
      if (vEl) {
        const rawText = vEl.textContent ?? "";
        val = type === "s" ? (sharedStrings[Number(rawText)] ?? "") : rawText;
      }
      arr[colIndexOf(letters)] = val;
    }
    rows.push(arr);
  }
  return rows;
}

/** Split CSV text into rows, auto-detecting a comma or semicolon delimiter. */
export function parseCsvText(text: string): Row[] {
  const firstLine = text.split("\n")[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : ",";
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);

  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  });
}

// Header names accepted for each column, in Swedish and English. Matching is
// case-insensitive and trimmed.
const DATE_HEADERS = ["datum", "date", "dag", "day"];
const START_HEADERS = ["start", "från", "fran", "from", "in", "början", "borjan", "start time"];
const END_HEADERS = ["slut", "end", "till", "to", "out", "end time"];
const BREAK_HEADERS = ["rast", "break", "paus", "lunch", "obetald rast"];

const norm = (c: unknown) => String(c ?? "").trim().toLowerCase();

/**
 * Turn raw spreadsheet rows into shifts.
 *
 * Some exports carry two blocks of times side by side — the planned schedule
 * ("Aktivt schema") and what was actually clocked ("Närvaro"). Pay follows the
 * hours actually worked, so for any day that has been clocked the later block
 * wins; days still in the future have no Närvaro yet and fall back to the plan.
 *
 * Verified against two months of real Bestseller exports and the payslip they
 * produced: this lands within about a krona on the month, where reading the
 * plan alone was 700 kr out.
 *
 * One case it cannot see: hours worked beyond the schedule and approved
 * afterwards as mertid. Those are paid but look identical to clocking out
 * late, so they are left out rather than guessed at.
 */
export function rowsToShifts(rows: Row[]): Shift[] {
  let headerIdx = -1;
  let dateCol = -1;
  for (let i = 0; i < rows.length; i++) {
    const dc = rows[i].findIndex((c) => DATE_HEADERS.includes(norm(c)));
    if (dc > -1) {
      headerIdx = i;
      dateCol = dc;
      break;
    }
  }
  if (headerIdx === -1) throw new ScheduleParseError("noDate");

  const headerRow = rows[headerIdx];
  const indexesOf = (names: string[]) =>
    headerRow.reduce<number[]>((acc, c, idx) => {
      if (names.includes(norm(c))) acc.push(idx);
      return acc;
    }, []);

  const startIdxs = indexesOf(START_HEADERS);
  const endIdxs = indexesOf(END_HEADERS);

  const blocks = startIdxs
    .map((start) => {
      const end = endIdxs.filter((x) => x > start).sort((a, b) => a - b)[0];
      const nextStart = startIdxs.filter((x) => x > start).sort((a, b) => a - b)[0];
      const breakCol = headerRow.reduce<number[]>((acc, c, idx) => {
        const inBlock = idx > start && (nextStart == null || idx < nextStart);
        if (inBlock && BREAK_HEADERS.some((b) => norm(c).includes(b))) acc.push(idx);
        return acc;
      }, [])[0];
      return { start, end, breakCol };
    })
    .filter((b) => b.end != null)
    .sort((a, b) => a.start - b.start);

  if (blocks.length === 0) throw new ScheduleParseError("noTimes");

  const shifts: Shift[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = row[dateCol];
    if (!dateRaw) continue;
    const m = String(dateRaw).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;

    // Read every block that holds a time for this day, then narrow to the
    // overlap of all of them: pay starts at the later of scheduled and clocked
    // start, and stops at the earlier of the two ends. Clocking in a few
    // minutes early or lingering after close is not paid time.
    let startMin: number | null = null;
    let rawEnd: number | null = null;
    let breakMin = 0;
    for (const block of blocks) {
      const s = toMinutes(row[block.start]);
      const e = toMinutes(row[block.end!]);
      if (s == null || e == null || s === e) continue;
      startMin = startMin == null ? s : Math.max(startMin, s);
      rawEnd = rawEnd == null ? e : Math.min(rawEnd, e);
      const b = block.breakCol != null ? (toMinutes(row[block.breakCol]) ?? 0) : 0;
      breakMin = Math.max(breakMin, b);
    }
    if (startMin == null || rawEnd == null || startMin >= rawEnd) continue;

    // An end time at or before the start means the shift ran past midnight.
    const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;

    shifts.push({ id: newId(), date: m[0], startMin, endMin, breakMin });
  }

  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
  if (shifts.length === 0) throw new ScheduleParseError("noShifts");
  return shifts;
}

/** Read an uploaded schedule file (.csv or .xlsx) into shifts. */
export async function parseScheduleFile(file: File): Promise<Shift[]> {
  const isCsv = /\.csv$/i.test(file.name);
  if (isCsv) {
    return rowsToShifts(parseCsvText(await file.text()));
  }
  return rowsToShifts(await readXlsxRows(await file.arrayBuffer()));
}
