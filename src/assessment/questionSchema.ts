import type {
  IntervalDefinition,
  IntervalId,
  LandmarkReference,
  NormalRange,
} from './types';

export type AssessmentQuestionKind =
  | 'interval-measurement'
  | 'diagnosis'
  | 'short-answer'
  | 'sequence-ordering'
  | 'catheter-placement';

export interface AssessmentSourceReferenceV1 {
  readonly sourceId: string;
  readonly concept: string;
}

interface AssessmentQuestionBaseV1 {
  readonly schemaVersion: 1;
  readonly questionId: string;
  readonly questionVersion: 1;
  readonly taskId: string;
  readonly kind: AssessmentQuestionKind;
  readonly prompt: string;
  readonly maximumScore: number;
  readonly sourceReferences: readonly AssessmentSourceReferenceV1[];
}

export interface IntervalMeasurementQuestionV1 extends AssessmentQuestionBaseV1 {
  readonly kind: 'interval-measurement';
  readonly scenarioId: string;
  readonly answerKey: {
    readonly intervalId: IntervalId;
    readonly expectedValueMs: number;
    readonly measurementToleranceMs: number;
    readonly landmarkToleranceMs: number;
    readonly startReference: LandmarkReference;
    readonly endReference: LandmarkReference;
    readonly normalRange?: NormalRange;
  };
}

export interface DiagnosisQuestionV1 extends AssessmentQuestionBaseV1 {
  readonly kind: 'diagnosis';
  readonly scenarioId: string;
  readonly answerKey: {
    readonly correctDiagnosis: string;
    readonly acceptedSynonyms: readonly string[];
  };
}

export interface ShortAnswerQuestionV1 extends AssessmentQuestionBaseV1 {
  readonly kind: 'short-answer';
  readonly answerKey: {
    readonly requiredKeywords: readonly string[];
    readonly minimumKeywordMatches: number;
  };
}

export interface SequenceOrderingQuestionV1 extends AssessmentQuestionBaseV1 {
  readonly kind: 'sequence-ordering';
  readonly items: readonly string[];
  readonly answerKey: {
    readonly orderedItems: readonly string[];
  };
}

export interface CatheterPlacementQuestionV1 extends AssessmentQuestionBaseV1 {
  readonly kind: 'catheter-placement';
  readonly availableCatheterIds: readonly string[];
  readonly answerKey: {
    readonly requiredPlacements: Readonly<Record<string, string>>;
  };
}

export type AssessmentQuestionV1 =
  | IntervalMeasurementQuestionV1
  | DiagnosisQuestionV1
  | ShortAnswerQuestionV1
  | SequenceOrderingQuestionV1
  | CatheterPlacementQuestionV1;

export type StudentAssessmentQuestionV1 = AssessmentQuestionV1 extends infer Question
  ? Question extends AssessmentQuestionV1
    ? Omit<Question, 'answerKey'>
    : never
  : never;

function requireNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive and finite.`);
}

export function validateAssessmentQuestion(question: AssessmentQuestionV1): AssessmentQuestionV1 {
  if (question.schemaVersion !== 1 || question.questionVersion !== 1) {
    throw new Error('Assessment question requires supported schema and question version 1.');
  }
  requireNonEmpty(question.questionId, 'Question id');
  requireNonEmpty(question.taskId, 'Task id');
  requireNonEmpty(question.prompt, 'Question prompt');
  requirePositiveFinite(question.maximumScore, 'Maximum score');

  switch (question.kind) {
    case 'interval-measurement':
      requireNonEmpty(question.scenarioId, 'Scenario id');
      requirePositiveFinite(question.answerKey.expectedValueMs, 'Expected interval');
      requirePositiveFinite(question.answerKey.measurementToleranceMs, 'Measurement tolerance');
      requirePositiveFinite(question.answerKey.landmarkToleranceMs, 'Landmark tolerance');
      if (question.answerKey.startReference.allowedChannelIds.length === 0
        || question.answerKey.endReference.allowedChannelIds.length === 0) {
        throw new Error('Interval questions require allowed channels for both landmarks.');
      }
      break;
    case 'diagnosis':
      requireNonEmpty(question.scenarioId, 'Scenario id');
      requireNonEmpty(question.answerKey.correctDiagnosis, 'Correct diagnosis');
      break;
    case 'short-answer':
      if (question.answerKey.requiredKeywords.length === 0) {
        throw new Error('Short-answer questions require at least one keyword.');
      }
      if (!Number.isInteger(question.answerKey.minimumKeywordMatches)
        || question.answerKey.minimumKeywordMatches < 1
        || question.answerKey.minimumKeywordMatches > question.answerKey.requiredKeywords.length) {
        throw new Error('Short-answer keyword threshold is invalid.');
      }
      break;
    case 'sequence-ordering':
      if (question.items.length < 2
        || question.answerKey.orderedItems.length !== question.items.length) {
        throw new Error('Sequence questions require matching item and answer lengths.');
      }
      break;
    case 'catheter-placement':
      if (question.availableCatheterIds.length === 0
        || Object.keys(question.answerKey.requiredPlacements).length === 0) {
        throw new Error('Catheter-placement questions require available and required placements.');
      }
      break;
    default: {
      const neverQuestion: never = question;
      return neverQuestion;
    }
  }

  return question;
}

export function toStudentAssessmentQuestion(
  question: AssessmentQuestionV1,
): StudentAssessmentQuestionV1 {
  const studentEntries = Object.entries(question).filter(([key]) => key !== 'answerKey');
  return Object.freeze(Object.fromEntries(studentEntries)) as StudentAssessmentQuestionV1;
}

export function createIntervalMeasurementQuestion(
  scenarioId: string,
  definition: IntervalDefinition,
): IntervalMeasurementQuestionV1 {
  const sourceReferences = definition.normalRange
    ? Object.freeze([Object.freeze({
      sourceId: definition.normalRange.sourceLabel,
      concept: `${definition.id} normal range`,
    })])
    : Object.freeze([]);

  return validateAssessmentQuestion(Object.freeze({
    schemaVersion: 1,
    questionId: `${scenarioId}:${definition.id}:v1`,
    questionVersion: 1,
    taskId: 'task-1-normal-measurements',
    kind: 'interval-measurement',
    prompt: definition.studentPrompt,
    maximumScore: definition.normalRange ? 2 : 1,
    sourceReferences,
    scenarioId,
    answerKey: Object.freeze({
      intervalId: definition.id,
      expectedValueMs: definition.expectedValueMs,
      measurementToleranceMs: definition.measurementToleranceMs,
      landmarkToleranceMs: definition.landmarkToleranceMs,
      startReference: definition.startReference,
      endReference: definition.endReference,
      normalRange: definition.normalRange,
    }),
  })) as IntervalMeasurementQuestionV1;
}
