import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_SESSION_DURATION_MS,
  assessmentSessionKey,
  createAssessmentSession,
  parseAssessmentSession,
  remainingAssessmentMs,
  resolveAssessmentSession,
  submitAssessmentSession,
} from '../assessment/sessionState';

describe('persistent assessment sessions', () => {
  it('creates a fixed twenty-minute deadline', () => {
    const session = createAssessmentSession('mock', '1', 1_000);
    expect(session.deadlineMs).toBe(1_000 + ASSESSMENT_SESSION_DURATION_MS);
    expect(remainingAssessmentMs(session, 2_000)).toBe(ASSESSMENT_SESSION_DURATION_MS - 1_000);
  });

  it('expires from the original deadline rather than extending on reload', () => {
    const session = createAssessmentSession('exam', '2', 5_000);
    const expired = resolveAssessmentSession(session, session.deadlineMs + 20_000);
    expect(expired.status).toBe('expired');
    expect(expired.finishedAtMs).toBe(session.deadlineMs);
  });

  it('locks submitted sessions and preserves the finishing time', () => {
    const session = createAssessmentSession('mock', 'interval', 0);
    const submitted = submitAssessmentSession(session, 10_000);
    expect(submitted.status).toBe('submitted');
    expect(submitAssessmentSession(submitted, 20_000)).toEqual(submitted);
  });

  it('uses separate storage keys and rejects malformed data', () => {
    expect(assessmentSessionKey('mock', '1')).not.toBe(assessmentSessionKey('exam', '1'));
    expect(parseAssessmentSession('{bad')).toBeNull();
    expect(parseAssessmentSession(JSON.stringify(createAssessmentSession('mock', '1', 0)))?.status).toBe('active');
  });
});
