import { describe, expect, it } from 'vitest';
import {
  clearAssessmentWorkingState,
  loadAssessmentDraft,
  loadAssessmentResult,
  saveAssessmentDraft,
  saveAssessmentResult,
} from '../assessment/workingState';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('assessment working-state persistence', () => {
  it('round-trips timed drafts and results without affecting practice', () => {
    const storage = new MemoryStorage();
    const draft = { answer: 'AVNRT', explanation: 'short RP' };
    const result = { score: 3, maximumScore: 3 };

    saveAssessmentDraft('mock', '3', draft, storage);
    saveAssessmentResult('mock', '3', result, storage);

    expect(loadAssessmentDraft('mock', '3', { answer: '' }, storage)).toEqual(draft);
    expect(loadAssessmentResult('mock', '3', storage)).toEqual(result);
    expect(loadAssessmentDraft('practice', '3', { answer: 'practice' }, storage)).toEqual({
      answer: 'practice',
    });

    clearAssessmentWorkingState('mock', '3', storage);
    expect(loadAssessmentDraft('mock', '3', { answer: '' }, storage)).toEqual({ answer: '' });
    expect(loadAssessmentResult('mock', '3', storage)).toBeNull();
  });
});
