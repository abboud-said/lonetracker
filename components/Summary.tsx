"use client";

import type { Totals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { hours, money, monthLabel } from "@/lib/time";
import type { Language, RuleSet, Settings } from "@/lib/types";
import { NumberInput, Section, Stat } from "./ui";

/** Sentinel for "do not narrow to a month at all". */
export const ALL_MONTHS = "all";

/**
 * Only offered once a schedule actually spans more than one month — with a
 * single month there is nothing to choose, and an inert control would be one
 * more thing to read past.
 */
function MonthPicker({
  months,
  month,
  lang,
  onChange,
}: {
  months: string[];
  month: string | null;
  lang: Language;
  onChange: (choice: string) => void;
}) {
  if (months.length < 2) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {t("month", lang)}
      </span>
      <select
        value={month ?? ALL_MONTHS}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded-lg min-h-11 px-2 py-2 text-sm outline-none focus:border-accent"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m, lang)}
          </option>
        ))}
        <option value={ALL_MONTHS}>{t("allMonths", lang)}</option>
      </select>
    </label>
  );
}

export function Summary({
  totals,
  ruleSet,
  settings,
  lang,
  hasShifts,
  months,
  month,
  onMonthChange,
  onSemesterPayChange,
  onWeeklyHoursChange,
}: {
  totals: Totals;
  ruleSet: RuleSet;
  settings: Settings;
  lang: Language;
  hasShifts: boolean;
  months: string[];
  month: string | null;
  onMonthChange: (choice: string) => void;
  onSemesterPayChange: (value: number) => void;
  onWeeklyHoursChange: (value: number) => void;
}) {
  const { semester, sick, other } = totals.leave;
  const hasLeave = semester.length + sick.length + other.length > 0;

  const picker = (
    <MonthPicker months={months} month={month} lang={lang} onChange={onMonthChange} />
  );

  if (!hasShifts && !hasLeave) {
    return (
      <Section
      title={t("summary", lang)}
      hint={months.length > 1 ? t("monthNote", lang) : undefined}
      actions={picker}
    >
        <p className="text-sm text-muted">
          {months.length > 1 ? t("nothingThisMonth", lang) : t("uploadToSee", lang)}
        </p>
      </Section>
    );
  }

  return (
    <Section
      title={t("summary", lang)}
      hint={months.length > 1 ? t("monthNote", lang) : undefined}
      actions={picker}
    >
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

      {/* Each kind of leave is paid under its own rules, so none of them are
          rolled together, and none appear in a month without leave. */}
      {semester.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              {semester.length} {t(semester.length === 1 ? "semesterDay" : "semesterDays", lang)}
            </span>
            <span className="flex items-center gap-2">
              <NumberInput
                value={settings.semesterPayPerDay}
                lang={lang}
                blankWhenZero
                placeholder="0"
                className="w-24 text-right"
                onChange={onSemesterPayChange}
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

      {sick.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              {sick.length} {t(sick.length === 1 ? "sickDay" : "sickDays", lang)}
            </span>
            <span className="flex items-center gap-2">
              <NumberInput
                value={settings.weeklyHours}
                lang={lang}
                blankWhenZero
                placeholder="0"
                className="w-20 text-right"
                onChange={onWeeklyHoursChange}
              />
              <span className="text-sm text-muted">{t("hoursPerWeek", lang)}</span>
            </span>
          </div>
          <p className="text-xs text-muted mt-1.5">{t("sickHint", lang)}</p>

          {settings.weeklyHours > 0 ? (
            <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted">{t("karens", lang)}</span>
                <span className="tabular text-sm text-muted">
                  {hours(totals.sick.karensMinutes, lang)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm">{t("sickPay", lang)}</span>
                <span className="tabular text-sm font-medium">
                  {money(totals.sick.amount, lang)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-danger mt-2">{t("needWeeklyHours", lang)}</p>
          )}

          {totals.sick.daysBeyondPeriod > 0 ? (
            <p className="text-xs text-danger mt-2">
              {totals.sick.daysBeyondPeriod} {t("beyondSickPeriod", lang)}
            </p>
          ) : null}
        </div>
      ) : null}

      {other.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm">
              {other.length} {t(other.length === 1 ? "otherLeaveDay" : "otherLeaveDays", lang)}
            </span>
            <span className="text-sm text-muted">{t("notIncluded", lang)}</span>
          </div>
          <p className="text-xs text-muted mt-1.5">{t("otherLeaveHint", lang)}</p>
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
