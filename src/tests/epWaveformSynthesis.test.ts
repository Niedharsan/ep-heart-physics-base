import { describe, expect, it } from 'vitest';
import {
  EP_SIGNAL_SCHEMA_VERSION,
  EP_WAVEFORM_SCHEMA_VERSION,
  assertValidGeneratedEpSignalSet,
  synthesizeEpWaveforms,
  validateEpWaveformModel,
} from '../epSignal';
import type {
  EpSignalScenarioDefinition,
  EpWaveformSynthesisDefinition,
} from '../epSignal';

function scenario(): EpSignalScenarioDefinition {
  return {
    schemaVersion: EP_SIGNAL_SCHEMA_VERSION,
    id: 'phase3.sinus-egm',
    title: 'Phase 3 sinus waveform fixture',
    description: 'Surface and intracardiac waveform synthesis fixture.',
    deterministicSeed: 42,
    acquisition: {
      sampleRateHz: 2000,
      durationMs: 800,
      highPassHz: 0.5,
      lowPassHz: 500,
      notchHz: 50,
      display: { sweepSpeedMmPerSecond: 100, gainMmPerMv: 10, minorGridMm: 1, majorGridMm: 5 },
    },
    channels: [
      { id: 'surface-ii', label: 'II', kind: 'surface-ecg', unit: 'mV', geometry: { type: 'surface-lead', leadName: 'II' } },
      {
        id: 'his-d', label: 'His d', kind: 'bipolar-egm', unit: 'mV', geometry: {
          type: 'bipolar',
          positive: { id: 'his-d1', label: 'His d1', positionMm: { x: 0, y: 0, z: 0 } },
          negative: { id: 'his-d2', label: 'His d2', positionMm: { x: 2, y: 0, z: 0 } },
        },
      },
      {
        id: 'rva-u', label: 'RVA u', kind: 'unipolar-egm', unit: 'mV', geometry: {
          type: 'unipolar',
          contact: { id: 'rva-1', label: 'RVA 1', positionMm: { x: 28, y: 0, z: 0 } },
          referenceLabel: 'Wilson central terminal',
        },
      },
      { id: 'stim', label: 'Stim', kind: 'stimulus', unit: 'mV', geometry: { type: 'stimulus' } },
    ],
    events: [
      { id: 'beat0.a', kind: 'atrial-activation', timeMs: 200, beatIndex: 0, siteId: 'right-atrium' },
      { id: 'beat0.h', kind: 'his-activation', timeMs: 280, beatIndex: 0, siteId: 'his-bundle' },
      { id: 'beat0.v', kind: 'ventricular-activation', timeMs: 330, beatIndex: 0, siteId: 'ventricle' },
      { id: 'beat0.t', kind: 'repolarization', timeMs: 560, beatIndex: 0, siteId: 'ventricle' },
      { id: 'stim0', kind: 'pacing-stimulus', timeMs: 700, beatIndex: 1, siteId: 'rva', channelIds: ['stim', 'rva-u'] },
    ],
    measurements: [],
    provenance: {
      scenarioVersion: '1.0.0', engineModel: 'ep-heart-signal-engine', engineVersion: '0.3.0', reviewStatus: 'draft',
      sources: [{ id: 'phase3-fixture', citation: 'Phase 3 deterministic engineering fixture.', purpose: 'validation' }],
    },
  };
}

function model(): EpWaveformSynthesisDefinition {
  return {
    schemaVersion: EP_WAVEFORM_SCHEMA_VERSION,
    id: 'phase3.reference-model',
    modelVersion: '1.0.0',
    conductivityScale: 120,
    minimumDistanceMm: 2,
    stimulusArtifact: { amplitudeMv: 5, decayTimeConstantMs: 0.8, oppositeLobeScale: 0.75, oppositeLobeDelayMs: 1 },
    sources: [
      {
        id: 'atrial', label: 'Atrial depolarization', eventKind: 'atrial-activation', siteId: 'right-atrium',
        positionMm: { x: -8, y: 0, z: 0 }, dipoleDirection: { x: 1, y: 0.3, z: 0 }, amplitudeMv: 1,
        kernel: { kind: 'gaussian', widthMs: 18 }, surfaceLeadWeights: { II: 0.16 }, farFieldScale: 0.05,
      },
      {
        id: 'his', label: 'His potential', eventKind: 'his-activation', siteId: 'his-bundle',
        positionMm: { x: 1, y: 1, z: 0 }, dipoleDirection: { x: 1, y: 0, z: 0 }, amplitudeMv: 0.45,
        kernel: { kind: 'gaussian-derivative', widthMs: 2.2, order: 1 }, surfaceLeadWeights: { II: 0.01 },
      },
      {
        id: 'ventricular', label: 'Ventricular depolarization', eventKind: 'ventricular-activation', siteId: 'ventricle',
        positionMm: { x: 24, y: 0, z: 0 }, dipoleDirection: { x: 1, y: 0, z: 0 }, amplitudeMv: 1.8,
        kernel: { kind: 'difference-of-gaussians', narrowWidthMs: 9, broadWidthMs: 22, broadScale: 0.45 }, surfaceLeadWeights: { II: 0.65 },
      },
      {
        id: 'repolarization', label: 'Ventricular repolarization', eventKind: 'repolarization', siteId: 'ventricle',
        positionMm: { x: 24, y: 0, z: 0 }, dipoleDirection: { x: -1, y: 0, z: 0 }, amplitudeMv: -0.5,
        kernel: { kind: 'gaussian', widthMs: 42 }, surfaceLeadWeights: { II: 0.55 }, farFieldScale: 0.03,
      },
    ],
  };
}

