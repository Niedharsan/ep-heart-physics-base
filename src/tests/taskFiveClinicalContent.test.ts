import { describe, expect, it } from 'vitest';
import { taskFiveClinicalRubric } from '../assessment/task5/clinicalRubric';
import { taskFiveTraceCatalog } from '../assessment/task5/traceCatalog';
import { buildTaskFiveTraceRenderModel } from '../assessment/task5/traceRendererModel';

describe('Task 5 clinical content and synthetic traces', () => {
  it('provides two six-lead VT ECGs and one para-Hisian EGM', () => {
    expect(Object.keys(taskFiveTraceCatalog)).toHaveLength(3);
    expect(taskFiveTraceCatalog['wide-complex-ecg-case-1'].channels).toHaveLength(6);
    expect(taskFiveTraceCatalog['wide-complex-ecg-case-2'].channels).toHaveLength(6);
    expect(taskFiveTraceCatalog['paired-pacing-egm-case'].channels).toHaveLength(5);
  });

  it('encodes the intended canonical VT morphology contrasts', () => {
    const rvot = taskFiveTraceCatalog['wide-complex-ecg-case-1'];
    const fascicular = taskFiveTraceCatalog['wide-complex-ecg-case-2'];
    expect(rvot.channels.find((channel) => channel.id === 'lead-v1')?.events.every((event) => event.kind === 'qrs-lbbb')).toBe(true);
    expect(rvot.channels.find((channel) => channel.id === 'lead-avf')?.events.every((event) => event.kind === 'qrs-positive')).toBe(true);
    expect(fascicular.channels.find((channel) => channel.id === 'lead-v1')?.events.every((event) => event.kind === 'qrs-rbbb')).toBe(true);
    expect(fascicular.channels.find((channel) => channel.id === 'lead-avf')?.events.every((event) => event.kind === 'qrs-negative')).toBe(true);
  });

  it('shows neutral pacing-state labels to students and answer annotations only to instructors', () => {
    const definition = taskFiveTraceCatalog['paired-pacing-egm-case'];
    const student = buildTaskFiveTraceRenderModel(definition, 'student');
    const instructor = buildTaskFiveTraceRenderModel(definition, 'instructor');
    expect(student.annotations.map((item) => item.label)).toEqual(['Higher output', 'Lower output']);
    expect(instructor.annotations.map((item) => item.label)).toContain('His/RB + RV capture');
    expect(instructor.annotations.map((item) => item.label)).toContain('S-A 85 ms');
    expect(instructor.annotations.map((item) => item.label)).toContain('Retrograde sequence unchanged');
  });

  it('records the evidence limits instead of presenting the manoeuvre as absolute', () => {
    const evidence = taskFiveClinicalRubric.evidenceBoundary.join(' ');
    expect(evidence).toContain('may mask');
    expect(evidence).toContain('does not prove pathway participation');
  });
});
