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
}: {
  results: ShiftResult[];
  ruleSet: RuleSet;
  lang: Language;
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
                className="w-full flex items-baseline gap-3 py-2.5 text-left cursor-pointer"
              >
                <span className="text-sm font-medium w-28 shrink-0">
                  {dateLabel(r.shift.date, lang)}
                </span>
                <span className="text-sm text-muted tabular">
                  {hhmm(r.shift.startMin)}–{hhmm(r.shift.endMin)}
                </span>
                <span className="ml-auto text-sm font-medium tabular">
                  {money(r.gross, lang)}
                </span>
              </button>

              {open ? (
                <div className="pb-3 pl-1 flex flex-col gap-1 text-sm text-muted">
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
                      value={`− ${hours(r.breakMinutes, lang)}`}
                    />
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
