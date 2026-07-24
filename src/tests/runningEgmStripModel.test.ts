import { describe, expect, it } from 'vitest';
import { adaptLegacyTrace } from '../assessment/traces/clinicalTrace';
import { buildClinicalTracePath } from '../assessment/traces/clinicalSignalModel';

const legacyTrace = {
  id: 'test-trace',
  title: 'Test tracing',
  description: 'Test description',
  teachingLabel: 'Synthetic educational tracing.',
  channels: [
    {
      id: 'lead-ii',
      label: 'II',
      events: [
        { id: 'p1', kind: 'p-wave', x: 120 },
        { id: 'q1', kind: 'qrs', x: 160 },
      ],
    },
    {
      id: 'his',
      label: 'His',
      events: [
        { id: 'a1', kind: 'atrial', x: 130 },
        { id: 'h1', kind: 'his', x: 150 },
        { id: 'v1', kind: 'ventricular', x: 170 },
      ],
    },
  ],
  annotations: [
    { id: 'cue', label: 'Teaching cue', x: 130, endX: 150, channelId: 'his', visibility: 'student' },
  ],
} as const;

describe('clinical running trace model', () => {
  it('normalises legacy task catalogues into one shared clinical trace schema', () => {
    const trace = adaptLegacyTrace(legacyTrace, { mode: 'mixed', durationMs: 4000 });

    expect(trace.channels[0]?.signalClass).toBe('surface');
    expect(trace.channels[1]?.signalClass).toBe('intracardiac');
    expect(trace.channels[0]?.events[0]?.timeMs).toBeGreaterThan(0);
    expect(trace.channels[0]?.events[1]?.timeMs).toBeGreaterThan(
      trace.channels[0]?.events[0]?.timeMs ?? 0,
    );
    expect(trace.annotations[0]?.endTimeMs).toBeGreaterThan(trace.annotations[0]?.timeMs ?? 0);
    expect(trace.annotations[0]?.visibility).toBe('student');
  });

  it('builds deterministic finite waveform paths with clinical morphology', () => {
    const trace = adaptLegacyTrace(legacyTrace, { mode: 'mixed', durationMs: 4000 });
    const surface = trace.channels[0];
    const intracardiac = trace.channels[1];

    expect(surface).toBeDefined();
    expect(intracardiac).toBeDefined();

    const surfacePath = buildClinicalTracePath(trace, surface!, 40, 800);
    const intracardiacPath = buildClinicalTracePath(trace, intracardiac!, 90, 800);

    expect(surfacePath.startsWith('M ')).toBe(true);
    expect(intracardiacPath.startsWith('M ')).toBe(true);
    expect(surfacePath).not.toContain('NaN');
    expect(intracardiacPath).not.toContain('Infinity');
    expect(surfacePath).not.toBe(intracardiacPath);
  });
});
