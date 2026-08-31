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
  type ParsedSchedule,
} from "@/lib/parse";
import { fromHhmm, parseDuration, weekdayLabel, weekdayOf } from "@/lib/time";
import type { Language, Shift } from "@/lib/types";
import { newId } from "@/lib/rules";
import { Button, LinkButton, Section, TextInput } from "./ui";

type Mode = "none" | "manual" | "paste";

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
  fileName,
  onLoaded,
  onAddShift,
  onClear,
}: {
  lang: Language;
  shiftCount: number;
  fileName: string | null;
  onLoaded: (parsed: ParsedSchedule, sourceName: string) => void;
  onAddShift: (shift: Shift) => void;
  onClear: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  // Rows held back when the headers were not recognised, awaiting a mapping.
  const [pending, setPending] = useState<{
    rows: (string | undefined)[][];
    columns: ColumnPreview[];
    name: string;
  } | null>(null);

  async function handleFile(file: File) {
    setErrorKey(null);
    setPending(null);
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
            {shiftCount > 0 ? t("replaceFile", lang) : t("chooseFile", lang)}
          </Button>
          {shiftCount > 0 ? (
            <Button
              variant="quiet"
              onClick={() => {
                onClear();
                setErrorKey(null);
                setPending(null);
                setMode("none");
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
      ) : shiftCount > 0 ? (
        <p className="text-sm text-muted mb-3">
          {fileName ? <span className="font-medium text-foreground">{fileName}</span> : null}
          {fileName ? " — " : null}
          {shiftCount} {t(shiftCount === 1 ? "shiftsLoadedOne" : "shiftsLoadedMany", lang)}
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

      {mode === "manual" ? <ManualEntry lang={lang} onAdd={onAddShift} /> : null}
      {mode === "paste" ? (
        <PasteEntry
          lang={lang}
          onParsed={(shifts) => {
            onLoaded({ shifts, leave: { semester: [], sick: [], other: [] } }, t("pasted", lang));
            setMode("none");
          }}
        />
      ) : null}
    </Section>
  );
}

function ManualEntry({ lang, onAdd }: { lang: Language; onAdd: (shift: Shift) => void }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [brk, setBrk] = useState("");
  const [problem, setProblem] = useState<MessageKey | null>(null);

  const submit = () => {
    const startMin = fromHhmm(start.trim());
    const rawEnd = fromHhmm(end.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || startMin == null || rawEnd == null) {
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

    onAdd({ id: newId(), date, startMin, endMin, breakMin });
    setProblem(null);
    // Keep the date so a run of shifts in one week is quick to enter.
    setStart("");
    setEnd("");
    setBrk("");
  };

  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? weekdayLabel(weekdayOf(date), lang) : null;

  return (
    <div className="mt-4 border border-border rounded-lg p-3.5">
      <p className="text-xs text-muted mb-3 max-w-prose">{t("manualHint", lang)}</p>
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
        {(
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
        ))}
        <Button onClick={submit}>{t("addShift", lang)}</Button>
      </div>
      {problem ? <p className="text-xs text-danger mt-2">{t(problem, lang)}</p> : null}
    </div>
  );
}

function PasteEntry({
  lang,
  onParsed,
}: {
  lang: Language;
  onParsed: (shifts: Shift[]) => void;
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
