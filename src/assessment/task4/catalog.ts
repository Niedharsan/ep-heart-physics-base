export const TASK_FOUR_MAXIMUM_SCORE = 25 as const;

export type TaskFourCaseId =
  | 'avrt-concentric'
  | 'avrt-eccentric'
  | 'vaav-pattern'
  | 'vav-pattern';

export type TaskFourTraceId =
  | 'avrt-concentric-septal'
  | 'avrt-eccentric-left-free-wall'
  | 'vaav-after-ventricular-overdrive-pacing'
  | 'vav-after-ventricular-overdrive-pacing';

export interface TaskFourItemContract {
  readonly id: TaskFourCaseId;
  readonly prompt: string;
  readonly maximumScore: number;
  readonly rubricStatus: 'domain-approved';
  readonly traceId: TaskFourTraceId;
}

export const taskFourCases = Object.freeze([
  Object.freeze({
    id: 'avrt-concentric',
    prompt: 'Interpret EGM case 1: identify the tachycardia mechanism, retrograde atrial activation sequence, earliest atrial site and likely accessory-pathway region.',
    maximumScore: 5,
    rubricStatus: 'domain-approved',
    traceId: 'avrt-concentric-septal',
  }),
  Object.freeze({
    id: 'avrt-eccentric',
    prompt: 'Interpret EGM case 2: identify the tachycardia mechanism, retrograde atrial activation sequence, earliest atrial site and likely accessory-pathway region.',
    maximumScore: 5,
    rubricStatus: 'domain-approved',
    traceId: 'avrt-eccentric-left-free-wall',
  }),
  Object.freeze({
    id: 'vaav-pattern',
    prompt: 'Describe the pacing manoeuvre, identify the post-pacing sequence and state which tachycardia mechanism the response supports.',
    maximumScore: 5,
    rubricStatus: 'domain-approved',
    traceId: 'vaav-after-ventricular-overdrive-pacing',
  }),
  Object.freeze({
    id: 'vav-pattern',
    prompt: 'Identify the post-pacing sequence and describe the next diagnostic steps used to distinguish the remaining mechanisms.',
    maximumScore: 10,
    rubricStatus: 'domain-approved',
    traceId: 'vav-after-ventricular-overdrive-pacing',
  }),
] satisfies readonly TaskFourItemContract[]);

export const taskFourSectionAllocation: Readonly<Record<TaskFourCaseId, number>> = Object.freeze({
  'avrt-concentric': 5,
  'avrt-eccentric': 5,
  'vaav-pattern': 5,
  'vav-pattern': 10,
});

const calculatedItemMaximumScore = taskFourCases
  .reduce((total, item) => total + item.maximumScore, 0);
const calculatedSectionMaximumScore = Object.values(taskFourSectionAllocation)
  .reduce((total, score) => total + score, 0);

if (calculatedItemMaximumScore !== TASK_FOUR_MAXIMUM_SCORE
  || calculatedSectionMaximumScore !== TASK_FOUR_MAXIMUM_SCORE) {
  throw new Error(`Task 4 allocation must total exactly ${TASK_FOUR_MAXIMUM_SCORE} marks.`);
}

export const taskFourAssessmentContract = Object.freeze({
  taskId: 'task-4-avrt-vaav-vav',
  schemaVersion: 2,
  maximumScore: TASK_FOUR_MAXIMUM_SCORE,
  cases: taskFourCases,
  sourceBoundary: 'Evidence-reviewed deterministic synthetic educational content. Activation sequence and pacing manoeuvres are diagnostic aids with recognised exceptions; external clinician sign-off is not claimed and the module is not a diagnostic device.',
} as const);
