import type { StoredAttempt } from './types';

const STORAGE_KEY = 'ep-heart-assessment-attempts-v1';
const MAX_ATTEMPTS = 50;

function isStoredAttempt(value: unknown): value is StoredAttempt {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredAttempt>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.createdAtIso === 'string'
    && typeof candidate.scenarioId === 'string'
    && typeof candidate.intervalId === 'string'
    && candidate.calipers !== undefined
    && typeof candidate.reportedValueMs === 'number'
    && candidate.result !== undefined
  );
}

export function loadAttempts(storage: Pick<Storage, 'getItem'> = window.localStorage): readonly StoredAttempt[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return Object.freeze([]);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(parsed.filter(isStoredAttempt).slice(0, MAX_ATTEMPTS));
  } catch {
    return Object.freeze([]);
  }
}

export function saveAttempt(
  attempt: StoredAttempt,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
): readonly StoredAttempt[] {
  const attempts = Object.freeze([attempt, ...loadAttempts(storage)].slice(0, MAX_ATTEMPTS));
  storage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  return attempts;
}

export function clearAttempts(storage: Pick<Storage, 'removeItem'> = window.localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
