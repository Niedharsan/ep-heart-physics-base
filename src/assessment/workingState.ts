import type { SharedAssessmentMode } from './sessionController';

const DRAFT_PREFIX = 'ep-heart-assessment-draft-v1';
const RESULT_PREFIX = 'ep-heart-assessment-result-v1';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function valueKey(
  prefix: string,
  mode: SharedAssessmentMode,
  task: string,
): string {
  return `${prefix}:${mode}:${task}`;
}

function readJson<T>(
  key: string,
  fallback: T,
  storage: ReadStorage | null,
): T {
  if (storage === null) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadAssessmentDraft<T>(
  mode: SharedAssessmentMode,
  task: string,
  fallback: T,
  storage: ReadStorage | null = browserStorage(),
): T {
  if (mode === 'practice') return fallback;
  return readJson(valueKey(DRAFT_PREFIX, mode, task), fallback, storage);
}

export function saveAssessmentDraft<T>(
  mode: SharedAssessmentMode,
  task: string,
  value: T,
  storage: WriteStorage | null = browserStorage(),
): void {
  if (mode === 'practice' || storage === null) return;
  storage.setItem(valueKey(DRAFT_PREFIX, mode, task), JSON.stringify(value));
}

export function loadAssessmentResult<T>(
  mode: SharedAssessmentMode,
  task: string,
  storage: ReadStorage | null = browserStorage(),
): T | null {
  if (mode === 'practice') return null;
  return readJson<T | null>(valueKey(RESULT_PREFIX, mode, task), null, storage);
}

export function saveAssessmentResult<T>(
  mode: SharedAssessmentMode,
  task: string,
  value: T | null,
  storage: WriteStorage | null = browserStorage(),
): void {
  if (mode === 'practice' || storage === null) return;
  const key = valueKey(RESULT_PREFIX, mode, task);
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(value));
}

export function clearAssessmentWorkingState(
  mode: SharedAssessmentMode,
  task: string,
  storage: WriteStorage | null = browserStorage(),
): void {
  if (mode === 'practice' || storage === null) return;
  storage.removeItem(valueKey(DRAFT_PREFIX, mode, task));
  storage.removeItem(valueKey(RESULT_PREFIX, mode, task));
}
