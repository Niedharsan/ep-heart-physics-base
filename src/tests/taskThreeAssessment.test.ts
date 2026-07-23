import { describe, expect, it } from 'vitest';
import {
  TASK_THREE_MAXIMUM_SCORE,
  taskThreeAssessmentContract,
  taskThreeSectionAllocation,
} from '../assessment/task3/catalog';
import {
  countWords,
  markAhJump,
  markAtrialTachycardia,
  markTaskThree,
  markWrittenResponse,
  validateTaskThreeRubric,
} from '../assessment/task3/marking';
import type {
  TaskThreeClinicalRubric,
  TaskThreeResponses,
  TextCriterion,
} from '../assessment/task3/marking';

const criterion = (id: string, statement: string): TextCriterion => Object.freeze({
  id,
  label: id,
  acceptedStatements: Object.freeze([statement]),
});

const approvedFixtureRubric: TaskThreeClinicalRubric = Object.freeze({
  rubricVersion: 1,
  approvalStatus: 'domain-approved',
  atrialTachycardia: Object.freeze({
    'at-1': Object.freeze({ acceptedDiagnoses: Object.freeze(['Focal atrial tachycardia']), expectedSide: 'left' }),
    'at-2': Object.freeze({ acceptedDiagnoses: Object.freeze(['Focal atrial tachycardia']), expectedSide: 'right' }),
    'at-3': Object.freeze({ acceptedDiagnoses: Object.freeze(['Atrial tachycardia']), expectedSide: 'left' }),
  }),
  ahJump: Object.freeze({
    'ah-jump-below-50': Object.freeze({ expectedAhJump: true, expectedThresholdClass: 'below-50-ms' }),
    'ah-jump-above-50': Object.freeze({ expectedAhJump: true, expectedThresholdClass: 'above-50-ms' }),
  }),
  cannonWaveCriteria: Object.freeze([
    criterion('cannon-1', 'atrium contracts against a closed atrioventricular valve'),
    criterion('cannon-2', 'right atrial pressure rises'),
    criterion('cannon-3', 'large jugular venous pulsation'),
    criterion('cannon-4', 'atrioventricular dissociation'),
    criterion('cannon-5', 'intermittent when atrial and ventricular contraction coincide'),
  ]),
  adenosineCriteria: Object.freeze([
    criterion('adenosine-1', 'transient atrioventricular nodal block'),
    criterion('adenosine-2', 'terminates atrioventricular node dependent tachycardia'),
    criterion('adenosine-3', 'rapid intravenous bolus'),
    criterion('adenosine-4', 'very short half life'),
    criterion('adenosine-5', 'continuous electrocardiographic monitoring'),
  ]),
  avnrtEcg: Object.freeze({
    acceptedDiagnoses: Object.freeze(['AVNRT', 'atrioventricular nodal reentrant tachycardia']),
    expectedPathway: 'slow',
    explanationCriterion: criterion('avnrt-rationale', 'retrograde atrial activation is close to the qrs'),
  }),
});

const completeResponses: TaskThreeResponses = Object.freeze({
  atrialTachycardia: Object.freeze({
    'at-1': Object.freeze({ diagnosis: 'Focal atrial tachycardia', side: 'left' }),
    'at-2': Object.freeze({ diagnosis: 'Focal atrial tachycardia', side: 'right' }),
    'at-3': Object.freeze({ diagnosis: 'Atrial tachycardia', side: 'left' }),
  }),
  ahJump: Object.freeze({
    'ah-jump-below-50': Object.freeze({ identifiesAhJump: true, thresholdClass: 'below-50-ms' }),
    'ah-jump-above-50': Object.freeze({ identifiesAhJump: true, thresholdClass: 'above-50-ms' }),
  }),
  cannonWave: 'A cannon wave occurs when the atrium contracts against a closed atrioventricular valve. Right atrial pressure rises, producing a large jugular venous pulsation. It reflects atrioventricular dissociation and may be intermittent when atrial and ventricular contraction coincide.',
  adenosine: 'Adenosine produces transient atrioventricular nodal block. It terminates atrioventricular node dependent tachycardia. Give it as a rapid intravenous bolus because it has a very short half life, with continuous electrocardiographic monitoring during administration.',
  avnrtEcg: Object.freeze({
    diagnosis: 'AVNRT',
    pathway: 'slow',
    explanation: 'Retrograde atrial activation is close to the QRS.',
  }),
});

describe('Task 3 assessment foundation', () => {
  it('preserves the assessment allocation and exact 23-mark ceiling', () => {
    expect(Object.values(taskThreeSectionAllocation).reduce((total, score) => total + score, 0)).toBe(23);
    expect(taskThreeAssessmentContract.maximumScore).toBe(TASK_THREE_MAXIMUM_SCORE);
    expect(markTaskThree(completeResponses, approvedFixtureRubric)).toMatchObject({
      score: 23,
      maximumScore: 23,
    });
  });

  it('scores each atrial-tachycardia diagnosis and side independently', () => {
    expect(markAtrialTachycardia(
      completeResponses.atrialTachycardia,
      approvedFixtureRubric.atrialTachycardia,
    )).toMatchObject({ score: 6, maximumScore: 6 });

    expect(markAtrialTachycardia({
      ...completeResponses.atrialTachycardia,
      'at-2': { diagnosis: 'Focal atrial tachycardia', side: 'left' },
    }, approvedFixtureRubric.atrialTachycardia).score).toBe(5);
  });

  it('scores AH-jump presence and the 50 ms threshold separately', () => {
    expect(markAhJump(completeResponses.ahJump, approvedFixtureRubric.ahJump))
      .toMatchObject({ score: 4, maximumScore: 4 });

    expect(markAhJump({
      ...completeResponses.ahJump,
      'ah-jump-above-50': { identifiesAhJump: true, thresholdClass: 'below-50-ms' },
    }, approvedFixtureRubric.ahJump).score).toBe(3);
  });

  it('counts words without using word count as an unstated scoring gate', () => {
    const shortCompleteAnswer = approvedFixtureRubric.cannonWaveCriteria
      .map((item) => item.acceptedStatements[0])
      .join('. ');
    const result = markWrittenResponse(shortCompleteAnswer, approvedFixtureRubric.cannonWaveCriteria);
    expect(result.score).toBe(5);
    expect(result.wordCount).toBe(countWords(shortCompleteAnswer));
    expect(result.targetWordCount).toBe(50);
  });

  it('requires exactly five one-mark criteria for each 50-word response', () => {
    const malformedRubric = {
      ...approvedFixtureRubric,
      cannonWaveCriteria: approvedFixtureRubric.cannonWaveCriteria.slice(0, 4),
    } as TaskThreeClinicalRubric;
    expect(() => validateTaskThreeRubric(malformedRubric)).toThrow(/exactly five/i);
  });

  it('refuses to mark against a rubric that is not explicitly domain approved', () => {
    const unapprovedRubric = {
      ...approvedFixtureRubric,
      approvalStatus: 'draft',
    } as unknown as TaskThreeClinicalRubric;
    expect(() => markTaskThree(completeResponses, unapprovedRubric)).toThrow(/domain-approved/i);
  });

  it('is deterministic and cannot exceed 23 marks', () => {
    const first = markTaskThree(completeResponses, approvedFixtureRubric);
    const second = markTaskThree(completeResponses, approvedFixtureRubric);
    expect(second).toEqual(first);
    expect(first.score).toBeLessThanOrEqual(23);
  });
});
