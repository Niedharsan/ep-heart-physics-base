import type { AssessmentView } from '../assessmentView';
import type { TaskThreeResponses, TaskThreeScore } from './marking';

export interface TaskThreeFeedbackPackageInput {
  readonly assessmentView: AssessmentView;
  readonly attemptId: string;
  readonly createdAtIso: string;
  readonly responses: TaskThreeResponses;
  readonly result: TaskThreeScore;
  readonly notes: string;
  readonly browser: string;
}

export interface TaskThreeFeedbackPackage {
  readonly schemaVersion: 1;
  readonly preview: 'EP Heart Task 3 assessment';
  readonly assessmentView: AssessmentView;
  readonly attemptId: string;
  readonly createdAtIso: string;
  readonly responses: TaskThreeResponses;
  readonly result: TaskThreeScore;
  readonly notes: string;
  readonly browser: string;
  readonly disclaimer: string;
}

function cloneResponses(responses: TaskThreeResponses): TaskThreeResponses {
  return Object.freeze({
    atrialTachycardia: Object.freeze({
      'at-1': Object.freeze({ ...responses.atrialTachycardia['at-1'] }),
      'at-2': Object.freeze({ ...responses.atrialTachycardia['at-2'] }),
      'at-3': Object.freeze({ ...responses.atrialTachycardia['at-3'] }),
    }),
    ahJump: Object.freeze({
      'ah-jump-below-50': Object.freeze({ ...responses.ahJump['ah-jump-below-50'] }),
      'ah-jump-above-50': Object.freeze({ ...responses.ahJump['ah-jump-above-50'] }),
    }),
    cannonWave: responses.cannonWave,
    adenosine: responses.adenosine,
    avnrtEcg: Object.freeze({ ...responses.avnrtEcg }),
  });
}

export function buildTaskThreeFeedbackPackage(
  input: TaskThreeFeedbackPackageInput,
): TaskThreeFeedbackPackage {
  return Object.freeze({
    schemaVersion: 1,
    preview: 'EP Heart Task 3 assessment',
    assessmentView: input.assessmentView,
    attemptId: input.attemptId,
    createdAtIso: input.createdAtIso,
    responses: cloneResponses(input.responses),
    result: input.result,
    notes: input.notes,
    browser: input.browser,
    disclaimer: 'Synthetic educational assessment; not patient data and not for clinical decision-making.',
  });
}
