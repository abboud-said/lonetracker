"use client";

import { useState, type ReactNode } from "react";
import { BASE_KEY, type ShiftResult } from "@/lib/calc";
import { t, type MessageKey } from "@/lib/i18n";
import { isWholeDay, type LeaveDays } from "@/lib/parse";
import { dateLabel, hhmm, hours, money } from "@/lib/time";
import type { Language, RuleSet, Shift } from "@/lib/types";
import { Section } from "./ui";

type LeaveKind = keyof LeaveDays;

const LEAVE_LABEL: Record<LeaveKind, MessageKey> = {
  sick: "kindSick",
  semester: "kindSemester",
  other: "kindOther",
};

/**
 * Work and leave in one list, in date order, because that is how a schedule
 * reads. Leave carries no amount per row: sjuklön is worked out over a whole
 * sick period and semesterlön per day, so a figure beside one day would be a
 * number nobody can check against anything.
 */
type Row =
  | { type: "work"; result: ShiftResult }
  | { type: "leave"; kind: LeaveKind; day: Shift };

export function ShiftList({
  results,
  leave,
  ruleSet,
  lang,
  onRemove,
  onRemoveLeave,
  onMarkLeave,
  onMarkWork,
}: {
  results: ShiftResult[];
  leave: LeaveDays;
  ruleSet: RuleSet;
  lang: Language;
  onRemove: (id: string) => void;
  onRemoveLeave: (kind: LeaveKind, id: string) => void;
  onMarkLeave: (id: string, kind: "sick" | "semester") => void;
  onMarkWork: (kind: LeaveKind, id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows: Row[] = [
    ...results.map((result) => ({ type: "work" as const, result })),
    ...(Object.keys(leave) as LeaveKind[]).flatMap((kind) =>
      leave[kind].map((day) => ({ type: "leave" as const, kind, day })),
    ),
  ].sort((a, b) => {
    const da = a.type === "work" ? a.result.shift : a.day;
    const db = b.type === "work" ? b.result.shift : b.day;
    return da.date.localeCompare(db.date) || da.startMin - db.startMin;
  });

  if (rows.length === 0) return null;

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  // A day keeps its id when it changes kind, so it would otherwise reopen
  // already expanded — and the next tap on it would close it instead.
  const collapse = (id: string) => setExpanded((prev) => ({ ...prev, [id]: false }));

  return (
    <Section title={t("shifts", lang)}>
      <ul className="flex flex-col">
        {rows.map((row) =>
          row.type === "work" ? (
            <WorkRow
              key={row.result.shift.id}
              r={row.result}
              ruleSet={ruleSet}
              lang={lang}
              open={!!expanded[row.result.shift.id]}
              onToggle={() => toggle(row.result.shift.id)}
              onRemove={() => onRemove(row.result.shift.id)}
              onMarkLeave={(kind) => {
                collapse(row.result.shift.id);
                onMarkLeave(row.result.shift.id, kind);
              }}
            />
          ) : (
            <LeaveRow
              key={row.day.id}
              kind={row.kind}
              day={row.day}
              lang={lang}
              open={!!expanded[row.day.id]}
              onToggle={() => toggle(row.day.id)}
              onRemove={() => onRemoveLeave(row.kind, row.day.id)}
              onMarkWork={() => {
                collapse(row.day.id);
                onMarkWork(row.kind, row.day.id);
              }}
            />
          ),
        )}
      </ul>
    </Section>
  );
}

function WorkRow({
  r,
  ruleSet,
  lang,
  open,
  onToggle,
  onRemove,
  onMarkLeave,
}: {
  r: ShiftResult;
  ruleSet: RuleSet;
  lang: Language;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMarkLeave: (kind: "sick" | "semester") => void;
}) {
  const baseMinutes = r.perTier[BASE_KEY] ?? 0;

  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-11 flex items-baseline gap-3 py-3 text-left cursor-pointer"
      >
        <span className="text-sm font-medium w-28 shrink-0">{dateLabel(r.shift.date, lang)}</span>
        <span className="text-sm text-muted tabular">
          {hhmm(r.shift.startMin)}–{hhmm(r.shift.endMin)}
        </span>
        {r.missingBreak ? (
          <span
            title={t("missingBreakHint", lang)}
            className="text-[0.7rem] font-medium text-danger border border-danger/40 rounded px-1.5 py-0.5"
          >
            {t("missingBreak", lang)}
          </span>
        ) : null}
        <span className="ml-auto text-sm font-medium tabular">{money(r.gross, lang)}</span>
      </button>

      {open ? (
        <div className="pb-3 pl-1 flex flex-col gap-1 text-sm text-muted">
          {/* Marking a scheduled shift as sick is the quickest honest route:
              the hours sjuklön is paid on are already right there. */}
          <div className="flex flex-wrap gap-x-5">
            <RowAction danger onClick={onRemove}>
              {t("removeShift", lang)}
            </RowAction>
            <RowAction onClick={() => onMarkLeave("sick")}>{t("markSick", lang)}</RowAction>
            <RowAction onClick={() => onMarkLeave("semester")}>{t("markSemester", lang)}</RowAction>
          </div>
          {baseMinutes > 0.4 ? <Line label={t("basePay", lang)} value={hours(baseMinutes, lang)} /> : null}
          {ruleSet.tiers.map((tier) => {
            const minutes = r.perTier[tier.id] ?? 0;
            if (minutes <= 0.4) return null;
            return <Line key={tier.id} label={tier.label} value={hours(minutes, lang)} />;
          })}
          {r.breakMinutes > 0 ? (
            <Line label={t("breakLabel", lang)} value={hours(r.breakMinutes, lang)} />
          ) : null}
          {r.missingBreak ? (
            <p className="text-xs text-danger mt-1">{t("missingBreakHint", lang)}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function LeaveRow({
  kind,
  day,
  lang,
  open,
  onToggle,
  onRemove,
  onMarkWork,
}: {
  kind: LeaveKind;
  day: Shift;
  lang: Language;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMarkWork: () => void;
}) {
  const whole = isWholeDay(day);

  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-11 flex items-baseline gap-3 py-3 text-left cursor-pointer"
      >
        <span className="text-sm font-medium w-28 shrink-0">{dateLabel(day.date, lang)}</span>
        <span className="text-sm text-muted tabular">
          {whole ? t("wholeDay", lang) : `${hhmm(day.startMin)}–${hhmm(day.endMin)}`}
        </span>
        <span className="ml-auto text-[0.7rem] font-medium text-accent border border-accent/40 rounded px-1.5 py-0.5">
          {t(LEAVE_LABEL[kind], lang)}
        </span>
      </button>

      {open ? (
        <div className="pb-3 pl-1 flex flex-wrap gap-x-5">
          <RowAction danger onClick={onRemove}>
            {t("removeDay", lang)}
          </RowAction>
          {/* A semester day typed without times has no shift to turn back into. */}
          {whole ? null : <RowAction onClick={onMarkWork}>{t("markWork", lang)}</RowAction>}
        </div>
      ) : null}
    </li>
  );
}

function RowAction({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`self-start inline-flex items-center min-h-11 text-xs underline underline-offset-4 cursor-pointer ${
        danger ? "text-danger" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
