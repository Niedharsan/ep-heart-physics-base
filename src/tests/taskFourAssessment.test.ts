import { describe, expect, it } from 'vitest';
import {
  TASK_FOUR_MAXIMUM_SCORE,
  taskFourAssessmentContract,
  taskFourCases,
  taskFourSectionAllocation,
} from '../assessment/task4/catalog';
import { taskFourClinicalRubric } from '../assessment/task4/clinicalRubric';
import {
  markTaskFour,
  validateTaskFourRubric,
} from '../assessment/task4/marking';
import type { TaskFourResponses, TaskFourRubric } from '../assessment/task4/marking';

const completeResponses: TaskFourResponses = Object.freeze({
  'avrt-concentric': 'Orthodromic AVRT with concentric retrograde atrial activation, earliest atrial activation at the His, a fixed VA interval and a septal accessory pathway.',
  'avrt-eccentric': 'Orthodromic AVRT with eccentric retrograde atrial activation and distal to proximal CS activation. Earliest atrial activation is at CS 1-2, with a fixed VA interval and a left free wall accessory pathway.',
  'vaav-pattern': 'Ventricular overdrive pacing is delivered with a pacing cycle length shorter than the tachycardia cycle length. The VAAV response supports atrial tachycardia because two atrial activations occur before the return ventricle.',
  'vav-pattern': 'Ventricular overdrive pacing produces a VAV response, argues against atrial tachycardia and leaves AVNRT versus AVRT. Measure the post pacing interval from the last stimulus to the return ventricular beat and calculate PPI minus TCL. PPI-TCL greater than 115 ms favours AVNRT, while less than 115 ms favours AVRT. Deliver a His refractory PVC; atrial advancement supports an accessory pathway.',
});

const emptyResponses: TaskFourResponses = Object.freeze({
  'avrt-concentric': '',
  'avrt-eccentric': '',
  'vaav-pattern': '',
  'vav-pattern': '',
});

describe('Task 4 assessment', () => {
  it('preserves the source allocation and exact 25-mark ceiling', () => {
    expect(taskFourCases.map((item) => [item.id, item.maximumScore])).toEqual([
      ['avrt-concentric', 5],
      ['avrt-eccentric', 5],
      ['vaav-pattern', 5],
      ['vav-pattern', 10],
    ]);
    expect(Object.values(taskFourSectionAllocation).reduce((total, score) => total + score, 0)).toBe(25);
    expect(taskFourAssessmentContract.maximumScore).toBe(TASK_FOUR_MAXIMUM_SCORE);
    expect(markTaskFour(completeResponses, taskFourClinicalRubric)).toMatchObject({ score: 25, maximumScore: 25 });
  });

  it('returns zero without silently awarding unanswered content', () => {
    const result = markTaskFour(emptyResponses, taskFourClinicalRubric);
    expect(result.score).toBe(0);
    expect(Object.values(result.sections).every((section) => section.score === 0)).toBe(true);
  });

  it('scores every section independently', () => {
    const result = markTaskFour({ ...emptyResponses, 'vaav-pattern': completeResponses['vaav-pattern'] }, taskFourClinicalRubric);
    expect(result.score).toBe(5);
    expect(result.sections['vaav-pattern']).toMatchObject({ score: 5, maximumScore: 5 });
    expect(result.sections['vav-pattern']).toMatchObject({ score: 0, maximumScore: 10 });
  });

  it('requires the exact criterion count for every source-defined section', () => {
    const malformedRubric = {
      ...taskFourClinicalRubric,
      sections: {
        ...taskFourClinicalRubric.sections,
        'vav-pattern': taskFourClinicalRubric.sections['vav-pattern'].slice(0, 9),
      },
    } as TaskFourRubric;
    expect(() => validateTaskFourRubric(malformedRubric)).toThrow(/exactly 10/i);
  });

  it('refuses an unapproved rubric', () => {
    const unapprovedRubric = {
      ...taskFourClinicalRubric,
      approvalStatus: 'draft',
    } as unknown as TaskFourRubric;
    expect(() => markTaskFour(completeResponses, unapprovedRubric)).toThrow(/domain-approved/i);
  });

  it('is deterministic and cannot exceed 25 marks', () => {
    const first = markTaskFour(completeResponses, taskFourClinicalRubric);
    const second = markTaskFour(completeResponses, taskFourClinicalRubric);
    expect(second).toEqual(first);
    expect(first.score).toBeLessThanOrEqual(25);
  });
});
