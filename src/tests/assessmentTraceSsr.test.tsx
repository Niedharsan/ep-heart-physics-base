import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TaskTwoAssessment } from '../assessment/task2/TaskTwoAssessment';
import { TaskThreeAssessment } from '../assessment/task3/TaskThreeAssessment';
import { TaskFourAssessment } from '../assessment/task4/TaskFourAssessment';
import { TaskFiveAssessment } from '../assessment/task5/TaskFiveAssessment';

describe('assessment trace SSR safety', () => {
  it('renders Tasks 2-5 without a browser window', () => {
    expect(() => renderToStaticMarkup(<TaskTwoAssessment assessmentView="student" />)).not.toThrow();
    expect(() => renderToStaticMarkup(<TaskThreeAssessment assessmentView="student" />)).not.toThrow();
    expect(() => renderToStaticMarkup(<TaskFourAssessment assessmentView="student" />)).not.toThrow();
    expect(() => renderToStaticMarkup(<TaskFiveAssessment assessmentView="student" />)).not.toThrow();
  });
});
