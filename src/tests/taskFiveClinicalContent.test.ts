import { describe, expect, it } from 'vitest';
import { taskFiveClinicalRubric } from '../assessment/task5/clinicalRubric';
import { taskFiveTraceCatalog } from '../assessment/task5/traceCatalog';
import { buildTaskFiveTraceRenderModel } from '../assessment/task5/traceRendererModel';

describe('Task 5 clinical content and synthetic traces', () => {
  it('provides two six-lead VT ECGs and one expanded para-Hisian EGM', () => {
    expect(Object.keys(taskFiveTraceCatalog)).toHaveLength(3);
    expect(taskFiveTraceCatalog['wide-complex-ecg-case-1'].channels).toHaveLength(6);
    expect(taskFiveTraceCatalog['wide-complex-ecg-case-2'].channels).toHaveLength(6);
    expect(taskFiveTraceCatalog['paired-pacing-egm-case'].channels).toHaveLength(11);
  });

  it('includes two surface leads, paired His channels and all five CS bipoles', () => {
    const labels = taskFiveTraceCatalog['paired-pacing-egm-case'].channels.map((channel) => channel.label);
    expect(labels).toEqual([
      'II',
      'V1',
      'HRA',
      'His d',
      'His p',
      'RVA',
      'CS 9-10',
      'CS 7-8',
      'CS 5-6',
      'CS 3-4',
      'CS 1-2',
    ]);
  });

  it('encodes the intended canonical VT morphology contrasts', () => {
    const rvot = taskFiveTraceCatalog['wide-complex-ecg-case-1'];
    const fascicular = taskFiveTraceCatalog['wide-complex-ecg-case-2'];
    expect(rvot.channels.find((channel) => channel.id === 'lead-v1')?.events.every((event) => event.kind === 'qrs-lbbb')).toBe(true);
    expect(rvot.channels.find((channel) => channel.id === 'lead-avf')?.events.every((event) => event.kind === 'qrs-positive')).toBe(true);
    expect(fascicular.channels.find((channel) => channel.id === 'lead-v1')?.events.every((event) => event.kind === 'qrs-rbbb')).toBe(true);
    expect(fascicular.channels.find((channel) => channel.id === 'lead-avf')?.events.every((event) => event.kind === 'qrs-negative')).toBe(true);
  });

  it('keeps the paired CS activation sequence identical after output reduction', () => {
    const definition = taskFiveTraceCatalog['paired-pacing-egm-case'];
    for (const channelId of ['cs-proximal', 'cs-78', 'cs-56', 'cs-34', 'cs-distal']) {
      const events = definition.channels.find((channel) => channel.id === channelId)?.events;
      expect(events).toHaveLength(2);
      expect((events?.[1]?.x ?? 0) - (events?.[0]?.x ?? 0)).toBe(340);
    }
  });

  it('shows neutral pacing-state labels to students and answer annotations only to instructors', () => {
    const definition = taskFiveTraceCatalog['paired-pacing-egm-case'];
    const student = buildTaskFiveTraceRenderModel(definition, 'student');
    const instructor = buildTaskFiveTraceRenderModel(definition, 'instructor');
    expect(student.annotations.map((item) => item.label)).toEqual(['Higher output', 'Lower output']);
    expect(instructor.annotations.map((item) => item.label)).toContain('His/RB + ventricular capture');
    expect(instructor.annotations.map((item) => item.label)).toContain('S-A 85 ms');
    expect(instructor.annotations.map((item) => item.label)).toContain('Distal-to-proximal sequence unchanged');
  });

  it('records the evidence limits instead of presenting the manoeuvre as absolute', () => {
    const evidence = taskFiveClinicalRubric.evidenceBoundary.join(' ');
    expect(evidence).toContain('may mask');
    expect(evidence).toContain('does not prove pathway participation');
  });
});
