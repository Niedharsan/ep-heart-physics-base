import { describe, expect, it } from 'vitest';
import { taskThreeClinicalRubric } from '../assessment/task3/clinicalRubric';
import { buildTaskThreeFeedbackPackage } from '../assessment/task3/feedback';
import {
  createEmptyTaskThreeResponses,
  markTaskThree,
} from '../assessment/task3/marking';
import {
  clearTaskThreeAttempts,
  loadTaskThreeAttempts,
  saveTaskThreeAttempt,
  TASK_THREE_ATTEMPT_STORAGE_KEY,
  TASK_THREE_MAX_STORED_ATTEMPTS,
} from '../assessment/task3/store';

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

const emptyResponses = createEmptyTaskThreeResponses();
const emptyResult = markTaskThree(emptyResponses, taskThreeClinicalRubric);

function attempt(index: number) {
  return Object.freeze({
    id: `attempt-${index}`,
    createdAtIso: `2026-07-23T12:${String(index).padStart(2, '0')}:00.000Z`,
    result: emptyResult,
  });
}

describe('Task 3 persistence and feedback integration', () => {
  it('stores newest attempts first and enforces the 20-attempt limit', () => {
    const storage = new MemoryStorage();
    let attempts = loadTaskThreeAttempts(storage);
    for (let index = 0; index < 25; index += 1) {
      attempts = saveTaskThreeAttempt(attempt(index), storage);
    }
    expect(attempts).toHaveLength(TASK_THREE_MAX_STORED_ATTEMPTS);
    expect(attempts[0]?.id).toBe('attempt-24');
    expect(attempts.at(-1)?.id).toBe('attempt-5');
    expect(Object.isFrozen(attempts)).toBe(true);
    expect(Object.isFrozen(attempts[0]?.result)).toBe(true);
  });

  it('ignores malformed or structurally invalid browser data', () => {
    const storage = new MemoryStorage();
    storage.setItem(TASK_THREE_ATTEMPT_STORAGE_KEY, '{bad json');
    expect(loadTaskThreeAttempts(storage)).toEqual([]);
    storage.setItem(TASK_THREE_ATTEMPT_STORAGE_KEY, JSON.stringify([
      null,
      { id: 'broken', createdAtIso: 'now', result: { score: 99, maximumScore: 23 } },
      attempt(1),
    ]));
    expect(loadTaskThreeAttempts(storage).map((item) => item.id)).toEqual(['attempt-1']);
  });

  it('clears only the Task 3 attempt key', () => {
    const storage = new MemoryStorage();
    saveTaskThreeAttempt(attempt(1), storage);
    clearTaskThreeAttempts(storage);
    expect(loadTaskThreeAttempts(storage)).toEqual([]);
  });

  it('builds a deterministic feedback package without clinical answer keys', () => {
    const packageData = buildTaskThreeFeedbackPackage({
      assessmentView: 'student',
      attemptId: 'attempt-feedback',
      createdAtIso: '2026-07-23T12:00:00.000Z',
      responses: emptyResponses,
      result: emptyResult,
      notes: 'The second EGM label needs review.',
      browser: 'test-browser',
    });
    expect(packageData).toMatchObject({
      schemaVersion: 1,
      preview: 'EP Heart Task 3 assessment',
      assessmentView: 'student',
      attemptId: 'attempt-feedback',
      notes: 'The second EGM label needs review.',
    });
    expect(Object.isFrozen(packageData)).toBe(true);
    const serialized = JSON.stringify(packageData);
    expect(serialized).not.toContain('acceptedDiagnoses');
    expect(serialized).not.toContain('expectedSide');
    expect(serialized).not.toContain('clinicalRubric');
    expect(serialized).not.toContain('answer key');
  });
});
