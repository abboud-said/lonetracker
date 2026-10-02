"use client";

import type { Totals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { ALL_MONTHS, hours, money, monthLabel } from "@/lib/time";
import type { Language, RuleSet, Settings } from "@/lib/types";
import { SemesterEstimate } from "./SemesterEstimate";
import { NumberInput, Section, Stat } from "./ui";

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
  taxKnown,
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
  taxKnown: boolean;
  months: string[];
  month: string | null;
  onMonthChange: (choice: string) => void;
  onSemesterPayChange: (value: number, estimated: boolean) => void;
  onWeeklyHoursChange: (value: number) => void;
}) {
  const { semester, sick, other } = totals.leave;
  const hasLeave = semester.length + sick.length + other.length > 0;
  const hasTax = taxKnown;
  // The rate is read back out of the figures rather than stored, so it is right
  // whichever way the tax was arrived at — and with a skattetabell it is an
  // output that moves with the month.
  const effectiveRate = totals.gross > 0 ? (totals.tax / totals.gross) * 100 : 0;

  // Whatever the headline leaves out for want of an input is named beside it.
  // A total that is silently incomplete is worse than one that is wrong.
  const excluded: string[] = [];
  if (sick.length > 0 && !totals.sickIncluded) excluded.push(t("excludesSick", lang));
  if (semester.length > 0 && totals.semesterPay <= 0) excluded.push(t("excludesSemester", lang));
  const incomplete = excluded.length > 0;
  const exclusions = incomplete ? (
    <div className="mb-2.5 text-sm text-danger max-w-prose">
      <span className="font-medium">{t("grossExcludes", lang)}</span>
      <ul className="list-disc pl-5">
        {excluded.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  ) : null;
  // An incomplete month must not look like an answer. June 2026 with four
  // semester days and no kr/dag showed "Nettolön 18 157 kr — Detta betalas ut
  // till dig", 4 940 kr under the payslip, with the note in small print after
  // it; the author read it as a miscalculation. So the headline loses its
  // weight and its claim, is tagged, and what is missing is said first.
  const incompleteTag = incomplete ? ` · ${t("incompleteTag", lang)}` : "";
  const headlineBox = incomplete
    ? "mt-4 rounded-lg border border-danger bg-surface px-4 py-3.5"
    : "mt-4 rounded-lg bg-accent-soft px-4 py-3.5";
  const headlineFigure = incomplete
    ? "tabular text-lg font-medium text-muted"
    : "tabular text-2xl font-semibold";

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

        {totals.semesterersattning > 0 ? (
          <Stat
            label={`${t("semesterersattningRow", lang)} · ${t("estimateTag", lang)}`}
            value={money(totals.semesterersattning, lang)}
          />
        ) : null}
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
                onChange={(v) => onSemesterPayChange(v, false)}
              />
              <span className="text-sm text-muted">{t("perDay", lang)}</span>
            </span>
          </div>
          <p className={`text-xs mt-1.5 ${totals.semesterPay > 0 ? "text-muted" : "text-danger"}`}>
            {t("semesterHint", lang)}
          </p>
          <SemesterEstimate
            lang={lang}
            date={semester[semester.length - 1].date}
            onUse={(perDay) => onSemesterPayChange(perDay, true)}
          />
          {totals.semesterPay > 0 ? (
            <div className="flex items-baseline justify-between gap-4 mt-2 pt-2 border-t border-border">
              <span className="text-sm">
                {t("semesterPay", lang)}
                {settings.semesterPayEstimated ? ` · ${t("estimateTag", lang)}` : ""}
              </span>
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

          {totals.sickIncluded ? (
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
              {totals.sick.obAmount > 0 ? (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted">{t("sickObAmount", lang)}</span>
                    <span className="tabular text-sm text-muted">
                      {money(totals.sick.obAmount, lang)}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{t("sickObNote", lang)}</p>
                </>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1">
              <p className="text-xs text-danger">{t("needWeeklyHours", lang)}</p>
              {/* Shown, so the person can see roughly what is at stake — but
                  labelled as a ceiling and kept out of the gross. */}
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted">{t("sickPayAtMost", lang)}</span>
                <span className="tabular text-sm text-muted">{money(totals.sick.amount, lang)}</span>
              </div>
              <p className="text-xs text-muted">{t("sickNotInGross", lang)}</p>
              <p className="text-xs text-muted">{t("sickNoAgreedHours", lang)}</p>
            </div>
          )}

          <p className="text-xs text-muted mt-2">{t("sickVerified", lang)}</p>

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

      {/* Without a real tax rate there is no net worth showing. A guessed one
          drove the biggest number on the page and read as an answer — it sent
          someone checking against their own payslip away believing the app was
          3 000 kr wrong, when its gross was right to the krona. So gross takes
          the headline until a rate exists, being the figure the app can stand
          behind on its own. */}
      {hasTax ? (
        <>
          <div className="mt-4 flex flex-col">
            <Stat label={`${t("gross", lang)}${incompleteTag}`} value={money(totals.gross, lang)} />
            <Stat
              label={`${t("tax", lang)} · ${effectiveRate.toFixed(2)} %`}
              value={`− ${money(totals.tax, lang)}`}
              muted
            />
          </div>

          <div className={headlineBox}>
            {/* Inside the box and ahead of the number it qualifies: a month
                with sick days and no weekly hours once read as 449 kr wrong
                against the payslip, with the note sitting below the box
                unread — and after the figure it was missed again. */}
            {exclusions}
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold">{`${t("net", lang)}${incompleteTag}`}</span>
              <span className={headlineFigure}>{money(totals.net, lang)}</span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {t(incomplete ? "incompleteHint" : "netPayout", lang)}
            </p>
          </div>

          {/* The caveat follows how the tax was arrived at. A table figure is
              what the employer withholds; only a flat rate is an estimate. */}
          <p className="text-xs text-muted mt-3 max-w-prose">
            {t(settings.taxMode === "kommun" ? "taxFromTable" : "taxEstimate", lang)}
          </p>
        </>
      ) : (
        <>
          <div className={headlineBox}>
            {exclusions}
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold">{`${t("gross", lang)}${incompleteTag}`}</span>
              <span className={headlineFigure}>{money(totals.gross, lang)}</span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {t(incomplete ? "incompleteHint" : "grossPayout", lang)}
            </p>
          </div>

          <p className="text-xs text-muted mt-3 max-w-prose">{t("netNeedsTax", lang)}</p>
        </>
      )}
    </Section>
  );
}
