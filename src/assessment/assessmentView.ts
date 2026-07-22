export type AssessmentView = 'student' | 'instructor';

export function resolveAssessmentView(search: string): AssessmentView {
  return new URLSearchParams(search).get('view') === 'instructor'
    ? 'instructor'
    : 'student';
}
