export const TASK_FIVE_MAXIMUM_SCORE = 15 as const;

export type TaskFiveCaseId =
  | 'vt-rvot'
  | 'vt-fascicular'
  | 'para-hisian';

export type TaskFiveTraceId =
  | 'wide-complex-ecg-case-1'
  | 'wide-complex-ecg-case-2'
  | 'paired-pacing-egm-case';

export interface TaskFiveItemContract {
  readonly id: TaskFiveCaseId;
  readonly prompt: string;
  readonly maximumScore: number;
  readonly rubricStatus: 'domain-approved';
  readonly traceId: TaskFiveTraceId;
}

export const taskFiveCases = Object.freeze([
  Object.freeze({
    id: 'vt-rvot',
    prompt: 'Interpret ECG case 1: identify the most likely ventricular-tachycardia subtype or origin and state the key morphology supporting it.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'wide-complex-ecg-case-1',
  }),
  Object.freeze({
    id: 'vt-fascicular',
    prompt: 'Interpret ECG case 2: identify the most likely ventricular-tachycardia subtype or origin and describe the bundle-branch pattern and frontal-plane axis.',
    maximumScore: 3,
    rubricStatus: 'domain-approved',
    traceId: 'wide-complex-ecg-case-2',
  }),
  Object.freeze({
    id: 'para-hisian',
    prompt: 'Describe the para-Hisian pacing manoeuvre shown and interpret the retrograde response. Include the capture transition, timing and activation-sequence comparisons, the principal response patterns and an important limitation.',
    maximumScore: 10,
    rubricStatus: 'domain-approved',
    traceId: 'paired-pacing-egm-case',
  }),
] satisfies readonly TaskFiveItemContract[]);

export const taskFiveSectionAllocation: Readonly<Record<TaskFiveCaseId, number>> = Object.freeze({
  'vt-rvot': 2,
  'vt-fascicular': 3,
  'para-hisian': 10,
});

const calculatedItemMaximumScore = taskFiveCases
  .reduce((total, item) => total + item.maximumScore, 0);
const calculatedSectionMaximumScore = Object.values(taskFiveSectionAllocation)
  .reduce((total, score) => total + score, 0);

if (calculatedItemMaximumScore !== TASK_FIVE_MAXIMUM_SCORE
  || calculatedSectionMaximumScore !== TASK_FIVE_MAXIMUM_SCORE) {
  throw new Error(`Task 5 allocation must total exactly ${TASK_FIVE_MAXIMUM_SCORE} marks.`);
}

export const taskFiveAssessmentContract = Object.freeze({
  taskId: 'task-5-vt-para-hisian',
  schemaVersion: 1,
  maximumScore: TASK_FIVE_MAXIMUM_SCORE,
  cases: taskFiveCases,
  sourceBoundary: 'The supplied assessment document defines two VT ECGs worth five marks in total and one para-Hisian pacing EGM worth ten marks. Case-specific teaching examples and the para-Hisian rubric are evidence-reviewed original synthetic content; external clinician sign-off is not claimed and the module is not a diagnostic device.',
} as const);
