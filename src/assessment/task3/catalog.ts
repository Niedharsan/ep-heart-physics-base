export const TASK_THREE_MAXIMUM_SCORE = 23 as const;
export const TASK_THREE_TARGET_WORD_COUNT = 50 as const;

export type TaskThreeAtrialTachycardiaCaseId = 'at-1' | 'at-2' | 'at-3';
export type TaskThreeAhJumpCaseId = 'ah-jump-below-50' | 'ah-jump-above-50';
export type TaskThreeWrittenResponseId = 'cannon-wave' | 'adenosine';
export type TaskThreeTraceId =
  | 'at-left-v1-positive'
  | 'at-right-v1-negative'
  | 'at-left-v1-negative-positive'
  | 'ah-change-40-ms'
  | 'ah-change-60-ms'
  | 'avnrt-slow-fast-short-rp';

export interface TaskThreeItemContract<Id extends string> {
  readonly id: Id;
  readonly prompt: string;
  readonly maximumScore: number;
  readonly rubricStatus: 'domain-approved';
  readonly traceId?: TaskThreeTraceId;
}

export const taskThreeAtrialTachycardiaCases = Object.freeze([
  Object.freeze({
    id: 'at-1',
    prompt: 'Interpret atrial tachycardia ECG 1 and identify whether the likely origin is left- or right-sided.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'at-left-v1-positive',
  }),
  Object.freeze({
    id: 'at-2',
    prompt: 'Interpret atrial tachycardia ECG 2 and identify whether the likely origin is left- or right-sided.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'at-right-v1-negative',
  }),
  Object.freeze({
    id: 'at-3',
    prompt: 'Interpret atrial tachycardia ECG 3 and identify whether the likely origin is left- or right-sided.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'at-left-v1-negative-positive',
  }),
] satisfies readonly TaskThreeItemContract<TaskThreeAtrialTachycardiaCaseId>[]);

export const taskThreeAhJumpCases = Object.freeze([
  Object.freeze({
    id: 'ah-jump-below-50',
    prompt: 'Interpret the EGM, decide whether the AH change meets the conventional 50 ms jump criterion, and classify it relative to 50 ms.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'ah-change-40-ms',
  }),
  Object.freeze({
    id: 'ah-jump-above-50',
    prompt: 'Interpret the EGM, decide whether the AH change meets the conventional 50 ms jump criterion, and classify it relative to 50 ms.',
    maximumScore: 2,
    rubricStatus: 'domain-approved',
    traceId: 'ah-change-60-ms',
  }),
] satisfies readonly TaskThreeItemContract<TaskThreeAhJumpCaseId>[]);

export const taskThreeWrittenResponseCases = Object.freeze([
  Object.freeze({
    id: 'cannon-wave',
    prompt: 'Describe a cannon wave in approximately 50 words.',
    maximumScore: 5,
    rubricStatus: 'domain-approved',
  }),
  Object.freeze({
    id: 'adenosine',
    prompt: 'Describe the use of adenosine in approximately 50 words.',
    maximumScore: 5,
    rubricStatus: 'domain-approved',
  }),
] satisfies readonly TaskThreeItemContract<TaskThreeWrittenResponseId>[]);

export const taskThreeAvnrtCase = Object.freeze({
  id: 'avnrt-ecg',
  prompt: 'Interpret the AVNRT ECG and identify whether the antegrade slow or fast pathway is most likely involved.',
  maximumScore: 3,
  rubricStatus: 'domain-approved',
  traceId: 'avnrt-slow-fast-short-rp',
} as const);

export const taskThreeSectionAllocation = Object.freeze({
  atrialTachycardia: 6,
  ahJump: 4,
  cannonWave: 5,
  adenosine: 5,
  avnrtEcg: 3,
} as const);

const calculatedSectionMaximumScore = Object.values(taskThreeSectionAllocation)
  .reduce((total, score) => total + score, 0);
const calculatedItemMaximumScore = [
  ...taskThreeAtrialTachycardiaCases,
  ...taskThreeAhJumpCases,
  ...taskThreeWrittenResponseCases,
  taskThreeAvnrtCase,
].reduce((total, item) => total + item.maximumScore, 0);

if (calculatedSectionMaximumScore !== TASK_THREE_MAXIMUM_SCORE
  || calculatedItemMaximumScore !== TASK_THREE_MAXIMUM_SCORE) {
  throw new Error(`Task 3 allocation must total exactly ${TASK_THREE_MAXIMUM_SCORE} marks.`);
}

export const taskThreeAssessmentContract = Object.freeze({
  taskId: 'task-3-atrial-tachycardia-ah-jump-cannon-wave-adenosine-avnrt',
  schemaVersion: 2,
  maximumScore: TASK_THREE_MAXIMUM_SCORE,
  targetWordCount: TASK_THREE_TARGET_WORD_COUNT,
  atrialTachycardiaCases: taskThreeAtrialTachycardiaCases,
  ahJumpCases: taskThreeAhJumpCases,
  writtenResponseCases: taskThreeWrittenResponseCases,
  avnrtCase: taskThreeAvnrtCase,
  sourceBoundary: 'Evidence-reviewed synthetic educational answer keys and traces; external clinician sign-off is not claimed and content is not patient data or a diagnostic device.',
} as const);
