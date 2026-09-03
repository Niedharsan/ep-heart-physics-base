import { useEffect, useState } from 'react';
import { appHref } from '../appHref';
import {
  ASSESSMENT_SESSION_DURATION_MS,
  assessmentSessionKey,
  createAssessmentSession,
  parseAssessmentSession,
  remainingAssessmentMs,
  resolveAssessmentSession,
  submitAssessmentSession,
} from './sessionState';
import type {
  PersistedAssessmentMode,
  PersistedAssessmentSession,
  PersistedAssessmentStatus,
} from './sessionState';

export type SharedAssessmentMode = 'practice' | PersistedAssessmentMode;
export type AssessmentSubmitReason = 'manual' | 'timeout';

export interface AssessmentSessionController {
  readonly mode: SharedAssessmentMode;
  readonly timed: boolean;
  readonly started: boolean;
  readonly locked: boolean;
  readonly answerDisabled: boolean;
  readonly remainingMs: number;
  readonly status: 'practice' | 'not-started' | PersistedAssessmentStatus;
  readonly start: (nowMs: number) => void;
  readonly submit: (nowMs: number) => void;
}

interface UseAssessmentSessionControllerOptions {
  readonly mode: SharedAssessmentMode;
  readonly task: string;
  readonly onSubmit: (reason: AssessmentSubmitReason) => void;
  readonly onStart?: () => void;
}

const FINALIZED_PREFIX = 'ep-heart-assessment-finalized-v1';

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function finalizedKey(mode: PersistedAssessmentMode, task: string): string {
  return `${FINALIZED_PREFIX}:${mode}:${task}`;
}

function readInitialSession(
  mode: SharedAssessmentMode,
  task: string,
): PersistedAssessmentSession | null {
  if (mode === 'practice') return null;
  const storage = browserStorage();
  if (storage === null) return null;
  const parsed = parseAssessmentSession(storage.getItem(assessmentSessionKey(mode, task)));
  if (parsed === null) return null;
  const resolved = resolveAssessmentSession(parsed, Date.now());
  if (resolved !== parsed) {
    storage.setItem(assessmentSessionKey(mode, task), JSON.stringify(resolved));
  }
  return resolved;
}

function readFinalized(mode: SharedAssessmentMode, task: string): boolean {
  if (mode === 'practice') return false;
  return browserStorage()?.getItem(finalizedKey(mode, task)) === 'true';
}

function persistSession(session: PersistedAssessmentSession): void {
  browserStorage()?.setItem(
    assessmentSessionKey(session.mode, session.task),
    JSON.stringify(session),
  );
}

function persistFinalized(
  mode: PersistedAssessmentMode,
  task: string,
  finalized: boolean,
): void {
  const storage = browserStorage();
  if (storage === null) return;
  const key = finalizedKey(mode, task);
  if (finalized) storage.setItem(key, 'true');
  else storage.removeItem(key);
}

export function formatAssessmentRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildAssessmentHref(
  task: 'interval' | '1' | '2' | '3' | '4' | '5',
  instructor: boolean,
  mode: SharedAssessmentMode,
): string {
  const taskQuery = task === 'interval' ? '' : `&task=${task}`;
  const viewQuery = instructor ? '&view=instructor' : '';
  const modeQuery = mode === 'practice' ? '' : `&assessmentMode=${mode}`;
  return appHref(`mode=assessment${taskQuery}${viewQuery}${modeQuery}`);
}

export function useAssessmentSessionController({
  mode,
  task,
  onSubmit,
  onStart,
}: UseAssessmentSessionControllerOptions): AssessmentSessionController {
  const timed = mode !== 'practice';
  const [session, setSession] = useState<PersistedAssessmentSession | null>(
    () => readInitialSession(mode, task),
  );
  const [remainingMs, setRemainingMs] = useState(() => (
    session === null
      ? ASSESSMENT_SESSION_DURATION_MS
      : remainingAssessmentMs(session, Date.now())
  ));
  const [finalized, setFinalized] = useState(() => readFinalized(mode, task));

  useEffect(() => {
    if (!timed || session?.status !== 'expired' || finalized) return;
    const timer = window.setTimeout(() => {
      persistFinalized(session.mode, task, true);
      setFinalized(true);
      onSubmit('timeout');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [finalized, onSubmit, session, task, timed]);

  useEffect(() => {
    if (!timed || session?.status !== 'active') return;
    const timer = window.setInterval(() => {
      const nowMs = Date.now();
      const nextRemaining = remainingAssessmentMs(session, nowMs);
      setRemainingMs(nextRemaining);
      if (nextRemaining > 0) return;

      const expired = resolveAssessmentSession(session, nowMs);
      persistSession(expired);
      setSession(expired);
    }, 250);
    return () => window.clearInterval(timer);
  }, [session, timed]);

  const start = (nowMs: number): void => {
    if (!timed || session !== null) return;
    const nextSession = createAssessmentSession(mode, task, nowMs);
    persistFinalized(mode, task, false);
    setFinalized(false);
    persistSession(nextSession);
    onStart?.();
    setRemainingMs(ASSESSMENT_SESSION_DURATION_MS);
    setSession(nextSession);
  };

  const submit = (nowMs: number): void => {
    if (!timed) {
      onSubmit('manual');
      return;
    }
    if (
      session?.status !== 'active'
      || finalized
      || readFinalized(session.mode, task)
    ) return;

    onSubmit('manual');
    const submitted = submitAssessmentSession(session, nowMs);
    persistFinalized(session.mode, task, true);
    setFinalized(true);
    persistSession(submitted);
    setRemainingMs(0);
    setSession(submitted);
  };

  const status: AssessmentSessionController['status'] = !timed
    ? 'practice'
    : session === null
      ? 'not-started'
      : session.status;

  return {
    mode,
    timed,
    started: !timed || session !== null,
    locked: timed && session !== null && session.status !== 'active',
    answerDisabled: timed && (session === null || session.status !== 'active'),
    remainingMs,
    status,
    start,
    submit,
  };
}
