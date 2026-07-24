import { describe, expect, it } from 'vitest';
import { processEpAcquisition, validateEpRecorderProfile } from '../epSignal';
import type { EpAcquisitionProcessingRequest, GeneratedEpSignalSet } from '../epSignal';

function signalSet(samples: Float64Array): GeneratedEpSignalSet {
  return {
    schemaVersion: 1,
    scenarioId: 'phase4.test',
    scenarioVersion: '1.0.0',
    engineVersion: '0.4.0',
    deterministicSeed: 42,
    sampleRateHz: 1000,
    durationMs: (samples.length - 1),
    sampleCount: samples.length,
    channels: [{ channelId: 'egm', unit: 'mV', samples }],
    events: [],
  };
}

function request(samples: Float64Array): EpAcquisitionProcessingRequest {
  return {
    signalSet: signalSet(samples),
    highPassHz: 0.5,
    lowPassHz: 200,
    notchHz: 50,
    recorder: {
      version: 1,
      id: 'phase4-recorder',
      inputRangeMv: 5,
      resolutionBits: 16,
      removeDcOffset: true,
      noise: {
        whiteNoiseRmsMv: 0.01,
        baselineWanderAmplitudeMv: 0.05,
        baselineWanderHz: 0.3,
        mainsAmplitudeMv: 0.02,
      },
    },
  };
}

describe('EP acquisition processing', () => {
  it('is deterministic for the same seed and recorder settings', () => {
    const first = processEpAcquisition(request(new Float64Array(1001))).signalSet.channels[0]!.samples;
    const second = processEpAcquisition(request(new Float64Array(1001))).signalSet.channels[0]!.samples;
    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('does not mutate the physiological input samples', () => {
    const input = new Float64Array([0, 1, 0, -1, 0]);
    const copy = input.slice();
    processEpAcquisition({ ...request(input), highPassHz: null, notchHz: null });
    expect(Array.from(input)).toEqual(Array.from(copy));
  });

  it('clips to the symmetric recorder range and reports clipping', () => {
    const current = request(new Float64Array([0, 10, -10]));
    const result = processEpAcquisition({
      ...current,
      highPassHz: null,
      lowPassHz: 499,
      notchHz: null,
      recorder: { ...current.recorder, removeDcOffset: false, inputRangeMv: 1, resolutionBits: null, noise: { whiteNoiseRmsMv: 0, baselineWanderAmplitudeMv: 0, baselineWanderHz: 0, mainsAmplitudeMv: 0 } },
    });
    expect(result.clippedSampleCount).toBeGreaterThan(0);
    expect(Math.max(...result.signalSet.channels[0]!.samples)).toBeLessThanOrEqual(1);
    expect(Math.min(...result.signalSet.channels[0]!.samples)).toBeGreaterThanOrEqual(-1);
  });

  it('quantizes samples when an ADC resolution is configured', () => {
    const current = request(new Float64Array([0.123456, -0.654321]));
    const result = processEpAcquisition({ ...current, highPassHz: null, notchHz: null, recorder: { ...current.recorder, removeDcOffset: false, inputRangeMv: 1, resolutionBits: 8, noise: { whiteNoiseRmsMv: 0, baselineWanderAmplitudeMv: 0, baselineWanderHz: 0, mainsAmplitudeMv: 0 } } });
    const step = 2 / 255;
    for (const value of result.signalSet.channels[0]!.samples) {
      const index = (value + 1) / step;
      expect(Math.abs(index - Math.round(index))).toBeLessThan(1e-9);
    }
  });

  it('rejects impossible recorder and filter settings', () => {
    const issues = validateEpRecorderProfile({ version: 1, id: 'BAD ID', inputRangeMv: -1, resolutionBits: 4, removeDcOffset: true, noise: { whiteNoiseRmsMv: -1, baselineWanderAmplitudeMv: 1, baselineWanderHz: 0, mainsAmplitudeMv: 0 } }, 1000, 600, 700, 60);
    expect(issues.length).toBeGreaterThanOrEqual(5);
  });
});
