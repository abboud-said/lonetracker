"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { NO_LEAVE, type ParsedSchedule } from "@/lib/parse";
import { newId } from "@/lib/rules";
import type { ReadKind, ScreenshotRead } from "@/lib/screenshotText";
import { dateLabel, fromHhmm, hhmm, parseDuration } from "@/lib/time";
import type { Language, Shift } from "@/lib/types";
import { Button, LinkButton, TextInput } from "./ui";

type Row = {
  id: string;
  kind: ReadKind;
  date: string;
  start: string;
  end: string;
  brk: string;
  source: string;
  weekdayFlag: boolean;
  noBreakFlag: boolean;
};

/**
 * What the screenshot was read as, laid out for checking against the picture
 * before it becomes pay. Every row can be corrected or removed; nothing is
 * loaded until the person says so.
 *
 * This is the whole point of the route: the calculation downstream is exact,
 * and OCR is not, so the hand-off between them has to be visible.
 */
export function ScreenshotReview({
  read,
  text,
  imageUrl,
  lang,
  onConfirm,
  onCancel,
}: {
  read: ScreenshotRead;
  text: string;
  imageUrl: string;
  lang: Language;
  onConfirm: (parsed: ParsedSchedule) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    read.shifts.map((s) => ({
      id: newId(),
      kind: s.kind,
      date: s.date,
      start: s.kind === "semester" ? "" : hhmm(s.startMin),
      end: s.kind === "semester" ? "" : hhmm(s.endMin),
      brk: s.kind === "semester" || s.breakMin === 0 ? "" : String(s.breakMin),
      source: s.source,
      weekdayFlag: s.flags.includes("weekday"),
      noBreakFlag: s.flags.includes("noBreak"),
    })),
  );
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [showText, setShowText] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // The picture is shown from an object URL that the caller owns; it is
  // revoked when this panel goes away.
  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const confirm = () => {
    const bad = new Set<string>();
    const parsed: ParsedSchedule = { shifts: [], leave: NO_LEAVE() };

    for (const r of rows) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
        bad.add(r.id);
        continue;
      }
      if (r.kind === "semester") {
        parsed.leave.semester.push({ id: newId(), date: r.date, startMin: 0, endMin: 0, breakMin: 0 });
        continue;
      }
      const startMin = fromHhmm(r.start);
      const rawEnd = fromHhmm(r.end);
      // An unreadable break is refused, not treated as none — the same rule
      // as hand entry, and for the same reason.
      const breakMin = r.brk.trim() === "" ? 0 : parseDuration(r.brk);
      if (startMin == null || rawEnd == null || breakMin == null) {
        bad.add(r.id);
        continue;
      }
      const endMin = rawEnd <= startMin ? rawEnd + 1440 : rawEnd;
      const day: Shift = { id: newId(), date: r.date, startMin, endMin, breakMin };
      if (r.kind === "work") parsed.shifts.push(day);
      else parsed.leave.sick.push(day);
    }

    setInvalid(bad);
    if (bad.size > 0) return;
    onConfirm(parsed);
  };

  const year = rows[0]?.date.slice(0, 4);
  const kindLabel = (k: ReadKind) =>
    t(k === "work" ? "kindWork" : k === "sick" ? "kindSick" : "kindSemester", lang);
  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  return (
    <div className="mb-4 border border-border rounded-lg p-3.5 bg-accent-soft">
      <h3 className="text-sm font-semibold mb-1">{t("reviewTitle", lang)}</h3>
      <p className="text-xs text-muted mb-3 max-w-prose">{t("reviewHint", lang)}</p>

      {read.yearAssumed && year ? (
        <p className="text-xs text-danger mb-3 max-w-prose">
          {t("reviewYearAssumed", lang)} {year} {t("reviewYearAssumedTail", lang)}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-danger mb-3 max-w-prose">{t("reviewNone", lang)}</p>
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const bad = invalid.has(r.id);
          return (
            <li
              key={r.id}
              className={`bg-surface border rounded-lg p-3 ${bad ? "border-danger" : "border-border"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">
                  {validDate(r.date) ? dateLabel(r.date, lang) : "—"}
                  <span className="text-muted font-normal"> · {kindLabel(r.kind)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  className="min-h-11 text-xs text-danger underline underline-offset-4 cursor-pointer"
                >
                  {t("remove", lang)}
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted">{t("dateLabel", lang)}</span>
                  <input
                    type="date"
                    value={r.date}
                    onChange={(e) => update(r.id, { date: e.target.value })}
                    className="bg-background border border-border rounded-lg min-h-11 px-2 py-2 text-sm tabular outline-none focus:border-accent"
                  />
                </label>
                {r.kind !== "semester"
                  ? (
                      [
                        [t("from", lang), r.start, (v: string) => update(r.id, { start: v }), "17:00"],
                        [t("to", lang), r.end, (v: string) => update(r.id, { end: v }), "21:00"],
                        [t("breakMinutes", lang), r.brk, (v: string) => update(r.id, { brk: v }), "30"],
                      ] as const
                    ).map(([label, value, set, placeholder]) => (
                      <label key={label} className="flex flex-col gap-1">
                        <span className="text-[0.65rem] uppercase tracking-wide text-muted">{label}</span>
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
              </div>

              {r.weekdayFlag ? (
                <p className="text-xs text-danger mt-2">{t("flagWeekday", lang)}</p>
              ) : null}
              {r.noBreakFlag && r.brk.trim() === "" ? (
                <p className="text-xs text-danger mt-2 max-w-prose">{t("flagNoBreak", lang)}</p>
              ) : null}
              <p className="text-xs text-muted mt-2 break-words">
                {t("reviewRead", lang)}: {r.source}
              </p>
            </li>
          );
        })}
      </ul>

      {read.unread.length > 0 ? (
        <div className="mt-3 text-xs text-danger max-w-prose">
          <span>
            {read.unread.length}{" "}
            {t(read.unread.length === 1 ? "reviewUnreadOne" : "reviewUnreadMany", lang)}
          </span>
          <ul className="list-disc pl-5 mt-1">
            {read.unread.map((u, i) => (
              <li key={i} className="break-words">
                {u.date ? `${dateLabel(u.date, lang)} — ` : ""}
                {u.source}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invalid.size > 0 ? (
        <p className="text-xs text-danger mt-3 max-w-prose">{t("reviewInvalid", lang)}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mt-4">
        {rows.length > 0 ? (
          <Button variant="primary" onClick={confirm}>
            {t("reviewUse", lang)}
          </Button>
        ) : null}
        <Button variant="quiet" onClick={onCancel}>
          {t("cancel", lang)}
        </Button>
      </div>

      <div className="flex flex-wrap gap-5 mt-2">
        <LinkButton onClick={() => setShowImage((v) => !v)} expanded={showImage}>
          {t(showImage ? "reviewHideImage" : "reviewShowImage", lang)}
        </LinkButton>
        <LinkButton onClick={() => setShowText((v) => !v)} expanded={showText}>
          {t(showText ? "reviewHideText" : "reviewShowText", lang)}
        </LinkButton>
      </div>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an asset to optimise
        <img src={imageUrl} alt="" className="mt-2 max-h-[60vh] w-auto max-w-full rounded-lg border border-border" />
      ) : null}
      {showText ? (
        <pre className="mt-2 text-xs whitespace-pre-wrap break-words bg-surface border border-border rounded-lg p-3 max-h-64 overflow-auto">
          {text.trim() || "—"}
        </pre>
      ) : null}
    </div>
  );
}
