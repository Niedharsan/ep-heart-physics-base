import type { SectionScore, TaskThreeScore, WrittenResponseScore } from './marking';

export const TASK_THREE_ATTEMPT_STORAGE_KEY = 'ep-heart-task-three-attempts-v1' as const;
export const TASK_THREE_MAX_STORED_ATTEMPTS = 20 as const;

export interface StoredTaskThreeAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly result: TaskThreeScore;
}

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>;
type ClearStorage = Pick<Storage, 'removeItem'>;

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFeedback(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSectionScore(value: unknown, maximumScore: number): value is SectionScore {
  if (!isRecord(value)) return false;
  return typeof value.score === 'number'
    && Number.isFinite(value.score)
    && value.score >= 0
    && value.score <= maximumScore
    && value.maximumScore === maximumScore
    && isFeedback(value.feedback);
}

function isWrittenResponseScore(value: unknown, maximumScore: number): value is WrittenResponseScore {
  return isSectionScore(value, maximumScore)
    && isRecord(value)
    && typeof value.wordCount === 'number'
    && Number.isInteger(value.wordCount)
    && value.wordCount >= 0
    && value.targetWordCount === 50;
}

function isTaskThreeScore(value: unknown): value is TaskThreeScore {
  if (!isRecord(value)) return false;
  return typeof value.score === 'number'
    && Number.isFinite(value.score)
    && value.score >= 0
    && value.score <= 23
    && value.maximumScore === 23
    && isSectionScore(value.atrialTachycardia, 6)
    && isSectionScore(value.ahJump, 4)
    && isWrittenResponseScore(value.cannonWave, 5)
    && isWrittenResponseScore(value.adenosine, 5)
    && isSectionScore(value.avnrtEcg, 3);
}

function isStoredTaskThreeAttempt(value: unknown): value is StoredTaskThreeAttempt {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && value.id.trim().length > 0
    && typeof value.createdAtIso === 'string'
    && value.createdAtIso.trim().length > 0
    && isTaskThreeScore(value.result);
}

function freezeFeedback(feedback: readonly string[]): readonly string[] {
  return Object.freeze([...feedback]);
}

function freezeSection(section: SectionScore): SectionScore {
  return Object.freeze({
    score: section.score,
    maximumScore: section.maximumScore,
    feedback: freezeFeedback(section.feedback),
  });
}

function freezeWritten(section: WrittenResponseScore): WrittenResponseScore {
  return Object.freeze({
    ...freezeSection(section),
    wordCount: section.wordCount,
    targetWordCount: section.targetWordCount,
  });
}

function freezeScore(result: TaskThreeScore): TaskThreeScore {
  return Object.freeze({
    score: result.score,
    maximumScore: result.maximumScore,
    atrialTachycardia: freezeSection(result.atrialTachycardia),
    ahJump: freezeSection(result.ahJump),
    cannonWave: freezeWritten(result.cannonWave),
    adenosine: freezeWritten(result.adenosine),
    avnrtEcg: freezeSection(result.avnrtEcg),
  });
}

function freezeAttempt(attempt: StoredTaskThreeAttempt): StoredTaskThreeAttempt {
  return Object.freeze({
    id: attempt.id,
    createdAtIso: attempt.createdAtIso,
    result: freezeScore(attempt.result),
  });
}

export function loadTaskThreeAttempts(
  storage: ReadStorage | undefined = browserStorage(),
): readonly StoredTaskThreeAttempt[] {
  if (!storage) return Object.freeze([]);
  try {
    const raw = storage.getItem(TASK_THREE_ATTEMPT_STORAGE_KEY);
    if (!raw) return Object.freeze([]);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Object.freeze([]);
    return Object.freeze(parsed
      .filter(isStoredTaskThreeAttempt)
      .slice(0, TASK_THREE_MAX_STORED_ATTEMPTS)
      .map(freezeAttempt));
  } catch {
    return Object.freeze([]);
  }
}

export function saveTaskThreeAttempt(
  attempt: StoredTaskThreeAttempt,
  storage: WriteStorage | undefined = browserStorage(),
): readonly StoredTaskThreeAttempt[] {
  const attempts = Object.freeze([
    freezeAttempt(attempt),
    ...loadTaskThreeAttempts(storage),
  ].slice(0, TASK_THREE_MAX_STORED_ATTEMPTS));
  if (storage) storage.setItem(TASK_THREE_ATTEMPT_STORAGE_KEY, JSON.stringify(attempts));
  return attempts;
}

export function clearTaskThreeAttempts(
  storage: ClearStorage | undefined = browserStorage(),
): void {
  storage?.removeItem(TASK_THREE_ATTEMPT_STORAGE_KEY);
}
