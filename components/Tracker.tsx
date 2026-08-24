"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { computeShift, computeTotals } from "@/lib/calc";
import { parseErrorKey, t, type MessageKey } from "@/lib/i18n";
import { parseScheduleFile, ScheduleParseError } from "@/lib/parse";
import { getServerSnapshot, getSnapshot, setAppState, subscribe } from "@/lib/store";
import type { AppState } from "@/lib/storage";
import { parseNumber } from "@/lib/time";
import type { Language, RuleSet } from "@/lib/types";
import { RuleEditor } from "./RuleEditor";
import { ShiftList } from "./ShiftList";
import { Summary } from "./Summary";
import { Button, Field, Section, TextInput } from "./ui";

export function Tracker() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { settings, ruleSet, shifts, fileName, language: lang } = state;

  const results = useMemo(
    () => shifts.map((shift) => computeShift(shift, ruleSet, settings)),
    [shifts, ruleSet, settings],
  );
  const totals = useMemo(() => computeTotals(results, settings), [results, settings]);

  const patch = (next: Partial<AppState>) => setAppState((prev) => ({ ...prev, ...next }));

  async function handleFile(file: File) {
    try {
      const parsed = await parseScheduleFile(file);
      patch({ shifts: parsed, fileName: file.name });
      setErrorKey(null);
    } catch (err) {
      setErrorKey(parseErrorKey(err instanceof ScheduleParseError ? err.code : "unknown"));
    }
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-10 sm:py-14 flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("appName", lang)}</h1>
          <p className="text-sm text-muted mt-1 max-w-prose">{t("tagline", lang)}</p>
        </div>
        <LanguageToggle lang={lang} onChange={(language) => patch({ language })} />
      </header>

      <Section
        title={t("schedule", lang)}
        hint={t("uploadHint", lang)}
        actions={
          <>
            <Button variant="primary" onClick={() => fileInput.current?.click()}>
              {shifts.length > 0 ? t("replaceFile", lang) : t("chooseFile", lang)}
            </Button>
            {shifts.length > 0 ? (
              <Button
                variant="quiet"
                onClick={() => {
                  patch({ shifts: [], fileName: null });
                  setErrorKey(null);
                }}
              >
                {t("clearSchedule", lang)}
              </Button>
            ) : null}
          </>
        }
      >
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            // Reset so picking the same file again still fires a change event.
            e.target.value = "";
          }}
        />

        {errorKey ? (
          <p className="text-sm text-danger">{t(errorKey, lang)}</p>
        ) : shifts.length > 0 ? (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{fileName}</span> — {shifts.length}{" "}
            {t(shifts.length === 1 ? "shiftsLoadedOne" : "shiftsLoadedMany", lang)}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("noSchedule", lang)}</p>
        )}
      </Section>

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
          <Field label={t("taxRate", lang)} suffix={t("taxRateUnit", lang)}>
            <TextInput
              value={String(settings.taxRate)}
              inputMode="decimal"
              className="w-20 text-right"
              onChange={(v) => patch({ settings: { ...settings, taxRate: parseNumber(v) } })}
            />
          </Field>
        </div>

      </Section>

      <Summary
        totals={totals}
        ruleSet={ruleSet}
        settings={settings}
        lang={lang}
        hasShifts={shifts.length > 0}
      />

      <ShiftList results={results} ruleSet={ruleSet} lang={lang} />

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
