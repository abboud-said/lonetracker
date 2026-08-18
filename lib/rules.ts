import type { ObTier, RuleSet, Weekday } from "./types";

export const ALL_DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Mirrors the OB windows the original Lönetracker hardcoded for retail work at
 * ÖB (a Handels-style schedule): weekday evenings at 50% then 70%, Saturday
 * afternoons and all of Sunday at 100%.
 *
 * It is a starting point, not an authoritative reading of any agreement —
 * the UI tells users to check it against their own kollektivavtal.
 */
export function handelsPreset(): RuleSet {
  return {
    id: "handels-retail",
    name: "Handels – detaljhandel",
    tiers: [
      { id: "ob50", label: "OB 50%", percent: 50 },
      { id: "ob70", label: "OB 70%", percent: 70 },
      { id: "ob100", label: "OB 100%", percent: 100 },
    ],
    windows: [
      { id: "w1", days: [1, 2, 3, 4, 5], from: 18 * 60, to: 20 * 60, tierId: "ob50" },
      { id: "w2", days: [1, 2, 3, 4, 5], from: 20 * 60, to: 24 * 60, tierId: "ob70" },
      { id: "w3", days: [6], from: 12 * 60, to: 24 * 60, tierId: "ob100" },
      { id: "w4", days: [0], from: 0, to: 24 * 60, tierId: "ob100" },
    ],
  };
}

/** An empty rule set — every hour pays base only until the user adds windows. */
export function emptyRuleSet(name: string): RuleSet {
  return { id: newId(), name, tiers: [], windows: [] };
}

export const PRESETS: { key: string; build: () => RuleSet }[] = [
  { key: "handels", build: handelsPreset },
];

export type Segment = { from: number; to: number; tierId: string | null };

/**
 * Expand a weekday into wall-to-wall segments covering 00:00–24:00, where a
 * null tierId means base pay. Overlapping windows are resolved by taking the
 * first one declared, which keeps the result stable while the user is midway
 * through editing rules.
 */
export function segmentsForDay(ruleSet: RuleSet, dow: Weekday): Segment[] {
  const windows = ruleSet.windows
    .filter((w) => w.days.includes(dow) && w.to > w.from)
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

  for (const day of ALL_DAYS) {
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
