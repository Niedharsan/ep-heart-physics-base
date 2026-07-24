import type { TaskTwoScore } from './marking';

const STORAGE_KEY = 'ep-heart-task-two-attempts-v1';
const MAX_ATTEMPTS = 20;

export interface StoredTaskTwoAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly result: TaskTwoScore;
}

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function loadTaskTwoAttempts(
  storage: ReadStorage | null = browserStorage(),
): readonly StoredTaskTwoAttempt[] {
  if (storage === null) return Object.freeze([]);
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(
      parsed
        .filter((value): value is StoredTaskTwoAttempt => Boolean(
          value
          && typeof value === 'object'
          && (value as StoredTaskTwoAttempt).result?.maximumScore === 22,
        ))
        .slice(0, MAX_ATTEMPTS),
    );
  } catch {
    return Object.freeze([]);
  }
}

export function saveTaskTwoAttempt(
  attempt: StoredTaskTwoAttempt,
  storage: WriteStorage | null = browserStorage(),
): readonly StoredTaskTwoAttempt[] {
  if (storage === null) return Object.freeze([attempt]);
  const attempts = Object.freeze(
    [attempt, ...loadTaskTwoAttempts(storage)].slice(0, MAX_ATTEMPTS),
  );
  storage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  return attempts;
}
