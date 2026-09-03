import { describe, expect, it } from 'vitest';
import {
  resolveAssessmentMode,
  resolveAssessmentTask,
  resolveAssessmentViewForMode,
} from '../assessment/assessmentRouting';
import { buildAssessmentHref } from '../assessment/sessionController';

describe('assessment mode routing', () => {
  it('defaults to practice mode', () => {
    expect(resolveAssessmentMode('?mode=assessment')).toBe('practice');
  });

  it('resolves the timed mock and real exam modes', () => {
    expect(resolveAssessmentMode('?mode=assessment&assessmentMode=mock')).toBe('mock');
    expect(resolveAssessmentMode('?mode=assessment&assessmentMode=exam')).toBe('exam');
  });

  it('rejects unknown values by returning practice mode', () => {
    expect(resolveAssessmentMode('?mode=assessment&assessmentMode=other')).toBe('practice');
  });

  it('preserves timed mode and instructor view in assessment navigation', () => {
    expect(buildAssessmentHref('1', false, 'mock'))
      .toBe('/?mode=assessment&task=1&assessmentMode=mock');
    expect(buildAssessmentHref('interval', true, 'exam'))
      .toBe('/?mode=assessment&view=instructor&assessmentMode=exam');
  });

  it('resolves known tasks and defaults unknown tasks to the interval trainer', () => {
    expect(resolveAssessmentTask('?mode=assessment&task=5')).toBe('5');
    expect(resolveAssessmentTask('?mode=assessment&task=unknown')).toBe('interval');
  });

  it('never exposes instructor answers from timed-mode URL parameters', () => {
    expect(resolveAssessmentViewForMode('practice', 'instructor')).toBe('instructor');
    expect(resolveAssessmentViewForMode('mock', 'instructor')).toBe('student');
    expect(resolveAssessmentViewForMode('exam', 'instructor')).toBe('student');
  });
});
