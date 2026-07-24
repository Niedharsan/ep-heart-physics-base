import { describe, expect, it } from 'vitest';
import {
  TASK_FIVE_MAXIMUM_SCORE,
  taskFiveAssessmentContract,
  taskFiveCases,
  taskFiveSectionAllocation,
} from '../assessment/task5/catalog';
import { taskFiveClinicalRubric } from '../assessment/task5/clinicalRubric';
import {
  markTaskFive,
  markTaskFiveSection,
  validateTaskFiveRubric,
} from '../assessment/task5/marking';
import type { TaskFiveResponses, TaskFiveRubric } from '../assessment/task5/marking';

const completeResponses: TaskFiveResponses = Object.freeze({
  'vt-rvot': 'This is RVOT VT with LBBB morphology with inferior axis.',
  'vt-fascicular': 'This is left posterior fascicular VT with RBBB morphology and left axis deviation.',
  'para-hisian': [
    'Pacing near the His bundle is performed.',
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
});

describe('Task 5 assessment marking', () => {
  it('preserves the supplied 5 plus 10 mark allocation and exact 15-mark ceiling', () => {
    expect(taskFiveCases.map((item) => item.maximumScore)).toEqual([2, 3, 10]);
    expect(Object.values(taskFiveSectionAllocation).reduce((total, score) => total + score, 0)).toBe(15);
    expect(taskFiveAssessmentContract.maximumScore).toBe(TASK_FIVE_MAXIMUM_SCORE);
    expect(markTaskFive(completeResponses, taskFiveClinicalRubric)).toMatchObject({
      score: 15,
      maximumScore: 15,
    });
  });

  it('scores each VT diagnosis and morphology concept independently', () => {
    const partial: TaskFiveResponses = {
      ...completeResponses,
      'vt-rvot': 'RVOT VT without a morphology statement.',
      'vt-fascicular': 'Fascicular VT with RBBB morphology but no axis statement.',
    };
    const result = markTaskFive(partial, taskFiveClinicalRubric);
    expect(result.sections['vt-rvot'].score).toBe(1);
    expect(result.sections['vt-fascicular'].score).toBe(2);
  });

  it('requires ten independent para-Hisian concepts', () => {
    expect(taskFiveClinicalRubric.sections['para-hisian']).toHaveLength(10);
    const result = markTaskFive({ ...completeResponses, 'para-hisian': 'Accessory pathway response.' }, taskFiveClinicalRubric);
    expect(result.sections['para-hisian'].score).toBe(1);
    expect(result.sections['para-hisian'].maximumScore).toBe(10);
  });

  it('refuses a rubric that is not explicitly domain approved', () => {
    const unapproved = {
      ...taskFiveClinicalRubric,
      approvalStatus: 'requires-domain-approval',
    } as unknown as TaskFiveRubric;
    expect(() => validateTaskFiveRubric(unapproved)).toThrow(/domain-approved/i);
  });

  it('uses phrase boundaries instead of matching inside longer tokens', () => {
    const criterion = taskFiveClinicalRubric.sections['vt-rvot'][0];
    expect(criterion).toBeDefined();
    expect(markTaskFiveSection('The term rvotive is not a diagnosis.', criterion ? [criterion] : []).score).toBe(0);
  });

  it('is deterministic and cannot exceed 15 marks', () => {
    const first = markTaskFive(completeResponses, taskFiveClinicalRubric);
    const second = markTaskFive(completeResponses, taskFiveClinicalRubric);
    expect(first).toEqual(second);
    expect(first.score).toBeLessThanOrEqual(first.maximumScore);
  });
});
