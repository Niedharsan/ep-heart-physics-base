import type { TaskFiveScore } from './marking';

const STORAGE_KEY = 'ep-heart-task-five-attempts-v1';
const MAX_ATTEMPTS = 20;

export interface StoredTaskFiveAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly result: TaskFiveScore;
}

export interface TaskFiveStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

function defaultStorage(): TaskFiveStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isStoredAttempt(value: unknown): value is StoredTaskFiveAttempt {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<StoredTaskFiveAttempt>;
  return typeof item.id === 'string'
    && typeof item.createdAtIso === 'string'
    && item.result !== undefined
    && typeof item.result.score === 'number'
    && item.result.maximumScore === 15;
}

export function loadTaskFiveAttempts(
  storage: Pick<TaskFiveStorage, 'getItem'> | null = defaultStorage(),
): readonly StoredTaskFiveAttempt[] {
  if (!storage) return Object.freeze([]);
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

export function saveTaskFiveAttempt(
  attempt: StoredTaskFiveAttempt,
  storage: Pick<TaskFiveStorage, 'getItem' | 'setItem'> | null = defaultStorage(),
): readonly StoredTaskFiveAttempt[] {
  const attempts = Object.freeze([attempt, ...loadTaskFiveAttempts(storage)].slice(0, MAX_ATTEMPTS));
  if (!storage) return attempts;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    return attempts;
  }
  return attempts;
}

export function clearTaskFiveAttempts(
  storage: Pick<TaskFiveStorage, 'removeItem'> | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Local storage may be blocked; clearing remains a best-effort action.
  }
}
