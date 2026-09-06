import { describe, expect, it } from 'vitest';
import {
  CLASS_SIX_ADDITIONAL_MAXIMUM_SCORE,
  VT_LOCALIZATION_TASK_MAXIMUM_SCORE,
  classSixVtLocalizationCases,
  classSixVtLocalizationTeachingRules,
  findVtLocalizationCase,
  markVtLocalizationResponse,
} from '../assessment/task5/vtLocalizationPractice';

describe('Class 6 VT localisation Tasks 6-8', () => {
  it('promotes pages 19-21 to three separate four-mark tasks', () => {
    expect(classSixVtLocalizationCases.map((item) => ({
      task: item.assessmentTask,
      page: item.slidePage,
      answer: item.answer,
      finalInterpretation: item.finalInterpretation,
    }))).toEqual([
      {
        task: '6',
        page: 19,
        answer: {
          morphology: 'RBBB',
          verticalOrigin: 'Inferior',
          septalLateral: 'Septal',
          outflowClassification: 'Other',
        },
        finalInterpretation: 'Left-sided septal exit site.',
      },
      {
        task: '7',
        page: 20,
        answer: {
          morphology: 'RBBB',
          verticalOrigin: 'Superior',
          septalLateral: 'Lateral',
          outflowClassification: 'Other',
        },
        finalInterpretation: 'Basal anterolateral LV VT.',
      },
      {
        task: '8',
        page: 21,
        answer: {
          morphology: 'LBBB',
          verticalOrigin: 'Superior',
          septalLateral: 'Septal',
          outflowClassification: 'RVOT',
        },
        finalInterpretation: 'RVOT PVC.',
      },
    ]);
    expect(VT_LOCALIZATION_TASK_MAXIMUM_SCORE).toBe(4);
    expect(CLASS_SIX_ADDITIONAL_MAXIMUM_SCORE).toBe(12);
    expect(classSixVtLocalizationCases.length * VT_LOCALIZATION_TASK_MAXIMUM_SCORE)
      .toBe(CLASS_SIX_ADDITIONAL_MAXIMUM_SCORE);
    expect(findVtLocalizationCase('6').slidePage).toBe(19);
    expect(findVtLocalizationCase('7').slidePage).toBe(20);
    expect(findVtLocalizationCase('8').slidePage).toBe(21);
  });

  it('marks each of the four localisation decisions independently', () => {
    const expected = findVtLocalizationCase('6').answer;

    expect(markVtLocalizationResponse(expected, expected)).toEqual({
      score: 4,
      maximumScore: 4,
      fields: {
        morphology: true,
        verticalOrigin: true,
        septalLateral: true,
        outflowClassification: true,
      },
    });

    expect(markVtLocalizationResponse({
      morphology: 'RBBB',
      verticalOrigin: 'Superior',
      septalLateral: 'Septal',
      outflowClassification: 'Other',
    }, expected).score).toBe(3);
  });

  it('keeps the explanatory material as course guidance rather than extra assessment tasks', () => {
    expect(classSixVtLocalizationCases).toHaveLength(3);
    expect(classSixVtLocalizationTeachingRules).toHaveLength(6);
    expect(classSixVtLocalizationTeachingRules.join(' ')).toContain('V3 or later favours RVOT');
    expect(classSixVtLocalizationTeachingRules.join(' ')).toContain('maximum deflection index');
  });
});
