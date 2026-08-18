"use client";

import type { Totals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { hours, money } from "@/lib/time";
import type { Language, RuleSet, Settings } from "@/lib/types";
import { Section, Stat } from "./ui";

export function Summary({
  totals,
  ruleSet,
  settings,
  lang,
  hasShifts,
}: {
  totals: Totals;
  ruleSet: RuleSet;
  settings: Settings;
  lang: Language;
  hasShifts: boolean;
}) {
  if (!hasShifts) {
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

      <div className="mt-4 flex flex-col">
        <Stat label={t("gross", lang)} value={money(totals.gross, lang)} />
        <Stat
          label={`${t("tax", lang)} · ${settings.taxRate} %`}
          value={`− ${money(totals.tax, lang)}`}
          muted
        />
        <Stat label={t("net", lang)} value={money(totals.net, lang)} strong />
      </div>
    </Section>
  );
}
