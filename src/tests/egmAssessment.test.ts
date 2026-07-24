import { describe, expect, it } from 'vitest';
import { classifyInterval, markIntervalMeasurement } from '../assessment/marking';
import { createRetrogradeEgmScenario, createSinusEgmScenario } from '../assessment/waveform';

function sinusScenario() {
  return createSinusEgmScenario({
    cycleLengthMs: 700,
    ahMs: 80,
    hvMs: 45,
    prMs: 180,
    measurementToleranceMs: 5,
  });
}

describe('deterministic EGM assessment', () => {
  it('generates deterministic multi-channel sinus traces and landmarks', () => {
    const first = sinusScenario();
    const second = sinusScenario();
    expect(first.channels.map((channel) => channel.label)).toEqual([
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
    expect(first.beats.length).toBeGreaterThanOrEqual(3);
    expect([...first.waveformByChannel['hbe-distal']!]).toEqual([...second.waveformByChannel['hbe-distal']!]);
    const beat = first.beats[0]!;
    expect(beat.hisOnsetMs! - beat.atrialHisMs!).toBe(80);
    expect(beat.ventricularOnsetMs - beat.hisOnsetMs!).toBe(45);
    expect(beat.ventricularOnsetMs - beat.pOnsetMs!).toBe(180);
    const pa = first.intervals.find((interval) => interval.id === 'PA')!;
    expect(pa.expectedValueMs).toBe(55);
    expect(pa.normalRange).toMatchObject({ minimumMs: 25, maximumMs: 55 });
  });

  it('awards two marks only when channels, timing, measurement and classification are correct', () => {
    const scenario = sinusScenario();
    const definition = scenario.intervals.find((interval) => interval.id === 'AH')!;
    const beat = scenario.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: scenario.beats,
      calipers: {
        start: { timeMs: beat.atrialHisMs! + 2, channelId: 'hbe-distal' },
        end: { timeMs: beat.hisOnsetMs! - 1, channelId: 'hbe-distal' },
      },
      reportedValueMs: 79,
      classification: 'normal',
    });
    expect(result.landmarkStatus).toBe('correct');
    expect(result.channelSelectionCorrect).toBe(true);
    expect(result.timingSelectionCorrect).toBe(true);
    expect(result.measurementCorrect).toBe(true);
    expect(result.classificationCorrect).toBe(true);
    expect(result.score).toBe(2);
    expect(result.maximumScore).toBe(2);
  });

  it('gives zero for the whole item when anatomical timing is wrong', () => {
    const scenario = sinusScenario();
    const definition = scenario.intervals.find((interval) => interval.id === 'AH')!;
    const beat = scenario.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: scenario.beats,
      calipers: {
        start: { timeMs: beat.atrialHisMs!, channelId: 'hbe-distal' },
        end: { timeMs: beat.ventricularOnsetMs, channelId: 'hbe-distal' },
      },
      reportedValueMs: 80,
      classification: 'normal',
    });
    expect(result.landmarkStatus).toBe('incorrect');
    expect(result.timingSelectionCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it('uses the source-derived AH and HV ranges without inventing PR or RR ranges', () => {
    const scenario = sinusScenario();
    const ah = scenario.intervals.find((interval) => interval.id === 'AH')!;
    const hv = scenario.intervals.find((interval) => interval.id === 'HV')!;
    const pr = scenario.intervals.find((interval) => interval.id === 'PR')!;
    const rr = scenario.intervals.find((interval) => interval.id === 'RR')!;
    expect(ah.normalRange).toMatchObject({ minimumMs: 55, maximumMs: 125 });
    expect(hv.normalRange).toMatchObject({ minimumMs: 35, maximumMs: 55 });
    expect(classifyInterval(45, hv)).toBe('normal');
    expect(classifyInterval(70, hv)).toBe('abnormal');
    expect(pr.normalRange).toBeUndefined();
    expect(rr.normalRange).toBeUndefined();
  });

  it('supports retrograde VA channel-aware landmark marking but leaves classification unscored', () => {
    const scenario = createRetrogradeEgmScenario({
      cycleLengthMs: 650,
      vaMs: 90,
      measurementToleranceMs: 5,
    });
    const definition = scenario.intervals.find((interval) => interval.id === 'VA')!;
    const beat = scenario.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: scenario.beats,
      calipers: {
        start: { timeMs: beat.ventricularOnsetMs, channelId: 'rva' },
        end: { timeMs: beat.retrogradeAtrialOnsetMs!, channelId: 'hbe-distal' },
      },
      reportedValueMs: 90,
    });
    expect(result.landmarkStatus).toBe('correct');
    expect(result.score).toBe(1);
    expect(result.maximumScore).toBe(1);
    expect(result.classificationAssessed).toBe(false);
  });

  it('rejects physiologically inconsistent synthetic timing configuration', () => {
    expect(() => createSinusEgmScenario({
      cycleLengthMs: 500,
      ahMs: 100,
      hvMs: 60,
      prMs: 150,
      measurementToleranceMs: 5,
    })).toThrow(/PR must exceed AH \+ HV/);
  });
});
