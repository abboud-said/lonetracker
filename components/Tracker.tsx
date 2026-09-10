"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { computeShift, computeTotals } from "@/lib/calc";
import { t } from "@/lib/i18n";
import { NO_LEAVE, type DayKind, type LeaveDays } from "@/lib/parse";
import { getServerSnapshot, getSnapshot, setAppState, subscribe } from "@/lib/store";
import type { AppState } from "@/lib/storage";
import { ALL_MONTHS, monthsOf } from "@/lib/time";
import { KOMMUNER, taxFromTable } from "@/lib/skattetabell";
import type { Language, RuleSet, Settings, Shift } from "@/lib/types";
import { RuleEditor } from "./RuleEditor";
import { ShiftList } from "./ShiftList";
import { Summary } from "./Summary";
import { ScheduleInput, type Replaced } from "./ScheduleInput";
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

  const visibleLeave = useMemo<LeaveDays>(() => {
    const within = (d: Shift) => month == null || d.date.startsWith(month);
    return {
      sick: leave.sick.filter(within),
      semester: leave.semester.filter(within),
      other: leave.other.filter(within),
    };
  }, [leave, month]);

  const results = useMemo(
    () => visibleShifts.map((shift) => computeShift(shift, ruleSet, settings)),
    [visibleShifts, ruleSet, settings],
  );
  // With a kommun chosen the withholding comes from Skatteverket's table for
  // the month's gross, which is what the employer actually does — so the
  // percentage is an output here, never an input.
  const taxOf = useMemo(() => {
    if (settings.taxMode !== "kommun") return undefined;
    const k = KOMMUNER.find((x) => x.name === settings.kommun);
    if (!k) return undefined;
    const table = settings.churchMember ? k.churchTable : k.table;
    return (gross: number) => taxFromTable(gross, table);
  }, [settings.taxMode, settings.kommun, settings.churchMember]);

  const taxKnown = settings.taxMode === "kommun" ? taxOf != null : settings.taxRate > 0;

  const totals = useMemo(
    () => computeTotals(results, settings, leave, ruleSet, month, taxOf),
    [results, settings, leave, ruleSet, month, taxOf],
  );

  // The document opens as Swedish and the language is a client-side choice, so
  // the attribute has to follow it here. Without this a screen reader keeps
  // reading English text with Swedish pronunciation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const patch = (next: Partial<AppState>) => setAppState((prev) => ({ ...prev, ...next }));

  const leaveTotal = leave.sick.length + leave.semester.length + leave.other.length;

  /**
   * A date is either worked or it is leave, never both — a sick day typed in
   * next to the shift it replaced would pay the same hours twice. So adding
   * one pushes the other out, and the caller is told which.
   */
  const addDay = (kind: DayKind, day: Shift): Replaced => {
    const label = fileName ?? t("addedByHandLabel", lang);
    const leaveOnDate = (Object.keys(leave) as (keyof LeaveDays)[]).some((k) =>
      leave[k].some((d) => d.date === day.date),
    );

    if (kind === "work") {
      patch({
        shifts: sortShifts([...shifts, day]),
        leave: withoutDate(leave, day.date),
        fileName: label,
      });
      return leaveOnDate ? "leave" : null;
    }

    const workOnDate = shifts.some((s) => s.date === day.date);
    const cleared = withoutDate(leave, day.date);
    patch({
      shifts: shifts.filter((s) => s.date !== day.date),
      leave: { ...cleared, [kind]: sortShifts([...cleared[kind], day]) },
      fileName: label,
    });
    return workOnDate ? "work" : leaveOnDate ? "leave" : null;
  };

  const markLeave = (id: string, kind: "sick" | "semester") => {
    const shift = shifts.find((s) => s.id === id);
    if (!shift) return;
    const cleared = withoutDate(leave, shift.date);
    patch({
      shifts: shifts.filter((s) => s.id !== id),
      leave: { ...cleared, [kind]: sortShifts([...cleared[kind], shift]) },
    });
  };

  const markWork = (kind: keyof LeaveDays, id: string) => {
    const day = leave[kind].find((d) => d.id === id);
    if (!day) return;
    patch({
      shifts: sortShifts([...shifts, day]),
      leave: { ...leave, [kind]: leave[kind].filter((d) => d.id !== id) },
    });
  };

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
      {shifts.length + leaveTotal === 0 ? (
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
          {/* Sick and semester days are entered differently from shifts, and
              nothing on an empty page shows that they can be — so it is said
              here, where someone starting out actually reads. */}
          <p className="text-sm mt-4 max-w-prose">{t("stepLeave", lang)}</p>
          <p className="text-xs text-muted mt-3 max-w-prose">{t("stepNote", lang)}</p>
        </section>
      ) : null}

      <ScheduleInput
        lang={lang}
        shiftCount={shifts.length}
        leave={leave}
        fileName={fileName}
        onLoaded={(parsed, name) =>
          patch({ shifts: parsed.shifts, leave: parsed.leave, fileName: name })
        }
        onAddDay={addDay}
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

          {/* Asked rather than assumed: whether semesterersättning comes with
              every month or only when the job ends differs between employers,
              and the payslip is the only thing that says which. */}
          <label className="flex items-start gap-2.5 cursor-pointer max-w-prose">
            <input
              type="checkbox"
              checked={settings.semesterersattningMonthly}
              onChange={(e) =>
                patch({ settings: { ...settings, semesterersattningMonthly: e.target.checked } })
              }
              className="mt-0.5 accent-accent cursor-pointer"
            />
            <span>
              <span className="text-sm font-medium">{t("semesterersattningLabel", lang)}</span>
              <span className="block text-xs text-muted mt-0.5">
                {t("semesterersattningHint", lang)}
              </span>
            </span>
          </label>
        </div>
      </Section>

      <Summary
        totals={totals}
        ruleSet={ruleSet}
        settings={settings}
        lang={lang}
        hasShifts={visibleShifts.length > 0}
        taxKnown={taxKnown}
        months={months}
        month={month}
        onMonthChange={setMonthChoice}
        onSemesterPayChange={(v: number, estimated: boolean) =>
          patch({ settings: { ...settings, semesterPayPerDay: v, semesterPayEstimated: estimated } })
        }
        onWeeklyHoursChange={(v: number) => patch({ settings: { ...settings, weeklyHours: v } })}
      />

      <ShiftList
        results={results}
        leave={visibleLeave}
        ruleSet={ruleSet}
        lang={lang}
        onRemove={(id) => patch({ shifts: shifts.filter((s) => s.id !== id) })}
        onRemoveLeave={(kind, id) =>
          patch({ leave: { ...leave, [kind]: leave[kind].filter((d) => d.id !== id) } })
        }
        onMarkLeave={markLeave}
        onMarkWork={markWork}
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

  if (settings.taxMode === "kommun") {
    const chosen = KOMMUNER.find((k) => k.name === settings.kommun);
    const table = chosen ? (settings.churchMember ? chosen.churchTable : chosen.table) : null;

    return (
      <div className="flex flex-col gap-2.5">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("taxRate", lang)}
          </span>
          <p className="text-xs text-muted mt-1 max-w-prose">{t("kommunHint", lang)}</p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("kommunLabel", lang)}
            </span>
            <select
              value={settings.kommun}
              onChange={(e) => onChange({ kommun: e.target.value })}
              className="bg-background border border-border rounded-lg min-h-11 px-2 py-2 text-sm outline-none focus:border-accent max-w-[14rem]"
            >
              <option value="">{t("chooseKommun", lang)}</option>
              {KOMMUNER.map((k) => (
                <option key={k.name} value={k.name}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>

          {table != null ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("taxTableIs", lang)}
              </span>
              <span className="text-sm tabular font-medium text-accent min-h-11 flex items-center">
                {table}
              </span>
            </div>
          ) : null}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer max-w-prose">
          <input
            type="checkbox"
            checked={settings.churchMember}
            onChange={(e) => onChange({ churchMember: e.target.checked })}
            className="mt-0.5 accent-accent cursor-pointer"
          />
          <span className="text-sm">{t("churchMember", lang)}</span>
        </label>

        {chosen?.spread && settings.churchMember ? (
          <p className="text-xs text-muted max-w-prose">{t("kommunSpread", lang)}</p>
        ) : null}

        <div className="flex flex-wrap gap-5">
          <LinkButton onClick={() => onChange({ taxMode: "payslip" })}>
            {t("usePayslipInstead", lang)}
          </LinkButton>
          <LinkButton onClick={() => onChange({ taxMode: "percent" })}>
            {t("usePercentInstead", lang)}
          </LinkButton>
        </div>
      </div>
    );
  }

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
        <LinkButton onClick={() => onChange({ taxMode: "kommun" })}>
          {t("useKommunInstead", lang)}
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

      <div className="flex flex-wrap gap-5">
        <LinkButton onClick={() => onChange({ taxMode: "kommun" })}>
          {t("useKommunInstead", lang)}
        </LinkButton>
        <LinkButton onClick={() => onChange({ taxMode: "percent" })}>
          {t("usePercentInstead", lang)}
        </LinkButton>
      </div>
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

function sortShifts(days: Shift[]): Shift[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

function withoutDate(leave: LeaveDays, date: string): LeaveDays {
  return {
    sick: leave.sick.filter((d) => d.date !== date),
    semester: leave.semester.filter((d) => d.date !== date),
    other: leave.other.filter((d) => d.date !== date),
  };
}
