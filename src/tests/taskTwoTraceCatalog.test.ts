import { describe, expect, it } from 'vitest';
import { buildTraceRenderModel } from '../assessment/task2/traceRendererModel';
import {
  EDUCATIONAL_TRACE_LABEL,
  getTraceStructureSignature,
  taskTwoTraceCatalog,
  taskTwoTraceIds,
} from '../assessment/task2/traceCatalog';

const eventTimes = (traceId: keyof typeof taskTwoTraceCatalog, kinds: readonly string[]) => taskTwoTraceCatalog[traceId].channels
  .flatMap((channel) => channel.events)
  .filter((event) => kinds.includes(event.kind))
  .map((event) => event.x)
  .sort((left, right) => left - right);

describe('Task 2 trace catalog', () => {
  it('defines a structurally distinct trace for every case', () => {
    expect(taskTwoTraceIds).toHaveLength(10);
    const signatures = taskTwoTraceIds.map((id) => getTraceStructureSignature(taskTwoTraceCatalog[id]));
    expect(new Set(signatures).size).toBe(taskTwoTraceIds.length);
  });

  it('builds deterministic immutable rendering data', () => {
    const first = buildTraceRenderModel(taskTwoTraceCatalog.wenckebach);
    const second = buildTraceRenderModel(taskTwoTraceCatalog.wenckebach);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.channels)).toBe(true);
  });

  it('provides accessible metadata and the mandatory teaching label for every trace', () => {
    for (const id of taskTwoTraceIds) {
      const definition = taskTwoTraceCatalog[id];
      expect(definition.title.length).toBeGreaterThan(3);
      expect(definition.description.length).toBeGreaterThan(20);
      expect(definition.teachingLabel).toBe(EDUCATIONAL_TRACE_LABEL);
      expect(definition.channels.every((channel) => channel.label.length > 0)).toBe(true);
    }
  });

  it('keeps ARP and ERP event patterns different', () => {
    expect(getTraceStructureSignature(taskTwoTraceCatalog.arp)).not.toBe(getTraceStructureSignature(taskTwoTraceCatalog.erp));
    expect(eventTimes('arp', ['atrial'])).toHaveLength(3);
    expect(eventTimes('erp', ['atrial'])).toHaveLength(4);
    expect(eventTimes('erp', ['his', 'ventricular']).length).toBeGreaterThan(0);
  });

  it('makes Mobitz I structurally different from Mobitz II', () => {
    const mobitzOneQrs = eventTimes('mobitz-i', ['qrs']);
    const mobitzTwoQrs = eventTimes('mobitz-ii', ['qrs']);
    expect(mobitzOneQrs).not.toEqual(mobitzTwoQrs);
    expect(taskTwoTraceCatalog['mobitz-i'].annotations.filter((item) => item.kind === 'interval').map((item) => item.endX! - item.x))
      .toEqual([25, 35, 45]);
    expect(taskTwoTraceCatalog['mobitz-ii'].annotations.filter((item) => item.kind === 'interval').map((item) => item.endX! - item.x))
      .toEqual([27, 27]);
  });

  it('uses independent atrial and ventricular timing for complete heart block', () => {
    const atrial = eventTimes('complete-heart-block', ['p-wave']);
    const ventricular = eventTimes('complete-heart-block', ['wide-qrs']);
    const atrialIntervals = atrial.slice(1).map((time, index) => time - atrial[index]!);
    const ventricularIntervals = ventricular.slice(1).map((time, index) => time - ventricular[index]!);
    const nearestPrOffsets = ventricular.map((time) => Math.min(...atrial.map((atrialTime) => Math.abs(time - atrialTime))));
    expect(new Set(atrialIntervals)).toEqual(new Set([85]));
    expect(new Set(ventricularIntervals)).toEqual(new Set([145]));
    expect(new Set(nearestPrOffsets).size).toBeGreaterThan(1);
  });
});
