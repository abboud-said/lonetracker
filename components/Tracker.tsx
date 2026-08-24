"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { computeShift, computeTotals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { NO_LEAVE } from "@/lib/parse";
import { getServerSnapshot, getSnapshot, setAppState, subscribe } from "@/lib/store";
import type { AppState } from "@/lib/storage";
import { parseNumber } from "@/lib/time";
import type { Language, RuleSet } from "@/lib/types";
import { RuleEditor } from "./RuleEditor";
import { ShiftList } from "./ShiftList";
import { Summary } from "./Summary";
import { ScheduleInput } from "./ScheduleInput";
import { Field, Section, TextInput } from "./ui";

export function Tracker() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { settings, ruleSet, shifts, leave, fileName, language: lang } = state;

  const results = useMemo(
    () => shifts.map((shift) => computeShift(shift, ruleSet, settings)),
    [shifts, ruleSet, settings],
  );
  const totals = useMemo(
    () => computeTotals(results, settings, leave, ruleSet),
    [results, settings, leave, ruleSet],
  );

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
        <div className="flex flex-wrap gap-6">
          <Field label={t("baseRate", lang)} suffix={t("baseRateUnit", lang)}>
            <TextInput
              value={String(settings.baseRate)}
              inputMode="decimal"
              className="w-28 text-right"
              onChange={(v) => patch({ settings: { ...settings, baseRate: parseNumber(v) } })}
            />
          </Field>
          <div className="flex flex-col gap-1">
            <Field label={t("taxRate", lang)} suffix={t("taxRateUnit", lang)}>
              <TextInput
                value={String(settings.taxRate)}
                inputMode="decimal"
                className="w-20 text-right"
                onChange={(v) => patch({ settings: { ...settings, taxRate: parseNumber(v) } })}
              />
            </Field>
            <span className="text-xs text-muted">{t("taxHelp", lang)}</span>
          </div>
        </div>

      </Section>

      <Summary
        totals={totals}
        ruleSet={ruleSet}
        settings={settings}
        lang={lang}
        hasShifts={shifts.length > 0}
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
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="self-center text-sm text-muted hover:text-foreground underline underline-offset-4 cursor-pointer"
        >
          {showAdvanced ? t("hideAdvanced", lang) : t("showAdvanced", lang)}
        </button>

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
          className={`px-2.5 py-1.5 uppercase cursor-pointer transition-colors ${
            lang === code ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
