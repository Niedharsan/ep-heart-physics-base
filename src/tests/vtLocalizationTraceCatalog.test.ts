import { describe, expect, it } from 'vitest';
import { vtLocalizationTraceCatalog } from '../assessment/task5/vtLocalizationTraceCatalog';

function channel(taskId: '6' | '7' | '8', label: string) {
  const found = vtLocalizationTraceCatalog[taskId].channels.find((item) => item.label === label);
  if (!found) throw new Error(`Missing ${label} in Task ${taskId}`);
  return found;
}

function eventKinds(taskId: '6' | '7' | '8', label: string): string[] {
  return channel(taskId, label).events.map((event) => event.kind);
}

describe('Class 6 live ECG catalogue', () => {
  it('provides complete 12-lead live traces for Tasks 6-8', () => {
    const expectedLeads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    for (const taskId of ['6', '7', '8'] as const) {
      expect(vtLocalizationTraceCatalog[taskId].channels.map((item) => item.label)).toEqual(expectedLeads);
      expect(vtLocalizationTraceCatalog[taskId].channels.every((item) => item.signalClass === 'surface')).toBe(true);
    }
  });

  it('preserves the page 19 teaching cues in the live Task 6 trace', () => {
    expect(eventKinds('6', 'V1')).toContain('qrs-rbbb');
    for (const label of ['II', 'III', 'aVF']) expect(eventKinds('6', label)).toContain('qrs-negative');
    for (const label of ['aVR', 'aVL']) expect(eventKinds('6', label)).toContain('qrs-positive');
  });

  it('preserves the page 20 teaching cues in the live Task 7 trace', () => {
    expect(eventKinds('7', 'V1')).toContain('qrs-rbbb');
    for (const label of ['II', 'III', 'aVF']) expect(eventKinds('7', label)).toContain('qrs-positive');
    expect(eventKinds('7', 'aVR')).toContain('qrs-negative');
    expect(eventKinds('7', 'aVL')).toContain('qrs-positive');
  });

  it('makes Task 8 a recurring-PVC live ECG with a V3/V4 transition', () => {
    const v1Pvc = channel('8', 'V1').events.find((event) => event.id.includes('pvc'));
    const v3Pvc = channel('8', 'V3').events.find((event) => event.id.includes('pvc'));
    const v4Pvc = channel('8', 'V4').events.find((event) => event.id.includes('pvc'));
    if (!v1Pvc || !v3Pvc || !v4Pvc) throw new Error('Task 8 PVC events are required.');

    expect(v1Pvc.kind).toBe('qrs-lbbb');
    expect(v1Pvc.amplitudeScale).toBeLessThan(0);
    expect(v3Pvc.amplitudeScale).toBeLessThan(0);
    expect(v4Pvc.amplitudeScale).toBeGreaterThan(0);
    for (const label of ['II', 'III', 'aVF']) {
      const pvc = channel('8', label).events.find((event) => event.id.includes('pvc'));
      expect(pvc?.amplitudeScale).toBeGreaterThan(0);
    }
  });
});
