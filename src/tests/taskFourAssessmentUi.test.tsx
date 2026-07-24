import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveAssessmentTask } from '../assessment/AssessmentApp';
import { taskFourClinicalRubric } from '../assessment/task4/clinicalRubric';
import { markTaskFour } from '../assessment/task4/marking';
import type { TaskFourResponses } from '../assessment/task4/marking';
import {
  createEmptyTaskFourResponses,
  TaskFourAssessment,
  TaskFourScoreBar,
} from '../assessment/task4/TaskFourAssessment';

const completeResponses: TaskFourResponses = {
  'avrt-concentric': 'Orthodromic AVRT with concentric atrial activation, earliest atrial activation at the His, fixed VA interval and septal accessory pathway.',
  'avrt-eccentric': 'Orthodromic AVRT with eccentric atrial activation, earliest atrial activation at CS 1-2, fixed VA interval and left free wall accessory pathway.',
  'vaav-pattern': 'Ventricular overdrive pacing with a pacing cycle length shorter than the tachycardia cycle length produces a VAAV response that supports atrial tachycardia because two atrial activations occur before the return ventricle.',
  'vav-pattern': 'Ventricular overdrive pacing gives a VAV response, argues against atrial tachycardia and leaves AVNRT versus AVRT. Measure the post pacing interval from the last stimulus to the return ventricular beat and calculate PPI minus TCL. Greater than 115 ms suggests AVNRT; less than 115 ms favours AVRT. Deliver a His refractory PVC; atrial advancement supports an accessory pathway.',
};

describe('Task 4 assessment UI', () => {
  it('resolves task=4 without changing the default interval route', () => {
    expect(resolveAssessmentTask('?mode=assessment&task=4')).toBe('4');
    expect(resolveAssessmentTask('?mode=assessment&task=3')).toBe('3');
    expect(resolveAssessmentTask('?mode=assessment&task=unknown')).toBe('interval');
  });

  it('starts with four empty response fields', () => {
    expect(createEmptyTaskFourResponses()).toEqual({
      'avrt-concentric': '',
      'avrt-eccentric': '',
      'vaav-pattern': '',
      'vav-pattern': '',
    });
  });

  it('renders all four traces while keeping answer-bearing metadata out of student markup', () => {
    const markup = renderToStaticMarkup(<TaskFourAssessment assessmentView="student" />);
    expect(markup.match(/data-task-four-trace=/g)).toHaveLength(4);
    expect(markup).toContain('EP HEART · TASK 4 · 25 MARKS');
    expect(markup).not.toContain('PPI-TCL');
    expect(markup).not.toContain('His-refractory PVC');
    expect(markup).not.toContain('VAAV response');
    expect(markup).not.toContain('Orthodromic AVRT with concentric');
    expect(markup).not.toContain('Earliest A at CS 1-2');
    expect(markup).not.toContain('PPI 440 ms');
    expect(markup).not.toContain('instructor-answer-key');
  });

  it('shows annotations and rubric concepts in instructor markup', () => {
    const markup = renderToStaticMarkup(<TaskFourAssessment assessmentView="instructor" />);
    expect(markup).toContain('instructor-answer-key');
    expect(markup).toContain('Earliest A at CS 1-2');
    expect(markup).toContain('PPI 440 ms');
    expect(markup).toContain('His-refractory PVC');
    expect(markup).toContain('/?mode=assessment&amp;task=3&amp;view=instructor');
  });

  it('presents the exact 25-mark score and section subtotals', () => {
    const result = markTaskFour(completeResponses, taskFourClinicalRubric);
    const markup = renderToStaticMarkup(<TaskFourScoreBar result={result} />);
    expect(result.score).toBe(25);
    expect(markup).toContain('25/25');
    expect(markup).toContain('Case 1 5/5');
    expect(markup).toContain('Case 2 5/5');
    expect(markup).toContain('VAAV 5/5');
    expect(markup).toContain('VAV 10/10');
  });
});
