import { handelsPreset } from "./rules";
import type { Language, RuleSet, Settings, Shift } from "./types";

const KEY = "lonetracker.v2";

export type AppState = {
  settings: Settings;
  ruleSet: RuleSet;
  shifts: Shift[];
  fileName: string | null;
  language: Language;
};

export function defaultState(): AppState {
  return {
    settings: { baseRate: 177.44, taxRate: 30 },
    ruleSet: handelsPreset(),
    shifts: [],
    fileName: null,
    language: "sv",
  };
}

/**
 * Read persisted state, falling back to defaults field by field so a partial or
 * older payload still loads instead of throwing the whole thing away.
 */
export function loadState(): AppState {
  const fallback = defaultState();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      settings: {
        baseRate: numberOr(parsed.settings?.baseRate, fallback.settings.baseRate),
        taxRate: numberOr(parsed.settings?.taxRate, fallback.settings.taxRate),
      },
      ruleSet: isRuleSet(parsed.ruleSet) ? parsed.ruleSet : fallback.ruleSet,
      shifts: Array.isArray(parsed.shifts) ? parsed.shifts.filter(isShift) : [],
      fileName: typeof parsed.fileName === "string" ? parsed.fileName : null,
      language: parsed.language === "en" || parsed.language === "sv" ? parsed.language : fallback.language,
    };
  } catch {
    return fallback;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked in private mode; the app still works for
    // this session, it just will not remember anything.
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

function isRuleSet(value: unknown): value is RuleSet {
  if (!value || typeof value !== "object") return false;
  const rs = value as Partial<RuleSet>;
  return Array.isArray(rs.tiers) && Array.isArray(rs.windows) && typeof rs.name === "string";
}

function isShift(value: unknown): value is Shift {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Shift>;
  return (
    typeof s.date === "string" &&
    typeof s.startMin === "number" &&
    typeof s.endMin === "number"
  );
}
