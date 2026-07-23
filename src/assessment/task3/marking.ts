import {
  TASK_THREE_MAXIMUM_SCORE,
  TASK_THREE_TARGET_WORD_COUNT,
  taskThreeAhJumpCases,
  taskThreeAtrialTachycardiaCases,
} from './catalog';
import type {
  TaskThreeAhJumpCaseId,
  TaskThreeAtrialTachycardiaCaseId,
} from './catalog';

export type AtrialTachycardiaSide = 'left' | 'right';
export type AhJumpThresholdClass = 'below-50-ms' | 'above-50-ms';
export type AvnrtPathway = 'slow' | 'fast';

export interface AtrialTachycardiaResponse {
  readonly diagnosis: string;
  readonly side: AtrialTachycardiaSide | '';
}

export interface AhJumpResponse {
  readonly identifiesAhJump: boolean | null;
  readonly thresholdClass: AhJumpThresholdClass | '';
}

export interface AvnrtEcgResponse {
  readonly diagnosis: string;
  readonly pathway: AvnrtPathway | '';
  readonly explanation: string;
}

export interface TaskThreeResponses {
  readonly atrialTachycardia: Readonly<Record<TaskThreeAtrialTachycardiaCaseId, AtrialTachycardiaResponse>>;
  readonly ahJump: Readonly<Record<TaskThreeAhJumpCaseId, AhJumpResponse>>;
  readonly cannonWave: string;
  readonly adenosine: string;
  readonly avnrtEcg: AvnrtEcgResponse;
}

export interface TextCriterion {
  readonly id: string;
  readonly label: string;
  readonly acceptedStatements: readonly string[];
}

export interface AtrialTachycardiaAnswerKey {
  readonly acceptedDiagnoses: readonly string[];
  readonly expectedSide: AtrialTachycardiaSide;
}

export interface AhJumpAnswerKey {
  readonly expectedAhJump: boolean;
  readonly expectedThresholdClass: AhJumpThresholdClass;
}

export interface AvnrtEcgAnswerKey {
  readonly acceptedDiagnoses: readonly string[];
  readonly expectedPathway: AvnrtPathway;
  readonly explanationCriterion: TextCriterion;
}

export interface TaskThreeClinicalRubric {
  readonly rubricVersion: 1;
  readonly approvalStatus: 'domain-approved';
  readonly atrialTachycardia: Readonly<Record<TaskThreeAtrialTachycardiaCaseId, AtrialTachycardiaAnswerKey>>;
  readonly ahJump: Readonly<Record<TaskThreeAhJumpCaseId, AhJumpAnswerKey>>;
  readonly cannonWaveCriteria: readonly TextCriterion[];
  readonly adenosineCriteria: readonly TextCriterion[];
  readonly avnrtEcg: AvnrtEcgAnswerKey;
}

