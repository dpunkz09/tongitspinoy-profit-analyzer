import type { Prefs, SheetData } from './types';

// Bump the version if the saved shape ever changes.
const DATA_KEY = 'tp-profit:data:v1';
const PREFS_KEY = 'tp-profit:prefs:v1';

export const DEFAULT_PREFS: Prefs = {
  percents: {},
  agentColumns: null,
  overviewColumns: null,
  mobileLayout: 'cards',
};

export interface SavedData {
  fileName: string;
  sheets: SheetData[];
}

// Storage can be full, blocked or unavailable (private mode), so every call is guarded.
function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app still works; it just won't remember. Drop the old copy so it isn't restored.
    remove(key);
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
}

export function loadData(): SavedData | null {
  const saved = read<SavedData>(DATA_KEY);
  const valid =
    saved &&
    Array.isArray(saved.sheets) &&
    saved.sheets.every((s) => typeof s?.sheetName === 'string' && Array.isArray(s.data));
  return valid ? saved : null;
}

export const saveData = (data: SavedData) => write(DATA_KEY, data);
export const clearData = () => remove(DATA_KEY);

export const loadPrefs = (): Prefs => ({ ...DEFAULT_PREFS, ...read<Partial<Prefs>>(PREFS_KEY) });
export const savePrefs = (prefs: Prefs) => write(PREFS_KEY, prefs);
