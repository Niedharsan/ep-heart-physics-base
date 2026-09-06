import { describe, expect, it } from 'vitest';
import {
  classSixVtLocalizationCases,
  classSixVtLocalizationTeachingRules,
  markVtLocalizationResponse,
} from '../assessment/task5/vtLocalizationPractice';

describe('Class 6 VT localisation practice', () => {
  it('preserves the three slide cases and their worked answers', () => {
    expect(classSixVtLocalizationCases.map((item) => ({
      page: item.slidePage,
      answer: item.answer,
      finalInterpretation: item.finalInterpretation,
    }))).toEqual([
      {
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
  });

  it('marks each of the four localisation decisions independently', () => {
    const expectedCase = classSixVtLocalizationCases.find((item) => item.slidePage === 19);
    if (!expectedCase) throw new Error('Class 6 page 19 case is required.');
    const expected = expectedCase.answer;

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

  it('keeps the explanatory material as course guidance rather than extra assessment cases', () => {
    expect(classSixVtLocalizationCases).toHaveLength(3);
    expect(classSixVtLocalizationTeachingRules).toHaveLength(6);
    expect(classSixVtLocalizationTeachingRules.join(' ')).toContain('V3 or later favours RVOT');
    expect(classSixVtLocalizationTeachingRules.join(' ')).toContain('maximum deflection index');
  });
});
