"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { computeShift, computeTotals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { NO_LEAVE } from "@/lib/parse";
import { getServerSnapshot, getSnapshot, setAppState, subscribe } from "@/lib/store";
import type { AppState } from "@/lib/storage";
import { ALL_MONTHS, monthsOf } from "@/lib/time";
import type { Language, RuleSet, Settings } from "@/lib/types";
import { RuleEditor } from "./RuleEditor";
import { ShiftList } from "./ShiftList";
import { Summary } from "./Summary";
import { ScheduleInput } from "./ScheduleInput";
import { Field, LinkButton, NumberInput, Section } from "./ui";

export function Tracker() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { settings, ruleSet, shifts, leave, fileName, language: lang } = state;

  // A payslip covers one month, so that is what the summary has to cover. An
  // export that runs over a month boundary would otherwise total both and match
  // nothing the employer ever sent.
  const months = useMemo(
    () =>
      monthsOf(
        [...shifts, ...leave.semester, ...leave.sick, ...leave.other].map((s) => s.date),
      ),
    [shifts, leave],
  );

  const [monthChoice, setMonthChoice] = useState<string | null>(null);
  const month =
    monthChoice === ALL_MONTHS
      ? null
      : monthChoice != null && months.includes(monthChoice)
        ? monthChoice
        : (months[months.length - 1] ?? null);

  const visibleShifts = useMemo(
    () => (month == null ? shifts : shifts.filter((s) => s.date.startsWith(month))),
    [shifts, month],
  );

  const results = useMemo(
    () => visibleShifts.map((shift) => computeShift(shift, ruleSet, settings)),
    [visibleShifts, ruleSet, settings],
  );
  const totals = useMemo(
    () => computeTotals(results, settings, leave, ruleSet, month),
    [results, settings, leave, ruleSet, month],
  );

  // The document opens as Swedish and the language is a client-side choice, so
  // the attribute has to follow it here. Without this a screen reader keeps
  // reading English text with Swedish pronunciation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const patch = (next: Partial<AppState>) => setAppState((prev) => ({ ...prev, ...next }));

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-10 sm:py-14 flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("appName", lang)}</h1>
          <p className="text-sm text-muted mt-1 max-w-prose">{t("tagline", lang)}</p>
        </div>
        <LanguageToggle lang={lang} onChange={(language) => patch({ language })} />
      </header>

      {/* Shown only until a schedule is loaded, so it never becomes clutter for
          someone who already knows what to do. */}
      {shifts.length === 0 ? (
        <section className="bg-accent-soft border border-border rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight mb-3">{t("howToTitle", lang)}</h2>
          <ol className="flex flex-col gap-2.5">
            {([t("step1", lang), t("step2", lang), t("step3", lang)] as const).map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span
                  aria-hidden
                  className="shrink-0 w-5 h-5 rounded-full bg-accent text-white text-xs font-semibold flex items-center justify-center mt-px"
                >
                  {i + 1}
                </span>
                <span className="max-w-prose">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted mt-4 max-w-prose">{t("stepNote", lang)}</p>
        </section>
      ) : null}

      <ScheduleInput
        lang={lang}
        shiftCount={shifts.length}
        fileName={fileName}
        onLoaded={(parsed, name) =>
          patch({ shifts: parsed.shifts, leave: parsed.leave, fileName: name })
        }
        onAddShift={(shift) =>
          patch({
            shifts: [...shifts, shift].sort(
              (a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin,
            ),
            fileName: fileName ?? t("addedByHandLabel", lang),
          })
        }
        onClear={() => patch({ shifts: [], leave: NO_LEAVE(), fileName: null })}
      />

      <Section title={t("pay", lang)}>
        <div className="flex flex-col gap-5">
          <Field label={t("baseRate", lang)} suffix={t("baseRateUnit", lang)}>
            <NumberInput
              value={settings.baseRate}
              lang={lang}
              className="w-28 text-right"
              onChange={(baseRate) => patch({ settings: { ...settings, baseRate } })}
            />
          </Field>

          <TaxFields
            settings={settings}
            lang={lang}
            onChange={(next) => patch({ settings: { ...settings, ...next } })}
          />
        </div>
      </Section>

      <Summary
        totals={totals}
        ruleSet={ruleSet}
        settings={settings}
        lang={lang}
        hasShifts={visibleShifts.length > 0}
        months={months}
        month={month}
        onMonthChange={setMonthChoice}
        onSemesterPayChange={(v: number) => patch({ settings: { ...settings, semesterPayPerDay: v } })}
        onWeeklyHoursChange={(v: number) => patch({ settings: { ...settings, weeklyHours: v } })}
      />

      <ShiftList
        results={results}
        ruleSet={ruleSet}
        lang={lang}
        onRemove={(id) => patch({ shifts: shifts.filter((s) => s.id !== id) })}
      />

      {/* Everything below is correct out of the box for anyone on
          Detaljhandelsavtalet, so it stays folded away by default. */}
      <div className="flex flex-col gap-5">
        <LinkButton
          onClick={() => setShowAdvanced((v) => !v)}
          expanded={showAdvanced}
          className="self-center"
        >
          {showAdvanced ? t("hideAdvanced", lang) : t("showAdvanced", lang)}
        </LinkButton>

        {showAdvanced ? (
          <>
            <Section title={t("breakLabel", lang)} hint={t("advancedHint", lang)}>
          <label className="flex items-start gap-2.5 mt-5 cursor-pointer max-w-prose">
            <input
              type="checkbox"
              checked={settings.breakIsPaid}
              onChange={(e) =>
                patch({ settings: { ...settings, breakIsPaid: e.target.checked } })
              }
              className="mt-0.5 accent-accent cursor-pointer"
            />
            <span>
              <span className="text-sm font-medium">{t("breakPaid", lang)}</span>
              <span className="block text-xs text-muted mt-0.5">{t("breakPaidHint", lang)}</span>
            </span>
          </label>
            </Section>

            <RuleEditor
              ruleSet={ruleSet}
              lang={lang}
              onChange={(next: RuleSet) => patch({ ruleSet: next })}
            />
          </>
        ) : null}
      </div>

      <p className="text-xs text-muted text-center max-w-prose mx-auto mt-2">
        {t("privacy", lang)}
      </p>
    </main>
  );
}