export interface SectionScore {
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface WrittenResponseScore extends SectionScore {
  readonly wordCount: number;
  readonly targetWordCount: typeof TASK_THREE_TARGET_WORD_COUNT;
}

export interface TaskThreeScore {
  readonly score: number;
  readonly maximumScore: typeof TASK_THREE_MAXIMUM_SCORE;
  readonly atrialTachycardia: SectionScore;
  readonly ahJump: SectionScore;
  readonly cannonWave: WrittenResponseScore;
  readonly adenosine: WrittenResponseScore;
  readonly avnrtEcg: SectionScore;
}

const normalize = (value: string): string => value
  .toLocaleLowerCase('en')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const matchesAcceptedAnswer = (value: string, acceptedAnswers: readonly string[]): boolean => {
  const normalizedValue = normalize(value);
  return normalizedValue.length > 0
    && acceptedAnswers.some((answer) => normalize(answer) === normalizedValue);
};

const matchesCriterion = (value: string, criterion: TextCriterion): boolean => {
  const normalizedValue = normalize(value);
  return normalizedValue.length > 0
    && criterion.acceptedStatements.some((statement) => {
      const normalizedStatement = normalize(statement);
      return normalizedStatement.length > 0 && normalizedValue.includes(normalizedStatement);
    });
};

const requireNonEmptyAnswers = (answers: readonly string[], label: string): void => {
  if (answers.length === 0 || answers.some((answer) => normalize(answer).length === 0)) {
    throw new Error(`${label} requires non-empty accepted answers.`);
  }
};

const validateCriterion = (criterion: TextCriterion, label: string): void => {
  if (normalize(criterion.id).length === 0 || normalize(criterion.label).length === 0) {
    throw new Error(`${label} criterion id and label must not be empty.`);
  }
  requireNonEmptyAnswers(criterion.acceptedStatements, `${label} criterion ${criterion.id}`);
};

export function validateTaskThreeRubric(rubric: TaskThreeClinicalRubric): TaskThreeClinicalRubric {
  if (rubric.rubricVersion !== 1 || rubric.approvalStatus !== 'domain-approved') {
    throw new Error('Task 3 requires a supported, explicitly domain-approved rubric.');
  }

  for (const taskCase of taskThreeAtrialTachycardiaCases) {
    const answerKey = rubric.atrialTachycardia[taskCase.id];
    requireNonEmptyAnswers(answerKey.acceptedDiagnoses, `Atrial tachycardia ${taskCase.id}`);
  }

  for (const taskCase of taskThreeAhJumpCases) {
    const answerKey = rubric.ahJump[taskCase.id];
    const expectedThresholdClass = taskCase.id === 'ah-jump-below-50'
      ? 'below-50-ms'
      : 'above-50-ms';
    const expectedAhJump = taskCase.id === 'ah-jump-above-50';
    if (answerKey.expectedAhJump !== expectedAhJump) {
      throw new Error(`AH-change case ${taskCase.id} has the wrong conventional jump classification.`);
    }
    if (answerKey.expectedThresholdClass !== expectedThresholdClass) {
      throw new Error(`AH-change case ${taskCase.id} has the wrong 50 ms threshold class.`);
    }
  }

  if (rubric.cannonWaveCriteria.length !== 5 || rubric.adenosineCriteria.length !== 5) {
    throw new Error('Cannon-wave and adenosine rubrics must each contain exactly five one-mark criteria.');
  }
  rubric.cannonWaveCriteria.forEach((criterion) => validateCriterion(criterion, 'Cannon-wave'));
  rubric.adenosineCriteria.forEach((criterion) => validateCriterion(criterion, 'Adenosine'));
  requireNonEmptyAnswers(rubric.avnrtEcg.acceptedDiagnoses, 'AVNRT ECG');
  validateCriterion(rubric.avnrtEcg.explanationCriterion, 'AVNRT ECG explanation');

  return rubric;
}

export function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function markAtrialTachycardia(
  responses: TaskThreeResponses['atrialTachycardia'],
  rubric: TaskThreeClinicalRubric['atrialTachycardia'],
): SectionScore {
  let score = 0;
  const feedback: string[] = [];

  for (const taskCase of taskThreeAtrialTachycardiaCases) {
    const response = responses[taskCase.id];
    const answerKey = rubric[taskCase.id];
    if (matchesAcceptedAnswer(response.diagnosis, answerKey.acceptedDiagnoses)) {
      score += 1;
    } else {
      feedback.push(`${taskCase.id}: review the ECG diagnosis.`);
    }
    if (response.side === answerKey.expectedSide) {
      score += 1;
    } else {
      feedback.push(`${taskCase.id}: review the left/right localisation.`);
    }
  }

  return Object.freeze({ score, maximumScore: 6, feedback: Object.freeze(feedback) });
}

export function markAhJump(
  responses: TaskThreeResponses['ahJump'],
  rubric: TaskThreeClinicalRubric['ahJump'],
): SectionScore {
  let score = 0;
  const feedback: string[] = [];

  for (const taskCase of taskThreeAhJumpCases) {
    const response = responses[taskCase.id];
    const answerKey = rubric[taskCase.id];
    if (response.identifiesAhJump === answerKey.expectedAhJump) {
      score += 1;
    } else {
      feedback.push(`${taskCase.id}: review whether the AH change meets the conventional 50 ms jump criterion.`);
    }
    if (response.thresholdClass === answerKey.expectedThresholdClass) {
      score += 1;
    } else {
      feedback.push(`${taskCase.id}: review the 50 ms threshold classification.`);
    }
  }

  return Object.freeze({ score, maximumScore: 4, feedback: Object.freeze(feedback) });
}

export function markWrittenResponse(
  response: string,
  criteria: readonly TextCriterion[],
): WrittenResponseScore {
  const feedback: string[] = [];
  let score = 0;

  for (const criterion of criteria) {
    if (matchesCriterion(response, criterion)) {
      score += 1;
    } else {
      feedback.push(`Review: ${criterion.label}.`);
    }
  }

  return Object.freeze({
    score,
    maximumScore: criteria.length,
    feedback: Object.freeze(feedback),
    wordCount: countWords(response),
    targetWordCount: TASK_THREE_TARGET_WORD_COUNT,
  });
}

export function markAvnrtEcg(
  response: AvnrtEcgResponse,
  rubric: AvnrtEcgAnswerKey,
): SectionScore {
  let score = 0;
  const feedback: string[] = [];

  if (matchesAcceptedAnswer(response.diagnosis, rubric.acceptedDiagnoses)) {
    score += 1;
  } else {
    feedback.push('Review the ECG diagnosis.');
  }
  if (response.pathway === rubric.expectedPathway) {
    score += 1;
  } else {
    feedback.push('Review the likely antegrade slow/fast pathway.');
  }
  if (matchesCriterion(response.explanation, rubric.explanationCriterion)) {
    score += 1;
  } else {
    feedback.push(`Review: ${rubric.explanationCriterion.label}.`);
  }

  return Object.freeze({ score, maximumScore: 3, feedback: Object.freeze(feedback) });
}

export function markTaskThree(
  responses: TaskThreeResponses,
  suppliedRubric: TaskThreeClinicalRubric,
): TaskThreeScore {
  const rubric = validateTaskThreeRubric(suppliedRubric);
  const atrialTachycardia = markAtrialTachycardia(responses.atrialTachycardia, rubric.atrialTachycardia);
  const ahJump = markAhJump(responses.ahJump, rubric.ahJump);
  const cannonWave = markWrittenResponse(responses.cannonWave, rubric.cannonWaveCriteria);
  const adenosine = markWrittenResponse(responses.adenosine, rubric.adenosineCriteria);
  const avnrtEcg = markAvnrtEcg(responses.avnrtEcg, rubric.avnrtEcg);
  const rawScore = atrialTachycardia.score
    + ahJump.score
    + cannonWave.score
    + adenosine.score
    + avnrtEcg.score;

  return Object.freeze({
    score: Math.min(rawScore, TASK_THREE_MAXIMUM_SCORE),
    maximumScore: TASK_THREE_MAXIMUM_SCORE,
    atrialTachycardia,
    ahJump,
    cannonWave,
    adenosine,
    avnrtEcg,
  });
}
