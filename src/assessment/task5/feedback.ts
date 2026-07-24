import type { AssessmentView } from '../assessmentView';
import type { TaskFiveResponses, TaskFiveScore } from './marking';

export interface TaskFiveFeedbackPackageInput {
  readonly assessmentView: AssessmentView;
  readonly attemptId: string;
  readonly createdAtIso: string;
  readonly responses: TaskFiveResponses;
  readonly result: TaskFiveScore;
  readonly notes: string;
  readonly browser: string;
}

export function buildTaskFiveFeedbackPackage(input: TaskFiveFeedbackPackageInput) {
  return Object.freeze({
    packageVersion: 1,
    preview: 'EP Heart Task 5 VT and para-Hisian pacing assessment',
    taskId: 'task-5-vt-para-hisian',
    assessmentView: input.assessmentView,
    attemptId: input.attemptId,
    createdAtIso: input.createdAtIso,
    responses: Object.freeze({ ...input.responses }),
    result: input.result,
    notes: input.notes,
    browser: input.browser,
    disclaimer: 'Synthetic educational prototype; not patient data and not for clinical decision-making.',
  });
}
