import { describe, expect, it } from 'vitest';
import { buildTaskFourFeedbackPackage } from '../assessment/task4/feedback';
import { taskFourClinicalRubric } from '../assessment/task4/clinicalRubric';
import { markTaskFour } from '../assessment/task4/marking';
import type { TaskFourResponses } from '../assessment/task4/marking';
import {
  clearTaskFourAttempts,
  loadTaskFourAttempts,
  saveTaskFourAttempt,
} from '../assessment/task4/store';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const completeResponses: TaskFourResponses = {
  'avrt-concentric': 'Orthodromic AVRT with concentric atrial activation, earliest atrial activation at the His, fixed VA interval and septal accessory pathway.',
  'avrt-eccentric': 'Orthodromic AVRT with eccentric atrial activation, earliest atrial activation at distal CS, fixed VA interval and left free wall accessory pathway.',
  'vaav-pattern': 'Ventricular overdrive pacing, paced slightly faster than the tachycardia, gives a VAAV response that supports atrial tachycardia because the atrium continues independently.',
  'vav-pattern': 'Ventricular overdrive pacing gives a VAV response, not atrial tachycardia, leaving AVNRT versus AVRT. Measure PPI from the last stimulus to return ventricular electrogram and calculate PPI minus TCL. Greater than 115 ms suggests AVNRT; less than 115 ms favours AVRT. Use a His refractory PVC and atrial advancement supports an accessory pathway.',
};

const result = markTaskFour(completeResponses, taskFourClinicalRubric);

describe('Task 4 persistence and feedback', () => {
  it('recovers safely from malformed local storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('ep-heart-task-four-attempts-v1', '{bad json');
    expect(loadTaskFourAttempts(storage)).toEqual([]);
  });

  it('stores the newest 20 attempts and clears them independently', () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 25; index += 1) {
      saveTaskFourAttempt({ id: `attempt-${index}`, createdAtIso: `2026-07-23T00:00:${String(index).padStart(2, '0')}Z`, result }, storage);
    }
    const attempts = loadTaskFourAttempts(storage);
    expect(attempts).toHaveLength(20);
    expect(attempts[0]?.id).toBe('attempt-24');
    clearTaskFourAttempts(storage);
    expect(loadTaskFourAttempts(storage)).toEqual([]);
  });

  it('builds feedback JSON without embedding the clinical rubric or answer keys', () => {
    const packageData = buildTaskFourFeedbackPackage({
      assessmentView: 'student',
      attemptId: 'attempt-1',
      createdAtIso: '2026-07-23T00:00:00Z',
      responses: completeResponses,
      result,
      notes: 'Check the pacing labels.',
      browser: 'test',
    });
    const json = JSON.stringify(packageData);
    expect(json).toContain('task-4-avrt-vaav-vav');
    expect(json).toContain('Check the pacing labels.');
    expect(json).not.toContain('acceptedStatements');
    expect(json).not.toContain('approvalStatus');
    expect(json).not.toContain('Answer key');
  });
});
