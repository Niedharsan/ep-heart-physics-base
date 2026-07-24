import { describe, expect, it } from 'vitest';
import {
  createRetrogradeEgmScenario,
  createSinusEgmScenario,
} from '../assessment/waveform';

const expectedLabels = [
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
];

describe('expanded interval-trainer EGM channels', () => {
  it('creates the complete 11-channel sinus recording', () => {
    const scenario = createSinusEgmScenario({
      cycleLengthMs: 700,
      ahMs: 80,
      hvMs: 45,
      prMs: 180,
      measurementToleranceMs: 5,
    });
    expect(scenario.channels.map((channel) => channel.label)).toEqual(expectedLabels);
    expect(Object.keys(scenario.waveformByChannel)).toHaveLength(11);
    scenario.channels.forEach((channel) => {
      expect(scenario.waveformByChannel[channel.id]?.length).toBeGreaterThan(1000);
    });
  });

  it('creates distinct CS signals instead of duplicated arrays', () => {
    const scenario = createSinusEgmScenario({
      cycleLengthMs: 700,
      ahMs: 80,
      hvMs: 45,
      prMs: 180,
      measurementToleranceMs: 5,
    });
    const proximal = scenario.waveformByChannel['cs-proximal'];
    const distal = scenario.waveformByChannel['cs-distal'];
    expect(proximal).toBeDefined();
    expect(distal).toBeDefined();
    expect(Array.from(proximal ?? [])).not.toEqual(Array.from(distal ?? []));
  });

  it('creates the same complete channel set for retrograde VA training', () => {
    const scenario = createRetrogradeEgmScenario({
      cycleLengthMs: 700,
      vaMs: 90,
      measurementToleranceMs: 5,
    });
    expect(scenario.channels.map((channel) => channel.label)).toEqual(expectedLabels);
    expect(scenario.intervals.map((interval) => interval.id)).toEqual(['VA', 'RR']);
  });
});
