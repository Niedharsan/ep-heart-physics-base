import type { TaskFourScore } from './marking';

const STORAGE_KEY = 'ep-heart-task-four-attempts-v1';
const MAX_ATTEMPTS = 20;

export interface StoredTaskFourAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly result: TaskFourScore;
}

export interface TaskFourStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

function defaultStorage(): TaskFourStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isStoredAttempt(value: unknown): value is StoredTaskFourAttempt {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<StoredTaskFourAttempt>;
  return typeof item.id === 'string'
    && typeof item.createdAtIso === 'string'
    && item.result !== undefined
    && typeof item.result.score === 'number'
    && item.result.maximumScore === 25;
}

export function loadTaskFourAttempts(
  storage: Pick<TaskFourStorage, 'getItem'> | null = defaultStorage(),
): readonly StoredTaskFourAttempt[] {
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

export function saveTaskFourAttempt(
  attempt: StoredTaskFourAttempt,
  storage: Pick<TaskFourStorage, 'getItem' | 'setItem'> | null = defaultStorage(),
): readonly StoredTaskFourAttempt[] {
  const attempts = Object.freeze([attempt, ...loadTaskFourAttempts(storage)].slice(0, MAX_ATTEMPTS));
  if (!storage) return attempts;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    return attempts;
  }
  return attempts;
}

export function clearTaskFourAttempts(
  storage: Pick<TaskFourStorage, 'removeItem'> | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Local storage may be blocked; clearing remains a best-effort action.
  }
}
