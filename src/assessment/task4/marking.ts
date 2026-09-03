import {
  TASK_FOUR_MAXIMUM_SCORE,
  taskFourCases,
} from './catalog';
import type { TaskFourCaseId } from './catalog';

export type TaskFourResponses = Readonly<Record<TaskFourCaseId, string>>;

export function createEmptyTaskFourResponses(): TaskFourResponses {
  return {
    'avrt-concentric': '',
    'avrt-eccentric': '',
    'vaav-pattern': '',
    'vav-pattern': '',
  };
}

export interface TaskFourCriterion {
  readonly id: string;
  readonly label: string;
  readonly acceptedStatements: readonly string[];
}

export interface TaskFourRubric {
  readonly rubricVersion: 1;
  readonly approvalStatus: 'domain-approved';
  readonly sections: Readonly<Record<TaskFourCaseId, readonly TaskFourCriterion[]>>;
}

export interface TaskFourSectionScore {
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface TaskFourScore {
  readonly score: number;
  readonly maximumScore: typeof TASK_FOUR_MAXIMUM_SCORE;
  readonly sections: Readonly<Record<TaskFourCaseId, TaskFourSectionScore>>;
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

const validateCriterion = (criterion: TaskFourCriterion, sectionId: TaskFourCaseId): void => {
  requireNonEmpty(criterion.id, `${sectionId} criterion id`);
  requireNonEmpty(criterion.label, `${sectionId} criterion label`);
  if (criterion.acceptedStatements.length === 0) {
    throw new Error(`${sectionId} criterion ${criterion.id} requires accepted statements.`);
  }
  criterion.acceptedStatements.forEach((statement) => (
    requireNonEmpty(statement, `${sectionId} criterion ${criterion.id} accepted statement`)
  ));
};

export function validateTaskFourRubric(rubric: TaskFourRubric): TaskFourRubric {
  if (rubric.rubricVersion !== 1 || rubric.approvalStatus !== 'domain-approved') {
    throw new Error('Task 4 requires a supported, explicitly domain-approved rubric.');
  }

  for (const taskCase of taskFourCases) {
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

const matchesCriterion = (response: string, criterion: TaskFourCriterion): boolean => {
  const normalizedResponse = normalize(response);
  if (normalizedResponse.length === 0) return false;
  const responseBoundary = ` ${normalizedResponse} `;
  return criterion.acceptedStatements.some((statement) => {
    const normalizedStatement = normalize(statement);
    return normalizedStatement.length > 0
      && responseBoundary.includes(` ${normalizedStatement} `);
  });
};

export function markTaskFourSection(
  response: string,
  criteria: readonly TaskFourCriterion[],
): TaskFourSectionScore {
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

export function markTaskFour(
  responses: TaskFourResponses,
  suppliedRubric: TaskFourRubric,
): TaskFourScore {
  const rubric = validateTaskFourRubric(suppliedRubric);
  const sections = {} as Record<TaskFourCaseId, TaskFourSectionScore>;
  let rawScore = 0;

  for (const taskCase of taskFourCases) {
    const section = markTaskFourSection(responses[taskCase.id], rubric.sections[taskCase.id]);
    sections[taskCase.id] = section;
    rawScore += section.score;
  }

  return Object.freeze({
    score: Math.min(rawScore, TASK_FOUR_MAXIMUM_SCORE),
    maximumScore: TASK_FOUR_MAXIMUM_SCORE,
    sections: Object.freeze(sections),
  });
}
