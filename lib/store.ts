import { defaultState, loadState, saveState, type AppState } from "./storage";

/**
 * localStorage-backed store, exposed through useSyncExternalStore.
 *
 * Reading storage during render or in an effect would either mismatch the
 * server HTML or trigger a cascading re-render; treating it as the external
 * store it actually is avoids both, and lets other tabs push updates in.
 */

const SERVER_SNAPSHOT = defaultState();

let snapshot: AppState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", onExternalWrite);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onExternalWrite);
    }
  };
}

/** Another tab wrote to storage — drop our cached snapshot and re-read. */
function onExternalWrite() {
  snapshot = loadState();
  emit();
}

export function getSnapshot(): AppState {
  if (snapshot === null) snapshot = loadState();
  return snapshot;
}

/** Stable across calls, so hydration renders the same markup the server sent. */
export function getServerSnapshot(): AppState {
  return SERVER_SNAPSHOT;
}

export function setAppState(update: (prev: AppState) => AppState): void {
  snapshot = update(getSnapshot());
  saveState(snapshot);
  emit();
}
