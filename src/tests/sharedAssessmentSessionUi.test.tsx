import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TaskOneAssessment } from '../assessment/task1/TaskOneAssessment';
import { TaskTwoAssessment } from '../assessment/task2/TaskTwoAssessment';
import { TaskThreeAssessment } from '../assessment/task3/TaskThreeAssessment';
import { TaskFourAssessment } from '../assessment/task4/TaskFourAssessment';
import { TaskFiveAssessment } from '../assessment/task5/TaskFiveAssessment';

describe('shared assessment sessions', () => {
  it('gates every timed task behind the shared Start control', () => {
    const markups = [
      renderToStaticMarkup(<TaskOneAssessment assessmentView="student" assessmentMode="mock" />),
      renderToStaticMarkup(<TaskTwoAssessment assessmentView="student" assessmentMode="mock" />),
      renderToStaticMarkup(<TaskThreeAssessment assessmentView="student" assessmentMode="mock" />),
      renderToStaticMarkup(<TaskFourAssessment assessmentView="student" assessmentMode="mock" />),
      renderToStaticMarkup(<TaskFiveAssessment assessmentView="student" assessmentMode="mock" />),
    ];

    for (const markup of markups) {
      expect(markup).toContain('data-assessment-session-state="not-started"');
      expect(markup).toContain('Start assessment');
      expect(markup).toContain('20:00');
      expect(markup).toContain('<fieldset');
      expect(markup).toContain('disabled=""');
    }
  });

  it('leaves practice tasks immediately available and untimed', () => {
    const markup = renderToStaticMarkup(
      <TaskThreeAssessment assessmentView="student" assessmentMode="practice" />,
    );

    expect(markup).toContain('data-assessment-session-state="practice"');
    expect(markup).toContain('Untimed');
    expect(markup).not.toContain('disabled=""');
  });
});
