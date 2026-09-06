import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VtLocalizationTaskAssessment } from '../assessment/VtLocalizationTaskAssessment';

describe('VT localisation Tasks 6-8 UI', () => {
  it('renders each new task as a separate four-mark assessment with a live ECG', () => {
    for (const taskId of ['6', '7', '8'] as const) {
      const markup = renderToStaticMarkup(
        <VtLocalizationTaskAssessment
          taskId={taskId}
          assessmentMode="practice"
          instructor={false}
        />,
      );
      expect(markup).toContain(`TASK ${taskId} · 4 MARKS`);
      expect(markup).toContain(`data-vt-localization-live-trace="${taskId}"`);
      expect(markup).toContain('data-running-egm=');
      expect(markup).not.toContain('class="vt-localization-image-shell"');
      expect(markup).toContain('RBBB or LBBB morphology · 1 mark');
      expect(markup).toContain('Superior or inferior origin · 1 mark');
      expect(markup).toContain('Septal or lateral · 1 mark');
      expect(markup).toContain('RVOT, LVOT or other · 1 mark');
    }
  });
});
