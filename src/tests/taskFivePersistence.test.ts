import { describe, expect, it } from 'vitest';
import { buildTaskFiveFeedbackPackage } from '../assessment/task5/feedback';
import { taskFiveClinicalRubric } from '../assessment/task5/clinicalRubric';
import { markTaskFive } from '../assessment/task5/marking';
import type { TaskFiveResponses } from '../assessment/task5/marking';
import {
  clearTaskFiveAttempts,
  loadTaskFiveAttempts,
  saveTaskFiveAttempt,
} from '../assessment/task5/store';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const completeResponses: TaskFiveResponses = {
  'vt-rvot': 'RVOT VT with LBBB morphology with inferior axis.',
  'vt-fascicular': 'Left posterior fascicular VT with RBBB morphology and left axis deviation.',
  'para-hisian': [
    'Pacing near the His bundle.',
    'High output captures the ventricle and His bundle.',
    'Reduce output to lose His capture while maintaining ventricular capture.',
    'QRS widens when His capture is lost.',
    'Compare stimulus to atrial intervals.',
    'Compare the retrograde atrial activation sequence.',
    'Unchanged SA interval and atrial sequence supports an accessory pathway.',
    'SA prolongation with unchanged atrial sequence supports AV nodal conduction.',
    'Change in atrial activation sequence indicates both accessory pathway and AV nodal conduction.',
    'AV nodal conduction can mask a distant accessory pathway.',
  ].join(' '),
};

const result = markTaskFive(completeResponses, taskFiveClinicalRubric);

describe('Task 5 persistence and feedback', () => {
  it('recovers safely from malformed or unavailable browser storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('ep-heart-task-five-attempts-v1', '{bad json');
    expect(loadTaskFiveAttempts(storage)).toEqual([]);
    expect(loadTaskFiveAttempts(null)).toEqual([]);
  });

  it('stores the newest 20 attempts and clears Task 5 independently', () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 25; index += 1) {
      saveTaskFiveAttempt({
        id: `attempt-${index}`,
        createdAtIso: `2026-07-23T00:00:${String(index).padStart(2, '0')}Z`,
        result,
      }, storage);
    }
    const attempts = loadTaskFiveAttempts(storage);
    expect(attempts).toHaveLength(20);
    expect(attempts[0]?.id).toBe('attempt-24');
    clearTaskFiveAttempts(storage);
    expect(loadTaskFiveAttempts(storage)).toEqual([]);
  });

  it('builds feedback JSON without embedding rubric or answer-key fields', () => {
    const packageData = buildTaskFiveFeedbackPackage({
      assessmentView: 'student',
      attemptId: 'attempt-1',
      createdAtIso: '2026-07-23T00:00:00Z',
      responses: completeResponses,
      result,
      notes: 'Review the morphology labels.',
      browser: 'test-browser',
    });
    const json = JSON.stringify(packageData);
    expect(json).toContain('task-5-vt-para-hisian');
    expect(json).toContain('Review the morphology labels.');
    expect(json).not.toContain('acceptedStatements');
    expect(json).not.toContain('evidenceBoundary');
    expect(json).not.toContain('instructor-answer-key');
    expect(json).not.toContain('rubricVersion');
  });
});
