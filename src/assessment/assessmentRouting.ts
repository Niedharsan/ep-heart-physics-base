export type AssessmentTask = 'interval' | '1' | '2' | '3' | '4' | '5';
export type AssessmentMode = 'practice' | 'mock' | 'exam';

export function resolveAssessmentViewForMode(
  mode: AssessmentMode,
  requestedView: 'student' | 'instructor',
): 'student' | 'instructor' {
  return mode === 'practice' ? requestedView : 'student';
}

export function resolveAssessmentMode(search: string): AssessmentMode {
  const mode = new URLSearchParams(search).get('assessmentMode');
  return mode === 'mock' || mode === 'exam' ? mode : 'practice';
}

export function resolveAssessmentTask(search: string): AssessmentTask {
  const selectedTask = new URLSearchParams(search).get('task');
  if (
    selectedTask === '1'
    || selectedTask === '2'
    || selectedTask === '3'
    || selectedTask === '4'
    || selectedTask === '5'
  ) {
    return selectedTask;
  }
  return 'interval';
}
