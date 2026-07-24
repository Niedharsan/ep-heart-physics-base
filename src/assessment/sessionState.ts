export type PersistedAssessmentMode = 'mock' | 'exam';
export type PersistedAssessmentStatus = 'active' | 'submitted' | 'expired';

export interface PersistedAssessmentSession {
  readonly schemaVersion: 1;
  readonly mode: PersistedAssessmentMode;
  readonly task: string;
  readonly startedAtMs: number;
  readonly deadlineMs: number;
  readonly status: PersistedAssessmentStatus;
  readonly finishedAtMs?: number;
}

export const ASSESSMENT_SESSION_DURATION_MS = 20 * 60 * 1000;
export const ASSESSMENT_SESSION_STORAGE_PREFIX = 'ep-heart-assessment-session-v1';

export function assessmentSessionKey(mode: PersistedAssessmentMode, task: string): string {
  return `${ASSESSMENT_SESSION_STORAGE_PREFIX}:${mode}:${task}`;
}

export function createAssessmentSession(
  mode: PersistedAssessmentMode,
  task: string,
  nowMs: number,
): PersistedAssessmentSession {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error('Session start time must be finite and non-negative.');
  return Object.freeze({
    schemaVersion: 1,
    mode,
    task,
    startedAtMs: nowMs,
    deadlineMs: nowMs + ASSESSMENT_SESSION_DURATION_MS,
    status: 'active',
  });
}

export function resolveAssessmentSession(
  session: PersistedAssessmentSession,
  nowMs: number,
): PersistedAssessmentSession {
  if (session.status !== 'active' || nowMs < session.deadlineMs) return session;
  return Object.freeze({
    ...session,
    status: 'expired',
    finishedAtMs: session.deadlineMs,
  });
}

export function submitAssessmentSession(
  session: PersistedAssessmentSession,
  nowMs: number,
): PersistedAssessmentSession {
  const resolved = resolveAssessmentSession(session, nowMs);
  if (resolved.status !== 'active') return resolved;
  return Object.freeze({
    ...resolved,
    status: 'submitted',
    finishedAtMs: nowMs,
  });
}

export function remainingAssessmentMs(session: PersistedAssessmentSession, nowMs: number): number {
  return session.status === 'active' ? Math.max(0, session.deadlineMs - nowMs) : 0;
}

export function parseAssessmentSession(raw: string | null): PersistedAssessmentSession | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PersistedAssessmentSession>;
    if (
      value.schemaVersion !== 1
      || (value.mode !== 'mock' && value.mode !== 'exam')
      || typeof value.task !== 'string'
      || !Number.isFinite(value.startedAtMs)
      || !Number.isFinite(value.deadlineMs)
      || (value.status !== 'active' && value.status !== 'submitted' && value.status !== 'expired')
    ) return null;
    return Object.freeze(value as PersistedAssessmentSession);
  } catch {
    return null;
  }
}
