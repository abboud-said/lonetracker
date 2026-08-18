"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { ALL_DAYS, emptyRuleSet, handelsPreset, newId, validateRuleSet } from "@/lib/rules";
import { fromHhmm, hhmm, parseNumber, weekdayLabel } from "@/lib/time";
import type { Language, ObTier, ObWindow, RuleSet, Weekday } from "@/lib/types";
import { Button, Section, TextInput } from "./ui";

/** 24:00 is a valid window edge but wraps to 00:00 under normal formatting. */
function timeLabel(min: number): string {
  return min === 1440 ? "24:00" : hhmm(min);
}

/**
 * A time field that keeps what the user is typing, and only pushes a value up
 * once it parses — otherwise every keystroke would be rewritten mid-edit.
 */
function TimeInput({ value, onCommit }: { value: number; onCommit: (min: number) => void }) {
  const [draft, setDraft] = useState(() => timeLabel(value));
  const [lastValue, setLastValue] = useState(value);

  // Loading a preset can replace the value under an already-mounted input, so
  // the draft is reset during render rather than in an effect.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(timeLabel(value));
  }

  const commit = () => {
    const parsed = fromHhmm(draft.trim());
    if (parsed == null) setDraft(timeLabel(value));
    else onCommit(parsed);
  };

  return (
    <input
      type="text"
      value={draft}
      inputMode="numeric"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-[4.5rem] bg-background border border-border rounded-lg px-2 py-1.5 text-sm tabular outline-none focus:border-accent"
    />
  );
}

export function RuleEditor({
  ruleSet,
  onChange,
  lang,
}: {
  ruleSet: RuleSet;
  onChange: (next: RuleSet) => void;
  lang: Language;
}) {
  const issues = validateRuleSet(ruleSet);
  const issuesFor = (windowId: string) => issues.filter((i) => i.windowId === windowId);

  const updateTier = (id: string, patch: Partial<ObTier>) =>
    onChange({
      ...ruleSet,
      tiers: ruleSet.tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    });

  const removeTier = (id: string) =>
    onChange({
      ...ruleSet,
      tiers: ruleSet.tiers.filter((tier) => tier.id !== id),
      windows: ruleSet.windows.filter((w) => w.tierId !== id),
    });

  const addTier = () =>
    onChange({
      ...ruleSet,
      tiers: [...ruleSet.tiers, { id: newId(), label: "OB", percent: 50 }],
    });

  const updateWindow = (id: string, patch: Partial<ObWindow>) =>
    onChange({
      ...ruleSet,
      windows: ruleSet.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });

  const removeWindow = (id: string) =>
    onChange({ ...ruleSet, windows: ruleSet.windows.filter((w) => w.id !== id) });

  const addWindow = () => {
    if (ruleSet.tiers.length === 0) return;
    onChange({
      ...ruleSet,
      windows: [
        ...ruleSet.windows,
        {
          id: newId(),
          days: [1, 2, 3, 4, 5],
          from: 18 * 60,
          to: 20 * 60,
          tierId: ruleSet.tiers[0].id,
        },
      ],
    });
  };

  const toggleDay = (w: ObWindow, day: Weekday) => {
    const days = w.days.includes(day) ? w.days.filter((d) => d !== day) : [...w.days, day];
    updateWindow(w.id, { days });
  };

  return (
    <Section
      title={t("rules", lang)}
      hint={t("rulesHint", lang)}
      actions={
        <>
          <Button onClick={() => onChange(handelsPreset())}>{t("presetHandels", lang)}</Button>
          <Button variant="quiet" onClick={() => onChange(emptyRuleSet(ruleSet.name))}>
            {t("clearRules", lang)}
          </Button>
        </>
      }
    >
      <p className="text-xs text-muted mb-5 max-w-prose">{t("rulesDisclaimer", lang)}</p>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("tiers", lang)}
          </h3>
          <Button variant="quiet" onClick={addTier}>
            + {t("addTier", lang)}
          </Button>
        </div>

        {ruleSet.tiers.length === 0 ? (
          <p className="text-sm text-muted py-2">{t("noTiers", lang)}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ruleSet.tiers.map((tier) => (
              <li key={tier.id} className="flex flex-wrap items-center gap-2">
                <TextInput
                  value={tier.label}
                  onChange={(label) => updateTier(tier.id, { label })}
                  className="w-40"
                />
                <TextInput
                  value={String(tier.percent)}
                  inputMode="decimal"
                  onChange={(v) => updateTier(tier.id, { percent: parseNumber(v) })}
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted">%</span>
                <Button variant="quiet" onClick={() => removeTier(tier.id)}>
                  {t("remove", lang)}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {t("windows", lang)}
          </h3>
          <Button variant="quiet" onClick={addWindow}>
            + {t("addWindow", lang)}
          </Button>
        </div>

        {ruleSet.windows.length === 0 ? (
          <p className="text-sm text-muted py-2">{t("noWindows", lang)}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ruleSet.windows.map((w) => {
              const windowIssues = issuesFor(w.id);
              return (
                <li
                  key={w.id}
                  className="border border-border rounded-lg p-3 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.65rem] uppercase tracking-wide text-muted">
                        {t("from", lang)}
                      </span>
                      <TimeInput value={w.from} onCommit={(from) => updateWindow(w.id, { from })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.65rem] uppercase tracking-wide text-muted">
                        {t("to", lang)}
                      </span>
                      <TimeInput value={w.to} onCommit={(to) => updateWindow(w.id, { to })} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[0.65rem] uppercase tracking-wide text-muted">
                        {t("tier", lang)}
                      </span>
                      <select
                        value={w.tierId}
                        onChange={(e) => updateWindow(w.id, { tierId: e.target.value })}
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent"
                      >
                        {ruleSet.tiers.map((tier) => (
                          <option key={tier.id} value={tier.id}>
                            {tier.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="ml-auto">
                      <Button variant="quiet" onClick={() => removeWindow(w.id)}>
                        {t("remove", lang)}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map((day) => {
                      const on = w.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(w, day)}
                          aria-pressed={on}
                          className={`rounded-md px-2 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                            on
                              ? "border-accent bg-accent text-white"
                              : "border-border text-muted hover:text-foreground"
                          }`}
                        >
                          {weekdayLabel(day, lang)}
                        </button>
                      );
                    })}
                  </div>

                  {windowIssues.length > 0 ? (
                    <p className="text-xs text-danger">
                      {windowIssues
                        .map((i) =>
                          t(
                            i.kind === "range"
                              ? "issueRange"
                              : i.kind === "overlap"
                                ? "issueOverlap"
                                : "issueTier",
                            lang,
                          ),
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}
