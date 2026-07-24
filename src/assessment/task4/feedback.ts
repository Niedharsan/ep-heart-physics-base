import type { AssessmentView } from '../assessmentView';
import type { TaskFourResponses, TaskFourScore } from './marking';

export interface TaskFourFeedbackPackageInput {
  readonly assessmentView: AssessmentView;
  readonly attemptId: string;
  readonly createdAtIso: string;
  readonly responses: TaskFourResponses;
  readonly result: TaskFourScore;
  readonly notes: string;
  readonly browser: string;
}

export function buildTaskFourFeedbackPackage(input: TaskFourFeedbackPackageInput) {
  return Object.freeze({
    packageVersion: 1,
    preview: 'EP Heart Task 4 AVRT/VAAV/VAV assessment',
    taskId: 'task-4-avrt-vaav-vav',
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
