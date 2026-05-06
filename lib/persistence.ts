/**
 * Client-side persistence for BitSift Slice B polish.
 *
 * - `bitsift:skip-animation` — boolean preference. Null = user hasn't decided
 *   yet (we'll show the "skip next time?" pill after the first sift completes).
 * - `bitsift:edits` — single JSON map keyed by URL with the user's edit state
 *   (hideImages flag + removedIds + addedIds). Capped at MAX_EDIT_ENTRIES so
 *   localStorage doesn't grow unbounded.
 *
 * All reads/writes are wrapped in try/catch — Safari private mode and quota
 * errors are non-fatal. Falls back gracefully when window.localStorage is
 * undefined (SSR, sandboxed iframe).
 */

const SKIP_KEY = "bitsift:skip-animation";
const EDITS_KEY = "bitsift:edits";
const MAX_EDIT_ENTRIES = 30;

// ──────────── Skip-animation preference ────────────

export function getSkipAnim(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(SKIP_KEY);
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function setSkipAnim(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SKIP_KEY, v ? "true" : "false");
  } catch {
    // ignore
  }
}

// ──────────── Per-URL edit state ────────────

export interface PersistedEditState {
  hideImages?: boolean;
  removedIds?: string[];
  addedIds?: string[];
}

interface EditStoreEntry extends PersistedEditState {
  savedAt: number;
}

interface EditStore {
  [url: string]: EditStoreEntry;
}

function readStore(): EditStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EDITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as EditStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: EditStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EDITS_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}

function isEmptyEdit(edits: PersistedEditState): boolean {
  return (
    !edits.hideImages &&
    (!edits.removedIds || edits.removedIds.length === 0) &&
    (!edits.addedIds || edits.addedIds.length === 0)
  );
}

export function loadEdits(url: string): PersistedEditState | null {
  if (!url) return null;
  const entry = readStore()[url];
  if (!entry) return null;
  return {
    hideImages: !!entry.hideImages,
    removedIds: Array.isArray(entry.removedIds) ? entry.removedIds : [],
    addedIds: Array.isArray(entry.addedIds) ? entry.addedIds : [],
  };
}

export function saveEdits(url: string, edits: PersistedEditState): void {
  if (!url) return;
  const store = readStore();

  if (isEmptyEdit(edits)) {
    if (store[url]) {
      delete store[url];
      writeStore(store);
    }
    return;
  }

  store[url] = { ...edits, savedAt: Date.now() };

  // Trim to most recently saved N entries.
  const entries = Object.entries(store).sort(
    (a, b) => b[1].savedAt - a[1].savedAt
  );
  if (entries.length > MAX_EDIT_ENTRIES) {
    const trimmed: EditStore = {};
    for (const [k, v] of entries.slice(0, MAX_EDIT_ENTRIES)) trimmed[k] = v;
    writeStore(trimmed);
  } else {
    writeStore(store);
  }
}
