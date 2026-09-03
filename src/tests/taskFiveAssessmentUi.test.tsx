import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveAssessmentTask } from '../assessment/assessmentRouting';
import { taskFiveClinicalRubric } from '../assessment/task5/clinicalRubric';
import {
  createEmptyTaskFiveResponses,
  markTaskFive,
} from '../assessment/task5/marking';
import type { TaskFiveResponses } from '../assessment/task5/marking';
import {
  TaskFiveAssessment,
  TaskFiveScoreBar,
} from '../assessment/task5/TaskFiveAssessment';

const completeResponses: TaskFiveResponses = {
  'vt-rvot': 'RVOT VT with LBBB morphology with inferior axis.',
  'vt-fascicular': 'Left posterior fascicular VT with RBBB morphology and left axis deviation.',
  'para-hisian': [
    'Pacing near the His bundle.',
    'High output captures the ventricle and His bundle.',
    'Reduce output to lose His capture while maintaining ventricular capture.',
    'QRS widens when His capture is lost.',
    'Compare stimulus to atrial intervals.',
    'Compare the retrograde atrial activation sequence.',
    'Unchanged SA interval and atrial sequence supports an accessory pathway.',
    'SA prolongation with unchanged atrial sequence supports AV nodal conduction.',
    'Change in atrial activation sequence indicates both accessory pathway and AV nodal conduction.',
    'AV nodal conduction can mask a distant accessory pathway.',
  ].join(' '),
};

describe('Task 5 assessment UI', () => {
  it('resolves task=5 while preserving the interval fallback', () => {
    expect(resolveAssessmentTask('?mode=assessment&task=5')).toBe('5');
    expect(resolveAssessmentTask('?mode=assessment&task=4')).toBe('4');
    expect(resolveAssessmentTask('?mode=assessment&task=unknown')).toBe('interval');
  });

  it('starts with three unanswered response fields', () => {
    expect(createEmptyTaskFiveResponses()).toEqual({
      'vt-rvot': '',
      'vt-fascicular': '',
      'para-hisian': '',
    });
  });

  it('renders all three traces without answer-bearing student metadata', () => {
    const markup = renderToStaticMarkup(<TaskFiveAssessment assessmentView="student" />);
    expect(markup.match(/data-task-five-trace=/g)).toHaveLength(3);
    expect(markup).toContain('EP HEART · TASK 5 · 15 MARKS');
    expect(markup).toContain('Higher output');
    expect(markup).toContain('Lower output');
    expect(markup).not.toContain('RVOT ventricular tachycardia');
    expect(markup).not.toContain('Left posterior fascicular VT');
    expect(markup).not.toContain('qrs-lbbb');
    expect(markup).not.toContain('qrs-rbbb');
    expect(markup).not.toContain('S-A 85 ms');
    expect(markup).not.toContain('Distal-to-proximal sequence unchanged');
    expect(markup).not.toContain('instructor-answer-key');
  });

  it('shows morphology, pacing annotations and answer criteria only in instructor markup', () => {
    const markup = renderToStaticMarkup(<TaskFiveAssessment assessmentView="instructor" />);
    expect(markup).toContain('instructor-answer-key');
    expect(markup).toContain('RVOT ventricular tachycardia');
    expect(markup).toContain('Left posterior fascicular VT');
    expect(markup).toContain('His/RB + ventricular capture');
    expect(markup).toContain('S-A 85 ms');
    expect(markup).toContain('Distal-to-proximal sequence unchanged');
    expect(markup).toContain('/?mode=assessment&amp;task=4&amp;view=instructor');
  });

  it('presents the exact 15-mark score and section subtotals', () => {
    const result = markTaskFive(completeResponses, taskFiveClinicalRubric);
    const markup = renderToStaticMarkup(<TaskFiveScoreBar result={result} />);
    expect(result.score).toBe(15);
    expect(markup).toContain('15/15');
    expect(markup).toContain('VT ECG 1 2/2');
    expect(markup).toContain('VT ECG 2 3/3');
    expect(markup).toContain('Para-Hisian 10/10');
  });
});
