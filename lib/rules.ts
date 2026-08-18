import { isHelgdag, isSaturdayEve } from "./holidays";
import { weekdayOf } from "./time";
import type { DayKey, ObTier, RuleSet } from "./types";

/** Day types offered in the editor, in the order they are shown. */
export const ALL_DAY_KEYS: DayKey[] = [1, 2, 3, 4, 5, 6, 0, "eve", "holiday"];

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Decide which set of rules a date is matched against.
 *
 * Public holidays win outright — "söndagar och helgdagar" is its own line in
 * the agreement. A Sunday is kept as a Sunday even when it is also one of the
 * Saturday-equated eves, since the Sunday rate is the higher of the two.
 */
export function classifyDay(isoDate: string): DayKey {
  if (isHelgdag(isoDate)) return "holiday";
  const dow = weekdayOf(isoDate);
  if (dow === 0) return 0;
  if (isSaturdayEve(isoDate)) return "eve";
  return dow;
}

/**
 * Detaljhandelsavtalet §8.1 (Svensk Handel / Handelsanställdas förbund,
 * 1 April 2025 – 31 March 2027), quoted verbatim:
 *
 *   måndag-fredag kl. 18.15 – 20.00   50 %
 *   måndag-fredag efter kl. 20.00     70 %
 *   lördagar efter kl. 12.00         100 %
 *   söndagar och helgdagar           100 %
 *   Med lördagar jämställs jul-, nyårs- och midsommarafton.
 */
export function detaljhandelPreset(): RuleSet {
  return {
    id: "handels-detaljhandel",
    name: "Handels – Detaljhandel",
    tiers: [
      { id: "ob50", label: "OB 50%", percent: 50 },
      { id: "ob70", label: "OB 70%", percent: 70 },
      { id: "ob100", label: "OB 100%", percent: 100 },
    ],
    windows: [
      { id: "dh1", days: [1, 2, 3, 4, 5], from: 18 * 60 + 15, to: 20 * 60, tierId: "ob50" },
      { id: "dh2", days: [1, 2, 3, 4, 5], from: 20 * 60, to: 24 * 60, tierId: "ob70" },
      { id: "dh3", days: [6, "eve"], from: 12 * 60, to: 24 * 60, tierId: "ob100" },
      { id: "dh4", days: [0, "holiday"], from: 0, to: 24 * 60, tierId: "ob100" },
    ],
  };
}

/**
 * Lager- och e-handelsavtalet, as published by Handels on its OB-tillägg page.
 *
 * Taken from the union's summary rather than the agreement text itself, so it
 * is worth checking against your own avtal before relying on it.
 */
export function lagerPreset(): RuleSet {
  return {
    id: "handels-lager",
    name: "Handels – Lager & e-handel",
    tiers: [
      { id: "ob40", label: "OB 40%", percent: 40 },
      { id: "ob70", label: "OB 70%", percent: 70 },
      { id: "ob100", label: "OB 100%", percent: 100 },
    ],
    windows: [
      { id: "lg1", days: [1, 2, 3, 4, 5], from: 0, to: 6 * 60, tierId: "ob70" },
      { id: "lg2", days: [1, 2, 3, 4, 5], from: 6 * 60, to: 7 * 60, tierId: "ob40" },
      { id: "lg3", days: [1, 2, 3, 4, 5], from: 18 * 60, to: 23 * 60, tierId: "ob40" },
      { id: "lg4", days: [1, 2, 3, 4, 5], from: 23 * 60, to: 24 * 60, tierId: "ob70" },
      { id: "lg5", days: [6], from: 0, to: 6 * 60, tierId: "ob70" },
      { id: "lg6", days: [6], from: 6 * 60, to: 23 * 60, tierId: "ob40" },
      { id: "lg7", days: [6], from: 23 * 60, to: 24 * 60, tierId: "ob70" },
      { id: "lg8", days: [0, "holiday"], from: 0, to: 24 * 60, tierId: "ob100" },
    ],
  };
}

/** An empty rule set — every hour pays base only until the user adds windows. */
export function emptyRuleSet(name: string): RuleSet {
  return { id: newId(), name, tiers: [], windows: [] };
}

export const PRESETS: { key: "detaljhandel" | "lager"; build: () => RuleSet }[] = [
  { key: "detaljhandel", build: detaljhandelPreset },
  { key: "lager", build: lagerPreset },
];

export type Segment = { from: number; to: number; tierId: string | null };

/**
 * Expand a day type into wall-to-wall segments covering 00:00–24:00, where a
 * null tierId means base pay. Overlapping windows are resolved by taking the
 * first one declared, which keeps the result stable while the user is midway
 * through editing rules.
 */
export function segmentsForDay(ruleSet: RuleSet, day: DayKey): Segment[] {
  const windows = ruleSet.windows
    .filter((w) => w.days.includes(day) && w.to > w.from)
    .sort((a, b) => a.from - b.from);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const w of windows) {
    const from = Math.max(w.from, cursor);
    const to = Math.min(w.to, 1440);
    if (to <= from) continue;
    if (from > cursor) segments.push({ from: cursor, to: from, tierId: null });
    segments.push({ from, to, tierId: w.tierId });
    cursor = to;
  }
  if (cursor < 1440) segments.push({ from: cursor, to: 1440, tierId: null });
  return segments;
}

export type RuleIssue = { windowId: string; kind: "range" | "overlap" | "tier" };

export function validateRuleSet(ruleSet: RuleSet): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const tierIds = new Set(ruleSet.tiers.map((t) => t.id));

  for (const w of ruleSet.windows) {
    if (w.to <= w.from || w.from < 0 || w.to > 1440) {
      issues.push({ windowId: w.id, kind: "range" });
    }
    if (!tierIds.has(w.tierId)) {
      issues.push({ windowId: w.id, kind: "tier" });
    }
  }

  for (const day of ALL_DAY_KEYS) {
    const onDay = ruleSet.windows
      .filter((w) => w.days.includes(day) && w.to > w.from)
      .sort((a, b) => a.from - b.from);
    for (let i = 1; i < onDay.length; i++) {
      if (onDay[i].from < onDay[i - 1].to) {
        issues.push({ windowId: onDay[i].id, kind: "overlap" });
      }
    }
  }

  return issues;
}

export function tierOf(ruleSet: RuleSet, tierId: string): ObTier | undefined {
  return ruleSet.tiers.find((t) => t.id === tierId);
}
