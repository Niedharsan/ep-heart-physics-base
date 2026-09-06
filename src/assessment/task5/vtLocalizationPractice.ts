export type VtMorphology = 'RBBB' | 'LBBB';
export type VtVerticalOrigin = 'Superior' | 'Inferior';
export type VtSeptalLateral = 'Septal' | 'Lateral';
export type VtOutflowClassification = 'RVOT' | 'LVOT' | 'Other';

export interface VtLocalizationResponse {
  readonly morphology: VtMorphology | '';
  readonly verticalOrigin: VtVerticalOrigin | '';
  readonly septalLateral: VtSeptalLateral | '';
  readonly outflowClassification: VtOutflowClassification | '';
}

export interface VtLocalizationCase {
  readonly id: 'class6-page19' | 'class6-page20' | 'class6-page21';
  readonly slidePage: 19 | 20 | 21;
  readonly title: string;
  readonly answer: Readonly<Required<VtLocalizationResponse>>;
  readonly finalInterpretation: string;
  readonly rationale: readonly string[];
  readonly sourceBoundary: string;
}

export interface VtLocalizationMark {
  readonly score: number;
  readonly maximumScore: 4;
  readonly fields: Readonly<{
    morphology: boolean;
    verticalOrigin: boolean;
    septalLateral: boolean;
    outflowClassification: boolean;
  }>;
}

export const EMPTY_VT_LOCALIZATION_RESPONSE: VtLocalizationResponse = Object.freeze({
  morphology: '',
  verticalOrigin: '',
  septalLateral: '',
  outflowClassification: '',
});

export const classSixVtLocalizationTeachingRules = Object.freeze([
  'Precordial morphology: use V1 and V6 to identify an LBBB- or RBBB-type pattern. In this course framework, LBBB morphology supports a right-sided/RV origin and RBBB morphology supports a left-sided/LV origin.',
  'Precordial concordance across V1-V6 is an additional localisation clue; the page 20 worked example uses concordance to support a basal origin.',
  'Inferior leads II, III and aVF: the course examples use negative complexes to support an inferior origin and positive complexes to support a high/superior origin.',
  'aVR and aVL: concordant polarity is taught as septal, whereas discordant polarity is taught as lateral.',
  'Outflow-tract PVCs: positive inferior-lead QRS complexes support an outflow-tract origin. A precordial transition at V3 or later favours RVOT; an earlier transition favours LVOT.',
  'Epicardial clue: a slurred initial QRS and a maximum deflection index (QRS onset to maximum deflection divided by QRS duration) of at least 0.55 are presented as epicardial features.',
] as const);

export const classSixVtLocalizationCases: readonly VtLocalizationCase[] = Object.freeze([
  Object.freeze({
    id: 'class6-page19',
    slidePage: 19,
    title: 'Class 6 ECG practice · case 1',
    answer: Object.freeze({
      morphology: 'RBBB',
      verticalOrigin: 'Inferior',
      septalLateral: 'Septal',
      outflowClassification: 'Other',
    }),
    finalInterpretation: 'Left-sided septal exit site.',
    rationale: Object.freeze([
      'RBBB morphology supports a left-sided/LV origin in the deck teaching scheme.',
      'Negative inferior-lead complexes support an inferior origin.',
      'aVR and aVL are concordant and positive, supporting a septal location.',
      'The slide answer is a left-sided septal exit site, so the RVOT/LVOT/Other choice is Other.',
    ]),
    sourceBoundary: 'Answer key follows the speaker notes on page 19 of EP class 6.pptx.',
  }),
  Object.freeze({
    id: 'class6-page20',
    slidePage: 20,
    title: 'Class 6 ECG practice · case 2',
    answer: Object.freeze({
      morphology: 'RBBB',
      verticalOrigin: 'Superior',
      septalLateral: 'Lateral',
      outflowClassification: 'Other',
    }),
    finalInterpretation: 'Basal anterolateral LV VT.',
    rationale: Object.freeze([
      'RBBB morphology supports an LV origin.',
      'Precordial concordance is used in the speaker notes to support a basal origin.',
      'Positive inferior leads support a high/superior origin.',
      'Discordant aVR/aVL support a lateral location; the worked answer is basal anterolateral LV VT, so the RVOT/LVOT/Other choice is Other.',
    ]),
    sourceBoundary: 'Answer key follows the speaker notes on page 20 of EP class 6.pptx.',
  }),
  Object.freeze({
    id: 'class6-page21',
    slidePage: 21,
    title: 'Class 6 ECG practice · case 3',
    answer: Object.freeze({
      morphology: 'LBBB',
      verticalOrigin: 'Superior',
      septalLateral: 'Septal',
      outflowClassification: 'RVOT',
    }),
    finalInterpretation: 'RVOT PVC.',
    rationale: Object.freeze([
      'The displayed PVC has an LBBB-type precordial pattern, supporting a right-sided/RV origin in the course framework.',
      'The PVC is positive in the inferior leads, supporting a high/outflow-tract origin.',
      'aVR and aVL are concordant in the displayed PVC, which the deck teaching rule classifies as septal.',
      'The speaker notes identify a V3/V4 transition and conclude RVOT.',
    ]),
    sourceBoundary: 'Page 21 speaker notes explicitly identify positive inferior PVCs as outflow-tract and the V3/V4 transition as RVOT. Morphology and septal/lateral are derived from the displayed trace using the deck rules on pages 13-17.',
  }),
] as const);

export function markVtLocalizationResponse(
  response: VtLocalizationResponse,
  expected: Readonly<Required<VtLocalizationResponse>>,
): VtLocalizationMark {
  const fields = Object.freeze({
    morphology: response.morphology === expected.morphology,
    verticalOrigin: response.verticalOrigin === expected.verticalOrigin,
    septalLateral: response.septalLateral === expected.septalLateral,
    outflowClassification: response.outflowClassification === expected.outflowClassification,
  });

  const score = Object.values(fields).filter(Boolean).length;
  return Object.freeze({ score, maximumScore: 4, fields });
}
