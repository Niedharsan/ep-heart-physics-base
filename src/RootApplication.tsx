import { AssessmentApp } from './assessment/AssessmentApp';
import { VtLocalizationTaskAssessment } from './assessment/VtLocalizationTaskAssessment';
import type { VtLocalizationTaskId } from './assessment/task5/vtLocalizationPractice';
import { ClientPreviewHome } from './clientPreview/ClientPreviewHome';
import { resolveClientPreviewRoute } from './clientPreview/routes';

function isVtLocalizationTask(value: string | null): value is VtLocalizationTaskId {
  return value === '6' || value === '7' || value === '8';
}

export function RootApplication() {
  const route = resolveClientPreviewRoute(window.location);

  if (route === 'assessment') {
    const params = new URLSearchParams(window.location.search);
    const task = params.get('task');
    const rawMode = params.get('assessmentMode');
    const assessmentMode = rawMode === 'mock' ? 'mock' : rawMode === 'exam' ? 'exam' : 'practice';

    if (isVtLocalizationTask(task) && assessmentMode !== 'exam') {
      const instructor = assessmentMode === 'practice' && params.get('view') === 'instructor';
      return (
        <VtLocalizationTaskAssessment
          taskId={task}
          assessmentMode={assessmentMode}
          instructor={instructor}
        />
      );
    }

    return <AssessmentApp />;
  }
  return <ClientPreviewHome />;
}