function peakAbs(samples: Float64Array, first = 0, last = samples.length): number {
  let peak = 0;
  for (let index = first; index < last; index += 1) peak = Math.max(peak, Math.abs(samples[index]!));
  return peak;
}

describe('EP signal engine phase 3 waveform synthesis', () => {
  it('generates deterministic finite Float64 channels compatible with the phase 1 contract', () => {
    const currentScenario = scenario();
    const first = synthesizeEpWaveforms({ scenario: currentScenario, model: model() });
    const second = synthesizeEpWaveforms({ scenario: currentScenario, model: model() });
    expect(first.matchedEventCount).toBe(5);
    expect(first.unmatchedEventIds).toEqual([]);
    expect(first.signalSet.channels.every((channel) => channel.samples instanceof Float64Array)).toBe(true);
    expect(Array.from(first.signalSet.channels[0]!.samples)).toEqual(Array.from(second.signalSet.channels[0]!.samples));
    expect(() => assertValidGeneratedEpSignalSet(first.signalSet, currentScenario)).not.toThrow();
  });

  it('places surface P, QRS and T energy near their activation events', () => {
    const result = synthesizeEpWaveforms({ scenario: scenario(), model: model() });
    const samples = result.signalSet.channels.find((channel) => channel.channelId === 'surface-ii')!.samples;
    expect(peakAbs(samples, 360, 440)).toBeGreaterThan(0.1); // P around 200 ms
    expect(peakAbs(samples, 620, 700)).toBeGreaterThan(0.5); // QRS around 330 ms
    expect(peakAbs(samples, 1040, 1200)).toBeGreaterThan(0.1); // T around 560 ms
  });

  it('makes a near-field His bipole more sensitive to the His source than the surface lead', () => {
    const result = synthesizeEpWaveforms({ scenario: scenario(), model: model() });
    const his = result.signalSet.channels.find((channel) => channel.channelId === 'his-d')!.samples;
    const surface = result.signalSet.channels.find((channel) => channel.channelId === 'surface-ii')!.samples;
    expect(peakAbs(his, 540, 580)).toBeGreaterThan(peakAbs(surface, 540, 580) * 10);
  });

  it('computes bipolar morphology as the difference of two unipolar contact fields', () => {
    const current = scenario();
    const result = synthesizeEpWaveforms({ scenario: current, model: model() });
    const bipolar = result.signalSet.channels.find((channel) => channel.channelId === 'his-d')!.samples;
    expect(peakAbs(bipolar)).toBeGreaterThan(0);
    expect(bipolar.some((value) => value > 0)).toBe(true);
    expect(bipolar.some((value) => value < 0)).toBe(true);
  });

  it('adds a localized pacing artifact with reduced surface amplitude', () => {
    const result = synthesizeEpWaveforms({ scenario: scenario(), model: model() });
    const stimulus = result.signalSet.channels.find((channel) => channel.channelId === 'stim')!.samples;
    const surface = result.signalSet.channels.find((channel) => channel.channelId === 'surface-ii')!.samples;
    const first = 1398;
    const last = 1425;
    expect(peakAbs(stimulus, first, last)).toBeGreaterThan(peakAbs(surface, first, last) * 5);
  });

  it('rejects malformed source geometry and kernel widths', () => {
    const current = model();
    const invalid: EpWaveformSynthesisDefinition = {
      ...current,
      sources: [{ ...current.sources[0]!, dipoleDirection: { x: 0, y: 0, z: 0 }, kernel: { kind: 'gaussian', widthMs: 0 } }],
    };
    expect(validateEpWaveformModel(invalid).map((item) => item.code)).toEqual(expect.arrayContaining([
      'zero-waveform-source-direction',
      'invalid-kernel-width',
    ]));
  });
});
