import { describe, expect, it } from 'vitest';
import { resolveAssessmentMode } from '../assessment/AssessmentApp';

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
});
