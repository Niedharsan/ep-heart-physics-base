import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveAssessmentTask } from '../assessment/assessmentRouting';
import { taskThreeClinicalRubric } from '../assessment/task3/clinicalRubric';
import {
  createEmptyTaskThreeResponses,
  markTaskThree,
} from '../assessment/task3/marking';
import type { TaskThreeResponses } from '../assessment/task3/marking';
import {
  TaskThreeAssessment,
  TaskThreeScoreBar,
} from '../assessment/task3/TaskThreeAssessment';

const completeResponses: TaskThreeResponses = {
  atrialTachycardia: {
    'at-1': { diagnosis: 'Focal atrial tachycardia', side: 'left' },
    'at-2': { diagnosis: 'Focal atrial tachycardia', side: 'right' },
    'at-3': { diagnosis: 'Atrial tachycardia', side: 'left' },
  },
  ahJump: {
    'ah-jump-below-50': { identifiesAhJump: false, thresholdClass: 'below-50-ms' },
    'ah-jump-above-50': { identifiesAhJump: true, thresholdClass: 'above-50-ms' },
  },
  cannonWave: 'A cannon a wave is a large jugular venous pulsation caused when the right atrium contracts against a closed tricuspid valve during atrioventricular dissociation. It may appear intermittently when atrial contraction coincides with ventricular systole.',
  adenosine: 'Adenosine causes transient AV nodal block and can terminate AVNRT. It may reveal atrial activity for diagnosis. Give a rapid IV bolus because its half life is only a few seconds, with continuous ECG monitoring during administration.',
  avnrtEcg: {
    diagnosis: 'AVNRT',
    pathway: 'slow',
    explanation: 'Typical slow fast AVNRT uses the antegrade slow pathway and has a short RP relation.',
  },
};

describe('Task 3 assessment UI', () => {
  it('resolves task=3 without changing the default interval route', () => {
    expect(resolveAssessmentTask('?mode=assessment&task=3')).toBe('3');
    expect(resolveAssessmentTask('?mode=assessment&task=2')).toBe('2');
    expect(resolveAssessmentTask('?mode=assessment&task=unknown')).toBe('interval');
    expect(resolveAssessmentTask('?mode=assessment')).toBe('interval');
  });

  it('starts with an unanswered response model', () => {
    expect(createEmptyTaskThreeResponses()).toEqual({
      atrialTachycardia: {
        'at-1': { diagnosis: '', side: '' },
        'at-2': { diagnosis: '', side: '' },
        'at-3': { diagnosis: '', side: '' },
      },
      ahJump: {
        'ah-jump-below-50': { identifiesAhJump: null, thresholdClass: '' },
        'ah-jump-above-50': { identifiesAhJump: null, thresholdClass: '' },
      },
      cannonWave: '',
      adenosine: '',
      avnrtEcg: { diagnosis: '', pathway: '', explanation: '' },
    });
  });

  it('renders all six traces while keeping answer-bearing metadata out of student markup', () => {
    const markup = renderToStaticMarkup(<TaskThreeAssessment assessmentView="student" />);
    expect(markup.match(/data-task-three-trace=/g)).toHaveLength(6);
    expect(markup).toContain('EP HEART · TASK 3 · 23 MARKS');
    expect(markup).toContain('Describe a cannon wave in approximately 50 words.');
    expect(markup).toContain('Describe the use of adenosine in approximately 50 words.');
    expect(markup).toContain('decide whether the AH change meets the conventional 50 ms jump criterion');
    expect(markup).not.toContain('Interpret atrial tachycardia ECG 1');
    expect(markup).not.toContain('Interpret the AVNRT ECG');
    expect(markup).not.toContain('Focal atrial tachycardia — left-sided pattern A');
    expect(markup).not.toContain('supports a left atrial focus');
    expect(markup).not.toContain('A2H2 90 ms');
    expect(markup).not.toContain('Typical slow-fast AVNRT: antegrade slow pathway');
    expect(markup).not.toContain('instructor-answer-key');
    expect(markup).toContain('Mark and save Task 3');
    expect(markup).toContain('No marked Task 3 attempts yet.');
    expect(markup).toContain('Copy Task 3 feedback package');
    expect(markup).not.toContain('This preview does not save Task 3 attempts yet.');
  });

  it('shows trace annotations and answer keys only in instructor markup', () => {
    const markup = renderToStaticMarkup(<TaskThreeAssessment assessmentView="instructor" />);
    expect(markup).toContain('instructor-answer-key');
    expect(markup).toContain('V1 positive P-wave pattern supports a left atrial focus.');
    expect(markup).toContain('A2H2 90 ms');
    expect(markup).toContain('Typical slow-fast AVNRT: antegrade slow pathway');
    expect(markup).toContain('/?mode=assessment&amp;task=2&amp;view=instructor');
  });

  it('presents the exact 23-mark score and all section subtotals', () => {
    const result = markTaskThree(completeResponses, taskThreeClinicalRubric);
    const markup = renderToStaticMarkup(<TaskThreeScoreBar result={result} />);
    expect(result.score).toBe(23);
    expect(markup).toContain('23/23');
    expect(markup).toContain('Atrial tachycardia 6/6');
    expect(markup).toContain('AH change 4/4');
    expect(markup).toContain('Cannon wave 5/5');
    expect(markup).toContain('Adenosine 5/5');
    expect(markup).toContain('AVNRT 3/3');
  });
});
