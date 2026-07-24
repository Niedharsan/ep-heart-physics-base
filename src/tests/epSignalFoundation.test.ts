import { describe, expect, it } from 'vitest';
import {
  EP_SIGNAL_SCHEMA_VERSION,
  EpSignalValidationError,
  assertValidEpSignalScenario,
  assertValidGeneratedEpSignalSet,
  createDeterministicRandom,
  sampleCountForDuration,
  sampleIntervalMs,
  sampleTimeMs,
  validateEpSignalScenario,
  validateGeneratedEpSignalSet,
} from '../epSignal';
import type {
  EpSignalScenarioDefinition,
  GeneratedEpSignalSet,
} from '../epSignal';

function validScenario(): EpSignalScenarioDefinition {
  return {
    schemaVersion: EP_SIGNAL_SCHEMA_VERSION,
    id: 'phase1.sinus-ah',
    title: 'Sinus rhythm AH reference',
    description: 'Minimal deterministic contract fixture with surface ECG and bipolar His electrogram.',
    deterministicSeed: 42,
    acquisition: {
      sampleRateHz: 2000,
      durationMs: 1000,
      highPassHz: 0.5,
      lowPassHz: 500,
      notchHz: 50,
      display: {
        sweepSpeedMmPerSecond: 100,
        gainMmPerMv: 10,
        minorGridMm: 1,
        majorGridMm: 5,
      },
    },
    channels: [
      {
        id: 'surface-ii',
        label: 'II',
        kind: 'surface-ecg',
        unit: 'mV',
        geometry: { type: 'surface-lead', leadName: 'II' },
      },
      {
        id: 'his-distal',
        label: 'His d',
        kind: 'bipolar-egm',
        unit: 'mV',
        geometry: {
          type: 'bipolar',
          positive: {
            id: 'his-d1',
            label: 'His d1',
            positionMm: { x: 0, y: 0, z: 0 },
            diameterMm: 1,
          },
          negative: {
            id: 'his-d2',
            label: 'His d2',
            positionMm: { x: 2, y: 0, z: 0 },
            diameterMm: 1,
          },
        },
      },
    ],
    events: [
      {
        id: 'beat0.atrial-his',
        kind: 'atrial-activation',
        timeMs: 220,
        beatIndex: 0,
        siteId: 'his-region',
        channelIds: ['his-distal'],
      },
      {
        id: 'beat0.his',
        kind: 'his-activation',
        timeMs: 300,
        beatIndex: 0,
        siteId: 'his-bundle',
        channelIds: ['his-distal'],
      },
    ],
    measurements: [
      {
        id: 'ah',
        title: 'AH interval',
        startEventId: 'beat0.atrial-his',
        endEventId: 'beat0.his',
        expectedValueMs: 80,
        toleranceMs: 5,
        allowedStartChannelIds: ['his-distal'],
        allowedEndChannelIds: ['his-distal'],
      },
    ],
    provenance: {
      scenarioVersion: '1.0.0',
      engineModel: 'ep-heart-signal-engine',
      engineVersion: '0.1.0',
      reviewStatus: 'draft',
      sources: [
        {
          id: 'phase1-contract-source',
          citation: 'Phase 1 engineering contract fixture.',
          purpose: 'validation',
        },
      ],
    },
  };
}

function generatedFor(scenario: EpSignalScenarioDefinition): GeneratedEpSignalSet {
  const sampleCount = sampleCountForDuration(
    scenario.acquisition.durationMs,
    scenario.acquisition.sampleRateHz,
  );
  return {
    schemaVersion: EP_SIGNAL_SCHEMA_VERSION,
    scenarioId: scenario.id,
    scenarioVersion: scenario.provenance.scenarioVersion,
    engineVersion: scenario.provenance.engineVersion,
    deterministicSeed: scenario.deterministicSeed,
    sampleRateHz: scenario.acquisition.sampleRateHz,
    durationMs: scenario.acquisition.durationMs,
    sampleCount,
    channels: scenario.channels.map((channel) => ({
      channelId: channel.id,
      unit: 'mV',
      samples: new Float64Array(sampleCount),
    })),
    events: scenario.events,
  };
}

describe('EP signal engine phase 1 foundation', () => {
  it('defines exact sampling semantics including both recording endpoints', () => {
    expect(sampleIntervalMs(2000)).toBe(0.5);
    expect(sampleCountForDuration(1000, 2000)).toBe(2001);
    expect(sampleTimeMs(2000, 2000)).toBe(1000);
  });

  it('provides a reproducible cross-runtime PCG32 random stream', () => {
    const first = createDeterministicRandom(42, 54);
    const second = createDeterministicRandom(42, 54);
    const expected = [
      2707161783,
      2068313097,
      3122475824,
      2211639955,
      3215226955,
      3421331566,
      3217466285,
      2167406445,
    ];
    expect(expected.map(() => first.nextUint32())).toEqual(expected);
    expect(expected.map(() => second.nextUint32())).toEqual(expected);
  });

  it('accepts a coherent versioned scenario and generated Float64 signal set', () => {
    const scenario = validScenario();
    expect(validateEpSignalScenario(scenario)).toEqual([]);
    expect(() => assertValidEpSignalScenario(scenario)).not.toThrow();

    const generated = generatedFor(scenario);
    expect(validateGeneratedEpSignalSet(generated, scenario)).toEqual([]);
    expect(() => assertValidGeneratedEpSignalSet(generated, scenario)).not.toThrow();
  });

  it('rejects duplicate identifiers, impossible filters and inconsistent measurements', () => {
    const current = validScenario();
    const invalid: EpSignalScenarioDefinition = {
      ...current,
      acquisition: {
        ...current.acquisition,
        lowPassHz: 1000,
      },
      channels: [current.channels[0]!, current.channels[0]!],
      measurements: [{
        ...current.measurements[0]!,
        expectedValueMs: 75,
      }],
    };
    const issues = validateEpSignalScenario(invalid);
    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      'invalid-low-pass',
      'duplicate-channel-id',
      'measurement-event-mismatch',
    ]));
    expect(() => assertValidEpSignalScenario(invalid)).toThrow(EpSignalValidationError);
  });

  it('rejects malformed generated arrays before they can reach a renderer or assessment', () => {
    const scenario = validScenario();
    const current = generatedFor(scenario);
    const invalidSamples = current.channels[0]!.samples.slice();
    invalidSamples[12] = Number.NaN;
    const invalid: GeneratedEpSignalSet = {
      ...current,
      channels: [
        { ...current.channels[0]!, samples: invalidSamples },
        { ...current.channels[1]!, samples: new Float64Array(5) },
      ],
    };
    const issues = validateGeneratedEpSignalSet(invalid, scenario);
    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      'non-finite-sample',
      'channel-sample-count-mismatch',
    ]));
    expect(() => assertValidGeneratedEpSignalSet(invalid, scenario)).toThrow(EpSignalValidationError);
  });

  it('warns rather than silently accepting undersampled intracardiac recordings', () => {
    const current = validScenario();
    const lowRate: EpSignalScenarioDefinition = {
      ...current,
      acquisition: {
        ...current.acquisition,
        sampleRateHz: 800,
        lowPassHz: 300,
      },
    };
    expect(validateEpSignalScenario(lowRate)).toContainEqual(expect.objectContaining({
      severity: 'warning',
      code: 'low-intracardiac-sample-rate',
    }));
  });
});
