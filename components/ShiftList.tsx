"use client";

import { useState } from "react";
import { BASE_KEY, type ShiftResult } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { dateLabel, hhmm, hours, money } from "@/lib/time";
import type { Language, RuleSet } from "@/lib/types";
import { Section } from "./ui";

export function ShiftList({
  results,
  ruleSet,
  lang,
  onRemove,
}: {
  results: ShiftResult[];
  ruleSet: RuleSet;
  lang: Language;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (results.length === 0) return null;

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Section title={t("shifts", lang)}>
      <ul className="flex flex-col">
        {results.map((r) => {
          const open = !!expanded[r.shift.id];
          const baseMinutes = r.perTier[BASE_KEY] ?? 0;

          return (
            <li key={r.shift.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => toggle(r.shift.id)}
                aria-expanded={open}
                className="w-full min-h-11 flex items-baseline gap-3 py-3 text-left cursor-pointer"
              >
                <span className="text-sm font-medium w-28 shrink-0">
                  {dateLabel(r.shift.date, lang)}
                </span>
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
                <span className="ml-auto text-sm font-medium tabular">
                  {money(r.gross, lang)}
                </span>
              </button>

              {open ? (
                <div className="pb-3 pl-1 flex flex-col gap-1 text-sm text-muted">
                  <button
                    type="button"
                    onClick={() => onRemove(r.shift.id)}
                    className="self-start inline-flex items-center min-h-11 text-xs text-danger underline underline-offset-4 cursor-pointer"
                  >
                    {t("removeShift", lang)}
                  </button>
                  {baseMinutes > 0.4 ? (
                    <Row label={t("basePay", lang)} value={hours(baseMinutes, lang)} />
                  ) : null}
                  {ruleSet.tiers.map((tier) => {
                    const minutes = r.perTier[tier.id] ?? 0;
                    if (minutes <= 0.4) return null;
                    return <Row key={tier.id} label={tier.label} value={hours(minutes, lang)} />;
                  })}
                  {r.breakMinutes > 0 ? (
                    <Row
                      label={t("breakLabel", lang)}
                      value={hours(r.breakMinutes, lang)}
                    />
                  ) : null}
                  {r.missingBreak ? (
                    <p className="text-xs text-danger mt-1">{t("missingBreakHint", lang)}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