/**
 * Tax, asked for the only way most people can actually answer it.
 *
 * Preliminärskatt follows a skattetabell and rises with the month's gross, so
 * there is no single percentage anyone knows off-hand — the app used to ask
 * for one anyway, pre-filled with 30 %, and that number then drove the largest
 * figure on the page. Two lines copied off any old lönebesked need no
 * knowledge at all, and give the rate that person is actually on.
 */
function TaxFields({
  settings,
  lang,
  onChange,
}: {
  settings: Settings;
  lang: Language;
  onChange: (next: Partial<Settings>) => void;
}) {
  const fromPayslip = (gross: number, tax: number) => ({
    payslipGross: gross,
    payslipTax: tax,
    taxRate: gross > 0 && tax > 0 ? (tax / gross) * 100 : 0,
  });

  if (settings.taxMode === "percent") {
    return (
      <div className="flex flex-col gap-1.5">
        <Field label={t("taxRate", lang)} suffix={t("taxRateUnit", lang)}>
          <NumberInput
            value={settings.taxRate}
            lang={lang}
            blankWhenZero
            placeholder="0"
            className="w-24 text-right"
            onChange={(taxRate) => onChange({ taxRate })}
          />
        </Field>
        <span className="text-xs text-muted">{t("taxHelp", lang)}</span>
        <LinkButton onClick={() => onChange({ taxMode: "payslip", ...fromPayslip(settings.payslipGross, settings.payslipTax) })}>
          {t("usePayslipInstead", lang)}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t("taxRate", lang)}
        </span>
        <p className="text-xs text-muted mt-1 max-w-prose">{t("taxFromPayslip", lang)}</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("payslipGross", lang)} suffix="kr">
          <NumberInput
            value={settings.payslipGross}
            lang={lang}
            blankWhenZero
            placeholder="26 167,79"
            className="w-32 text-right"
            onChange={(gross) => onChange(fromPayslip(gross, settings.payslipTax))}
          />
        </Field>
        <Field label={t("payslipTax", lang)} suffix="kr">
          <NumberInput
            value={settings.payslipTax}
            lang={lang}
            blankWhenZero
            placeholder="4 630,00"
            className="w-32 text-right"
            onChange={(tax) => onChange(fromPayslip(settings.payslipGross, tax))}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("yourTaxRate", lang)}
          </span>
          <span
            className={`text-sm tabular font-medium min-h-11 flex items-center ${
              settings.taxRate > 0 ? "text-accent" : "text-muted"
            }`}
          >
            {settings.taxRate > 0
              ? `${settings.taxRate.toFixed(2).replace(".", lang === "sv" ? "," : ".")} %`
              : t("taxNotSetYet", lang)}
          </span>
        </div>
      </div>

      <LinkButton onClick={() => onChange({ taxMode: "percent" })}>
        {t("usePercentInstead", lang)}
      </LinkButton>
    </div>
  );
}

function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div
      className="flex border border-border rounded-lg overflow-hidden text-xs font-medium"
      role="group"
      aria-label="Language"
    >
      {(["sv", "en"] as Language[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={lang === code}
          className={`inline-flex items-center justify-center min-w-11 min-h-11 px-3 uppercase cursor-pointer transition-colors ${
            lang === code ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
