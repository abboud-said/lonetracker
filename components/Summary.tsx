"use client";

import type { Totals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { hours, money } from "@/lib/time";
import type { Language, RuleSet, Settings } from "@/lib/types";
import { parseNumber } from "@/lib/time";
import { Section, Stat, TextInput } from "./ui";

export function Summary({
  totals,
  ruleSet,
  settings,
  lang,
  hasShifts,
  onSemesterPayChange,
}: {
  totals: Totals;
  ruleSet: RuleSet;
  settings: Settings;
  lang: Language;
  hasShifts: boolean;
  onSemesterPayChange: (value: number) => void;
}) {
  if (!hasShifts && totals.absenceDays === 0) {
    return (
      <Section title={t("summary", lang)}>
        <p className="text-sm text-muted">{t("uploadToSee", lang)}</p>
      </Section>
    );
  }

  return (
    <Section title={t("summary", lang)}>
      <div className="flex flex-col">
        <Stat label={t("shiftsCount", lang)} value={String(totals.shifts)} muted />
        <Stat label={t("totalHours", lang)} value={hours(totals.paidMinutes, lang)} muted />
      </div>

      <div className="mt-4 flex flex-col">
        <Stat
          label={`${t("basePay", lang)} · ${settings.baseRate.toFixed(2)} ${t("perHour", lang)}`}
          value={money(totals.baseAmount, lang)}
        />

        {ruleSet.tiers.map((tier) => {
          const minutes = totals.perTier[tier.id] ?? 0;
          if (minutes <= 0.4) return null;
          const rate = settings.baseRate * (tier.percent / 100);
          return (
            <Stat
              key={tier.id}
              label={`${tier.label} · ${rate.toFixed(2)} ${t("perHour", lang)} · ${hours(minutes, lang)}`}
              value={money(totals.tierAmounts[tier.id] ?? 0, lang)}
            />
          );
        })}
      </div>

      {/* Only surfaced in months that actually contain leave. */}
      {totals.absenceDays > 0 ? (
        <div className="mt-4 rounded-lg border border-border px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              {totals.absenceDays} {t("semesterDays", lang)}
            </span>
            <span className="flex items-center gap-2">
              <TextInput
                value={settings.semesterPayPerDay ? String(settings.semesterPayPerDay) : ""}
                inputMode="decimal"
                placeholder="0"
                className="w-24 text-right"
                onChange={(v) => onSemesterPayChange(parseNumber(v))}
              />
              <span className="text-sm text-muted">{t("perDay", lang)}</span>
            </span>
          </div>
          <p className="text-xs text-muted mt-1.5">{t("semesterHint", lang)}</p>
          {totals.semesterPay > 0 ? (
            <div className="flex items-baseline justify-between gap-4 mt-2 pt-2 border-t border-border">
              <span className="text-sm">{t("semesterPay", lang)}</span>
              <span className="tabular text-sm font-medium">{money(totals.semesterPay, lang)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col">
        <Stat label={t("gross", lang)} value={money(totals.gross, lang)} />
        <Stat
          label={`${t("tax", lang)} · ${settings.taxRate} %`}
          value={`− ${money(totals.tax, lang)}`}
          muted
        />
      </div>

      {/* Net is the figure people actually came for, so it gets its own block
          rather than being one more row in the list. */}
      <div className="mt-4 rounded-lg bg-accent-soft px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold">{t("net", lang)}</span>
          <span className="tabular text-2xl font-semibold">{money(totals.net, lang)}</span>
        </div>
        <p className="text-xs text-muted mt-0.5">{t("netPayout", lang)}</p>
      </div>

      <p className="text-xs text-muted mt-3 max-w-prose">{t("taxEstimate", lang)}</p>
    </Section>
  );
}
