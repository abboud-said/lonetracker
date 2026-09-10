"use client";

import { useRef, useState } from "react";
import { parseErrorKey, t, type MessageKey } from "@/lib/i18n";
import {
  hasAnyDate,
  parseFreeText,
  previewColumns,
  readScheduleRows,
  rowsToShifts,
  rowsToShiftsWithMapping,
  ScheduleParseError,
  type ColumnMapping,
  type ColumnPreview,
  type DayKind,
  type LeaveDays,
  type ParsedSchedule,
  type ParsedText,
} from "@/lib/parse";
import { fromHhmm, parseDuration, weekdayLabel, weekdayOf } from "@/lib/time";
import type { Language, Shift } from "@/lib/types";
import { newId } from "@/lib/rules";
import { Button, LinkButton, Section, TextInput } from "./ui";

type Mode = "none" | "manual" | "paste";

/** What adding a day pushed out, so the person is told rather than surprised. */
export type Replaced = "work" | "leave" | null;

/**
 * The three ways a schedule gets in: a file, typed by hand, or pasted as text.
 *
 * Manual entry is the one that matters most for reach — every employer runs a
 * different scheduling system, and some give no export at all, so there has to
 * be a route that needs nothing but the shifts themselves.
 */
export function ScheduleInput({
  lang,
  shiftCount,
  leave,
  fileName,
  onLoaded,
  onAddDay,
  onClear,
}: {
  lang: Language;
  shiftCount: number;
  leave: LeaveDays;
  fileName: string | null;
  onLoaded: (parsed: ParsedSchedule, sourceName: string) => void;
  onAddDay: (kind: DayKind, day: Shift) => Replaced;
  onClear: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  // Lines a paste could not use. Kept after the paste box closes, because the
  // box closing is exactly when someone looks away from it.
  const [sickWithoutTimes, setSickWithoutTimes] = useState(0);

  const leaveCount = leave.sick.length + leave.semester.length + leave.other.length;
  const loaded = shiftCount + leaveCount > 0;
  const leaveSummary = (
    [
      [leave.sick.length, "sickDay", "sickDays"],
      [leave.semester.length, "semesterDay", "semesterDays"],
      [leave.other.length, "otherLeaveDay", "otherLeaveDays"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${t(n === 1 ? one : many, lang)}`);

  // Rows held back when the headers were not recognised, awaiting a mapping.
  const [pending, setPending] = useState<{
    rows: (string | undefined)[][];
    columns: ColumnPreview[];
    name: string;
  } | null>(null);

  async function handleFile(file: File) {
    setErrorKey(null);
    setPending(null);
    setSickWithoutTimes(0);
    try {
      const rows = await readScheduleRows(file);
      try {
        onLoaded(rowsToShifts(rows), file.name);
        setMode("none");
      } catch (inner) {
        // Unrecognised headers are recoverable — the columns are all there, we
        // just do not know which is which, so ask rather than give up. A file
        // with no dates anywhere in it is a different matter: there is nothing
        // to point the mapper at, so say so instead of asking an unanswerable
        // question.
        const code = inner instanceof ScheduleParseError ? inner.code : "unknown";
        if (code === "noDate" || code === "noTimes") {
          if (hasAnyDate(rows)) {
            setPending({ rows, columns: previewColumns(rows), name: file.name });
          } else {
            setErrorKey("errNotSchedule");
          }
        } else {
          setErrorKey(parseErrorKey(code));
        }
      }
    } catch (err) {
      setErrorKey(parseErrorKey(err instanceof ScheduleParseError ? err.code : "unknown"));
    }
  }

  return (
    <Section
      title={t("schedule", lang)}
      hint={t("uploadHint", lang)}
      actions={
        <>
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            {loaded ? t("replaceFile", lang) : t("chooseFile", lang)}
          </Button>
          {loaded ? (
            <Button
              variant="quiet"
              onClick={() => {
                onClear();
                setErrorKey(null);
                setPending(null);
                setMode("none");
                setSickWithoutTimes(0);
              }}
            >
              {t("clearSchedule", lang)}
            </Button>
          ) : null}
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {errorKey ? (
        <p className="text-sm text-danger mb-3">{t(errorKey, lang)}</p>
      ) : loaded ? (
        <p className="text-sm text-muted mb-3">
          {fileName ? <span className="font-medium text-foreground">{fileName}</span> : null}
          {fileName ? " — " : null}
          {shiftCount} {t(shiftCount === 1 ? "shiftsLoadedOne" : "shiftsLoadedMany", lang)}
          {leaveSummary.map((part) => ` · ${part}`).join("")}
        </p>
      ) : (
        <p className="text-sm text-muted mb-3">{t("noSchedule", lang)}</p>
      )}

      {pending ? (
        <ColumnMapper
          columns={pending.columns}
          lang={lang}
          onCancel={() => setPending(null)}
          onConfirm={(mapping) => {
            try {
              onLoaded(rowsToShiftsWithMapping(pending.rows, mapping), pending.name);
              setPending(null);
            } catch (err) {
              setErrorKey(parseErrorKey(err instanceof ScheduleParseError ? err.code : "unknown"));
            }
          }}
        />
      ) : null}

      {/* Alternatives stay as quiet links — most people will use the file. */}
      <div className="flex flex-wrap gap-5">
        <LinkButton
          onClick={() => setMode(mode === "manual" ? "none" : "manual")}
          expanded={mode === "manual"}
        >
          {t("addManually", lang)}
        </LinkButton>
        <LinkButton
          onClick={() => setMode(mode === "paste" ? "none" : "paste")}
          expanded={mode === "paste"}
        >
          {t("pasteInstead", lang)}
        </LinkButton>
      </div>

      {sickWithoutTimes > 0 ? (
        <p className="text-xs text-danger mt-2 max-w-prose">
          {sickWithoutTimes}{" "}
          {t(sickWithoutTimes === 1 ? "pasteSickWithoutTimesOne" : "pasteSickWithoutTimes", lang)}
        </p>
      ) : null}

      {mode === "manual" ? <ManualEntry lang={lang} onAdd={onAddDay} /> : null}
      {mode === "paste" ? (
        <PasteEntry
          lang={lang}
          onParsed={(parsed) => {
            onLoaded({ shifts: parsed.shifts, leave: parsed.leave }, t("pasted", lang));
            setSickWithoutTimes(parsed.sickWithoutTimes);
            setMode("none");
          }}
        />
      ) : null}
    </Section>
  );
}

function ManualEntry({
  lang,
  onAdd,
}: {
  lang: Language;
  onAdd: (kind: DayKind, day: Shift) => Replaced;
}) {
  const [kind, setKind] = useState<DayKind>("work");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [brk, setBrk] = useState("");
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const [replaced, setReplaced] = useState<Replaced>(null);

  const needsTimes = kind !== "semester";

  const submit = () => {
    setReplaced(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setProblem(needsTimes ? "manualInvalid" : "manualDateInvalid");
      return;
    }

    // Semesterlön is paid per day, so a semester day carries no hours at all
    // rather than made-up ones that something could later mistake for work.
    if (!needsTimes) {
      setReplaced(onAdd(kind, { id: newId(), date, startMin: 0, endMin: 0, breakMin: 0 }));
      setProblem(null);
      return;
    }

    const startMin = fromHhmm(start.trim());
    const rawEnd = fromHhmm(end.trim());
    if (startMin == null || rawEnd == null) {
      setProblem("manualInvalid");
      return;
    }

    // A break that cannot be read is refused rather than dropped. Treating it
    // as zero paid out the whole shift and said nothing about it, which is the
    // one direction a pay figure must never be wrong in.
    const breakMin = brk.trim() === "" ? 0 : parseDuration(brk.trim());
    if (breakMin == null) {
      setProblem("breakInvalid");
      return;
    }

    const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;

    setReplaced(onAdd(kind, { id: newId(), date, startMin, endMin, breakMin }));
    setProblem(null);
    // Keep the date so a run of shifts in one week is quick to enter.
    setStart("");
    setEnd("");
    setBrk("");
  };

  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? weekdayLabel(weekdayOf(date), lang) : null;

  const hint =
    kind === "sick"
      ? t("manualSickHint", lang)
      : kind === "semester"
        ? t("manualSemesterHint", lang)
        : t("manualHint", lang);

  const addLabel =
    kind === "sick"
      ? t("addSickDay", lang)
      : kind === "semester"
        ? t("addSemesterDay", lang)
        : t("addShift", lang);

  return (
    <div className="mt-4 border border-border rounded-lg p-3.5">
      {/* Sick and semester days are paid under their own rules, so they are
          entered as what they are rather than as shifts to be fixed later. */}
      <div
        role="group"
        aria-label={t("dayKind", lang)}
        className="inline-flex border border-border rounded-lg overflow-hidden text-sm font-medium mb-3"
      >
        {(
          [
            ["work", "kindWork"],
            ["sick", "kindSick"],
            ["semester", "kindSemester"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setProblem(null);
              setReplaced(null);
            }}
            className={`inline-flex items-center justify-center min-h-11 px-3.5 cursor-pointer transition-colors ${
              kind === value ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t(label, lang)}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted mb-3 max-w-prose">{hint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-wide text-muted">
            {t("dateLabel", lang)} {weekday ? `· ${weekday}` : ""}
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background border border-border rounded-lg min-h-11 px-2 py-2 text-sm tabular outline-none focus:border-accent"
          />
        </label>
        {needsTimes
          ? (
              [
                [t("from", lang), start, setStart, "17:00"],
                [t("to", lang), end, setEnd, "21:00"],
                [t("breakMinutes", lang), brk, setBrk, "30"],
              ] as const
            ).map(([label, value, set, placeholder]) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-wide text-muted">{label}</span>
                {/* Not inputMode="numeric": iOS raises a keypad with no colon on it,
                    which made these fields impossible to fill in on an iPhone. */}
                <TextInput
                  value={value}
                  onChange={set}
                  placeholder={placeholder}
                  inputMode="text"
                  className="w-[5rem]"
                />
              </label>
            ))
          : null}
        <Button onClick={submit}>{addLabel}</Button>
      </div>
      {problem ? <p className="text-xs text-danger mt-2">{t(problem, lang)}</p> : null}
      {replaced ? (
        <p className="text-xs text-muted mt-2 max-w-prose">
          {t(replaced === "work" ? "replacedWork" : "replacedLeave", lang)}
        </p>
      ) : null}
    </div>
  );
}

function PasteEntry({
  lang,
  onParsed,
}: {
  lang: Language;
  onParsed: (parsed: ParsedText) => void;
}) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);

  return (
    <div className="mt-4 border border-border rounded-lg p-3.5">
      <p className="text-xs text-muted mb-3 max-w-prose">{t("pasteHint", lang)}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"2026-08-03  17:00-21:00  00:30\n2026-08-04  12:00-18:00"}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3 mt-2">
        <Button
          onClick={() => {
            try {
              onParsed(parseFreeText(text));
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          {t("readText", lang)}
        </Button>
        {failed ? <span className="text-xs text-danger">{t("pasteFailed", lang)}</span> : null}
      </div>
    </div>
  );
}

function ColumnMapper({
  columns,
  lang,
  onConfirm,
  onCancel,
}: {
  columns: ColumnPreview[];
  lang: Language;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [brk, setBrk] = useState("");

  const picker = (value: string, set: (v: string) => void, label: string, optional = false) => (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="bg-background border border-border rounded-lg min-h-11 px-2 py-2 text-sm outline-none focus:border-accent max-w-[13rem]"
      >
        <option value="">{optional ? t("noBreakColumn", lang) : "—"}</option>
        {columns.map((c) => (
          <option key={c.index} value={String(c.index)}>
            {c.header.slice(0, 24)}
            {c.samples.length ? ` (${c.samples[0].slice(0, 12)})` : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mb-4 border border-border rounded-lg p-3.5 bg-accent-soft">
      <h3 className="text-sm font-semibold mb-1">{t("mapTitle", lang)}</h3>
      <p className="text-xs text-muted mb-3 max-w-prose">{t("mapHint", lang)}</p>
      <div className="flex flex-wrap items-end gap-3">
        {picker(date, setDate, t("dateLabel", lang))}
        {picker(start, setStart, t("from", lang))}
        {picker(end, setEnd, t("to", lang))}
        {picker(brk, setBrk, t("breakLabel", lang), true)}
        <Button
          variant="primary"
          onClick={() => {
            if (date === "" || start === "" || end === "") return;
            onConfirm({
              date: Number(date),
              start: Number(start),
              end: Number(end),
              break: brk === "" ? undefined : Number(brk),
            });
          }}
        >
          {t("useColumns", lang)}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          {t("cancel", lang)}
        </Button>
      </div>
    </div>
  );
}
