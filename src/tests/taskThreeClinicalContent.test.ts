import { describe, expect, it } from 'vitest';
import {
  taskThreeAhJumpCases,
  taskThreeAtrialTachycardiaCases,
  taskThreeAvnrtCase,
} from '../assessment/task3/catalog';
import {
  TASK_THREE_CLINICAL_APPROVAL_NOTE,
  taskThreeClinicalRubric,
  taskThreeClinicalSources,
} from '../assessment/task3/clinicalRubric';
import { markTaskThree } from '../assessment/task3/marking';
import type { TaskThreeResponses } from '../assessment/task3/marking';
import {
  TASK_THREE_EDUCATIONAL_TRACE_LABEL,
  getTaskThreeTraceStructureSignature,
  taskThreeTraceCatalog,
  taskThreeTraceIds,
} from '../assessment/task3/traceCatalog';
import { buildTaskThreeTraceRenderModel } from '../assessment/task3/traceRendererModel';

const completeResponses: TaskThreeResponses = Object.freeze({
  atrialTachycardia: Object.freeze({
    'at-1': Object.freeze({ diagnosis: 'Focal AT', side: 'left' }),
    'at-2': Object.freeze({ diagnosis: 'Atrial tachycardia', side: 'right' }),
    'at-3': Object.freeze({ diagnosis: 'Focal atrial tachycardia', side: 'left' }),
  }),
  ahJump: Object.freeze({
    'ah-jump-below-50': Object.freeze({ identifiesAhJump: false, thresholdClass: 'below-50-ms' }),
    'ah-jump-above-50': Object.freeze({ identifiesAhJump: true, thresholdClass: 'above-50-ms' }),
  }),
  cannonWave: 'A cannon a wave is a giant jugular a wave caused when the right atrium contracts against a closed tricuspid valve during atrioventricular dissociation. It appears intermittently when atrial contraction coincides with ventricular systole.',
  adenosine: 'Adenosine creates transient AV nodal block and terminates AVNRT. It can reveal atrial activity such as flutter. Give it as a rapid intravenous bolus because of its very short half life while recording a multilead ECG.',
  avnrtEcg: Object.freeze({
    diagnosis: 'AVNRT',
    pathway: 'slow',
    explanation: 'This is typical slow fast AVNRT with an antegrade slow pathway and a pseudo r prime in V1.',
  }),
});

describe('Task 3 clinical content and deterministic traces', () => {
  it('maps every trace-bearing assessment item to one of six immutable educational traces', () => {
    const mappedTraceIds = [
      ...taskThreeAtrialTachycardiaCases.map((item) => item.traceId),
      ...taskThreeAhJumpCases.map((item) => item.traceId),
      taskThreeAvnrtCase.traceId,
    ];
    expect(taskThreeTraceIds).toHaveLength(6);
    expect(new Set(mappedTraceIds)).toEqual(new Set(taskThreeTraceIds));
    for (const id of taskThreeTraceIds) {
      expect(taskThreeTraceCatalog[id].teachingLabel).toBe(TASK_THREE_EDUCATIONAL_TRACE_LABEL);
      expect(Object.isFrozen(taskThreeTraceCatalog[id])).toBe(true);
      expect(() => JSON.stringify(taskThreeTraceCatalog[id])).not.toThrow();
    }
  });

  it('keeps every trace structurally distinct and deterministic', () => {
    const signatures = taskThreeTraceIds.map((id) => getTaskThreeTraceStructureSignature(taskThreeTraceCatalog[id]));
    expect(new Set(signatures).size).toBe(taskThreeTraceIds.length);
    const first = buildTaskThreeTraceRenderModel(taskThreeTraceCatalog['ah-change-60-ms']);
    const second = buildTaskThreeTraceRenderModel(taskThreeTraceCatalog['ah-change-60-ms']);
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.channels)).toBe(true);
  });

  it('uses the V1 morphology boundary consistently for the three focal-AT teaching cases', () => {
    const atOne = taskThreeTraceCatalog['at-left-v1-positive'].teachingMetadata;
    const atTwo = taskThreeTraceCatalog['at-right-v1-negative'].teachingMetadata;
    const atThree = taskThreeTraceCatalog['at-left-v1-negative-positive'].teachingMetadata;
    expect(atOne).toMatchObject({ kind: 'atrial-tachycardia', expectedSide: 'left', decisiveMorphology: 'positive' });
    expect(atTwo).toMatchObject({ kind: 'atrial-tachycardia', expectedSide: 'right', decisiveMorphology: 'negative' });
    expect(atThree).toMatchObject({ kind: 'atrial-tachycardia', expectedSide: 'left', decisiveMorphology: 'negative-positive' });
  });

  it('represents a 40 ms subthreshold AH change and a 60 ms conventional AH jump', () => {
    const below = taskThreeTraceCatalog['ah-change-40-ms'].teachingMetadata;
    const above = taskThreeTraceCatalog['ah-change-60-ms'].teachingMetadata;
    expect(below).toMatchObject({
      kind: 'ah-change', baselineCouplingMs: 170, testCouplingMs: 160, couplingDecrementMs: 10,
      baselineAhMs: 90, testAhMs: 130, deltaAhMs: 40,
      thresholdClass: 'below-50-ms', meetsConventionalJumpCriterion: false,
    });
    expect(above).toMatchObject({
      kind: 'ah-change', baselineCouplingMs: 170, testCouplingMs: 160, couplingDecrementMs: 10,
      baselineAhMs: 90, testAhMs: 150, deltaAhMs: 60,
      thresholdClass: 'above-50-ms', meetsConventionalJumpCriterion: true,
    });
  });

  it('defines typical slow-fast AVNRT without exposing instructor annotations to students', () => {
    const definition = taskThreeTraceCatalog['avnrt-slow-fast-short-rp'];
    expect(definition.teachingMetadata).toMatchObject({
      kind: 'avnrt', mechanism: 'slow-fast', expectedAntegradePathway: 'slow',
      rpRelation: 'short-rp', surfaceCue: 'pseudo-r-prime-v1',
    });
    expect(buildTaskThreeTraceRenderModel(definition, 'student').annotations).toHaveLength(0);
    expect(buildTaskThreeTraceRenderModel(definition, 'instructor').annotations.length).toBeGreaterThan(0);
  });

  it('ships an evidence-reviewed production rubric that scores the complete Task 3 response at 23', () => {
    expect(taskThreeClinicalSources.length).toBeGreaterThanOrEqual(6);
    expect(TASK_THREE_CLINICAL_APPROVAL_NOTE).toMatch(/educational assessment content only/i);
    expect(markTaskThree(completeResponses, taskThreeClinicalRubric)).toMatchObject({
      score: 23,
      maximumScore: 23,
    });
  });
});
