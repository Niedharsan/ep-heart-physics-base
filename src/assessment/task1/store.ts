import type { TaskOneScore } from './marking';

const STORAGE_KEY = 'ep-heart-task-one-attempts-v1';
const MAX_ATTEMPTS = 20;

export interface StoredTaskOneAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly result: TaskOneScore;
}

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadTaskOneAttempts(
  storage: ReadStorage | undefined = browserStorage(),
): readonly StoredTaskOneAttempt[] {
  if (!storage) return Object.freeze([]);
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return Object.freeze([]);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(parsed.filter((value): value is StoredTaskOneAttempt => {
      if (!value || typeof value !== 'object') return false;
      const item = value as Partial<StoredTaskOneAttempt>;
      return typeof item.id === 'string'
        && typeof item.createdAtIso === 'string'
        && item.result !== undefined
        && typeof item.result.score === 'number'
        && item.result.maximumScore === 15;
    }).slice(0, MAX_ATTEMPTS));
  } catch {
    return Object.freeze([]);
  }
}

export function saveTaskOneAttempt(
  attempt: StoredTaskOneAttempt,
  storage: WriteStorage | undefined = browserStorage(),
): readonly StoredTaskOneAttempt[] {
  const attempts = Object.freeze([
    attempt,
    ...loadTaskOneAttempts(storage),
  ].slice(0, MAX_ATTEMPTS));
  storage?.setItem(STORAGE_KEY, JSON.stringify(attempts));
  return attempts;
}
