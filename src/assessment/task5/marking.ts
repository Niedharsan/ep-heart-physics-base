import {
  TASK_FIVE_MAXIMUM_SCORE,
  taskFiveCases,
} from './catalog';
import type { TaskFiveCaseId } from './catalog';

export type TaskFiveResponses = Readonly<Record<TaskFiveCaseId, string>>;

export function createEmptyTaskFiveResponses(): TaskFiveResponses {
  return {
    'vt-rvot': '',
    'vt-fascicular': '',
    'para-hisian': '',
  };
}

export interface TaskFiveCriterion {
  readonly id: string;
  readonly label: string;
  readonly acceptedStatements: readonly string[];
}

export interface TaskFiveRubric {
  readonly rubricVersion: 1;
  readonly approvalStatus: 'domain-approved';
  readonly evidenceBoundary: readonly string[];
  readonly sections: Readonly<Record<TaskFiveCaseId, readonly TaskFiveCriterion[]>>;
}

export interface TaskFiveSectionScore {
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface TaskFiveScore {
  readonly score: number;
  readonly maximumScore: typeof TASK_FIVE_MAXIMUM_SCORE;
  readonly sections: Readonly<Record<TaskFiveCaseId, TaskFiveSectionScore>>;
}

const normalize = (value: string): string => value
  .toLocaleLowerCase('en')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const requireNonEmpty = (value: string, label: string): void => {
  if (normalize(value).length === 0) throw new Error(`${label} must not be empty.`);
};

const validateCriterion = (criterion: TaskFiveCriterion, sectionId: TaskFiveCaseId): void => {
  requireNonEmpty(criterion.id, `${sectionId} criterion id`);
  requireNonEmpty(criterion.label, `${sectionId} criterion label`);
  if (criterion.acceptedStatements.length === 0) {
    throw new Error(`${sectionId} criterion ${criterion.id} requires accepted statements.`);
  }
  criterion.acceptedStatements.forEach((statement) => (
    requireNonEmpty(statement, `${sectionId} criterion ${criterion.id} accepted statement`)
  ));
};

export function validateTaskFiveRubric(rubric: TaskFiveRubric): TaskFiveRubric {
  if (rubric.rubricVersion !== 1 || rubric.approvalStatus !== 'domain-approved') {
    throw new Error('Task 5 requires a supported, explicitly domain-approved rubric.');
  }
  if (rubric.evidenceBoundary.length === 0) {
    throw new Error('Task 5 rubric requires an explicit evidence boundary.');
  }

  for (const taskCase of taskFiveCases) {
    const criteria = rubric.sections[taskCase.id];
    if (!Array.isArray(criteria) || criteria.length !== taskCase.maximumScore) {
      throw new Error(`${taskCase.id} requires exactly ${taskCase.maximumScore} one-mark criteria.`);
    }
    const criterionIds = new Set<string>();
    criteria.forEach((criterion) => {
      validateCriterion(criterion, taskCase.id);
      if (criterionIds.has(criterion.id)) {
        throw new Error(`${taskCase.id} criterion ids must be unique.`);
      }
      criterionIds.add(criterion.id);
    });
  }

  return rubric;
}

const matchesCriterion = (response: string, criterion: TaskFiveCriterion): boolean => {
  const normalizedResponse = normalize(response);
  if (normalizedResponse.length === 0) return false;
  const responseBoundary = ` ${normalizedResponse} `;
  return criterion.acceptedStatements.some((statement) => {
    const normalizedStatement = normalize(statement);
    return normalizedStatement.length > 0
      && responseBoundary.includes(` ${normalizedStatement} `);
  });
};

export function markTaskFiveSection(
  response: string,
  criteria: readonly TaskFiveCriterion[],
): TaskFiveSectionScore {
  let score = 0;
  const feedback: string[] = [];

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
  });
}

export function markTaskFive(
  responses: TaskFiveResponses,
  suppliedRubric: TaskFiveRubric,
): TaskFiveScore {
  const rubric = validateTaskFiveRubric(suppliedRubric);
  const sections = {} as Record<TaskFiveCaseId, TaskFiveSectionScore>;
  let rawScore = 0;

  for (const taskCase of taskFiveCases) {
    const section = markTaskFiveSection(responses[taskCase.id], rubric.sections[taskCase.id]);
    sections[taskCase.id] = section;
    rawScore += section.score;
  }

  return Object.freeze({
    score: Math.min(rawScore, TASK_FIVE_MAXIMUM_SCORE),
    maximumScore: TASK_FIVE_MAXIMUM_SCORE,
    sections: Object.freeze(sections),
  });
}
