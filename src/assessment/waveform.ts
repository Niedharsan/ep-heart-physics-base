import type {
  EgmBeatLandmarks,
  EgmChannelDefinition,
  EgmScenario,
  IntervalDefinition,
  NormalRange,
} from './types';

const SAMPLE_INTERVAL_MS = 2;

interface Pulse {
  readonly centerMs: number;
  readonly amplitude: number;
  readonly widthMs: number;
  readonly polarity?: number;
}

function gaussian(timeMs: number, centerMs: number, widthMs: number): number {
  const normalized = (timeMs - centerMs) / widthMs;
  return Math.exp(-0.5 * normalized * normalized);
}

function biphasic(timeMs: number, pulse: Pulse): number {
  const polarity = pulse.polarity ?? 1;
  return polarity * pulse.amplitude * (
    gaussian(timeMs, pulse.centerMs - pulse.widthMs * 0.45, pulse.widthMs)
    - 0.82 * gaussian(timeMs, pulse.centerMs + pulse.widthMs * 0.45, pulse.widthMs)
  );
}

function surfaceQrsII(timeMs: number, centerMs: number, amplitude = 1): number {
  return amplitude * (
    -0.24 * gaussian(timeMs, centerMs - 10, 5)
    + 1.0 * gaussian(timeMs, centerMs, 7)
    - 0.52 * gaussian(timeMs, centerMs + 15, 8)
  );
}

function surfaceQrsV1(timeMs: number, centerMs: number, amplitude = 1): number {
  return amplitude * (
    0.22 * gaussian(timeMs, centerMs - 11, 5)
    - 0.92 * gaussian(timeMs, centerMs + 1, 8)
    + 0.36 * gaussian(timeMs, centerMs + 18, 9)
  );
}

function deterministicNoise(index: number, channelIndex: number): number {
  return (
    Math.sin(index * 0.173 + channelIndex * 1.37)
    + 0.45 * Math.sin(index * 0.071 + channelIndex * 0.63)
  ) * 0.006;
}

function createChannelSamples(
  durationMs: number,
  channelIndex: number,
  valueAtTime: (timeMs: number) => number,
): Float64Array {
  const sampleCount = Math.floor(durationMs / SAMPLE_INTERVAL_MS) + 1;
  const samples = new Float64Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const timeMs = index * SAMPLE_INTERVAL_MS;
    samples[index] = valueAtTime(timeMs) + deterministicNoise(index, channelIndex);
  }
  return samples;
}

const channels = Object.freeze([
  { id: 'surface-ii', label: 'II', kind: 'surface' },
  { id: 'surface-v1', label: 'V1', kind: 'surface' },
  { id: 'hra', label: 'HRA', kind: 'intracardiac' },
  { id: 'hbe-distal', label: 'His d', kind: 'intracardiac' },
  { id: 'hbe-proximal', label: 'His p', kind: 'intracardiac' },
  { id: 'rva', label: 'RVA', kind: 'intracardiac' },
  { id: 'cs-proximal', label: 'CS 9-10', kind: 'intracardiac' },
  { id: 'cs-78', label: 'CS 7-8', kind: 'intracardiac' },
  { id: 'cs-56', label: 'CS 5-6', kind: 'intracardiac' },
  { id: 'cs-34', label: 'CS 3-4', kind: 'intracardiac' },
  { id: 'cs-distal', label: 'CS 1-2', kind: 'intracardiac' },
] satisfies readonly EgmChannelDefinition[]);

const paNormalRange: NormalRange = Object.freeze({
  minimumMs: 25,
  maximumMs: 55,
  sourceLabel: 'Kupo 2022, Electrophysiology Study, section 2.4.1',
});

const ahNormalRange: NormalRange = Object.freeze({
  minimumMs: 55,
  maximumMs: 125,
  sourceLabel: 'Murgatroyd, Basic EP Study, section 2.1C',
});

const hvNormalRange: NormalRange = Object.freeze({
  minimumMs: 35,
  maximumMs: 55,
  sourceLabel: 'Murgatroyd, Basic EP Study, section 2.1E',
});

export interface SinusScenarioParameters {
  readonly cycleLengthMs: number;
  readonly ahMs: number;
  readonly hvMs: number;
  readonly prMs: number;
  readonly measurementToleranceMs: number;
}

function validateParameters(parameters: SinusScenarioParameters): void {
  Object.entries(parameters).forEach(([name, value]) => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a finite positive value.`);
    }
  });
  if (parameters.prMs <= parameters.ahMs + parameters.hvMs) {
    throw new Error('PR must exceed AH + HV so that the synthetic atrial reference precedes the His atrial signal.');
  }
  if (parameters.cycleLengthMs <= parameters.prMs + 150) {
    throw new Error('Cycle length is too short for the configured conduction intervals.');
  }
}

function sinusBeats(parameters: SinusScenarioParameters, durationMs: number): readonly EgmBeatLandmarks[] {
  const beats: EgmBeatLandmarks[] = [];
  const firstPOnsetMs = 120;
  for (
    let beatIndex = 0, pOnsetMs = firstPOnsetMs;
    pOnsetMs + parameters.prMs < durationMs;
    beatIndex += 1, pOnsetMs += parameters.cycleLengthMs
  ) {
    const ventricularOnsetMs = pOnsetMs + parameters.prMs;
    const hisOnsetMs = ventricularOnsetMs - parameters.hvMs;
    const atrialHisMs = hisOnsetMs - parameters.ahMs;
    beats.push(Object.freeze({
      beatIndex,
      pOnsetMs,
      atrialHisMs,
      hisOnsetMs,
      ventricularOnsetMs,
    }));
  }
  return Object.freeze(beats);
}

function sinusIntervals(parameters: SinusScenarioParameters): readonly IntervalDefinition[] {
  const hisChannels = Object.freeze(['hbe-distal', 'hbe-proximal']);
  return Object.freeze([
    Object.freeze({
      id: 'PA',
      title: 'PA interval',
      startReference: Object.freeze({
        landmark: 'p-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      endReference: Object.freeze({
        landmark: 'atrial-his',
        allowedChannelIds: hisChannels,
      }),
      expectedValueMs: parameters.prMs - parameters.ahMs - parameters.hvMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      normalRange: paNormalRange,
      studentPrompt: 'Place the start handle at surface P-wave onset and the end handle at the atrial electrogram on a His channel.',
      referencePrompt: 'PA is measured from earliest atrial activation, usually surface P-wave onset, to atrial activation at the AV-node/His region.',
    }),
    Object.freeze({
      id: 'AH',
      title: 'AH interval',
      startReference: Object.freeze({ landmark: 'atrial-his', allowedChannelIds: hisChannels }),
      endReference: Object.freeze({ landmark: 'his-onset', allowedChannelIds: hisChannels }),
      expectedValueMs: parameters.ahMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      normalRange: ahNormalRange,
      studentPrompt: 'Measure from the atrial electrogram to the His electrogram on the same His channel.',
      referencePrompt: 'Measure from the intrinsic atrial deflection on the His channel to the earliest onset of the His electrogram.',
    }),
    Object.freeze({
      id: 'HV',
      title: 'HV interval',
      startReference: Object.freeze({ landmark: 'his-onset', allowedChannelIds: hisChannels }),
      endReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['hbe-distal', 'hbe-proximal', 'surface-ii', 'surface-v1']),
      }),
      expectedValueMs: parameters.hvMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      normalRange: hvNormalRange,
      studentPrompt: 'Measure from the earliest His electrogram to the earliest ventricular activation.',
      referencePrompt: 'Measure from the earliest onset of the His electrogram to the earliest recorded ventricular activation.',
    }),
    Object.freeze({
      id: 'PR',
      title: 'PR interval',
      startReference: Object.freeze({
        landmark: 'p-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      endReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      expectedValueMs: parameters.prMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      studentPrompt: 'Measure from surface P-wave onset to surface QRS onset.',
      referencePrompt: 'Measure from surface P-wave onset to the earliest ventricular activation.',
    }),
    Object.freeze({
      id: 'RR',
      title: 'RR / cycle length',
      startReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      endReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      expectedValueMs: parameters.cycleLengthMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      studentPrompt: 'Measure between equivalent ventricular onsets in consecutive cycles.',
      referencePrompt: 'Measure between equivalent ventricular onsets in consecutive cycles.',
    }),
  ]);
}

const sinusCsOffsets: Readonly<Record<string, number>> = Object.freeze({
  'cs-proximal': 18,
  'cs-78': 22,
  'cs-56': 26,
  'cs-34': 30,
  'cs-distal': 34,
});

function buildSinusWaveforms(
  durationMs: number,
  beats: readonly EgmBeatLandmarks[],
): Readonly<Record<string, Float64Array>> {
  const waveformByChannel: Record<string, Float64Array> = {};

  channels.forEach((channel, channelIndex) => {
    waveformByChannel[channel.id] = createChannelSamples(durationMs, channelIndex, (timeMs) => {
      let value = 0;
      beats.forEach((beat) => {
        const p = beat.pOnsetMs;
        const a = beat.atrialHisMs;
        const h = beat.hisOnsetMs;
        const v = beat.ventricularOnsetMs;
        if (p === undefined || a === undefined || h === undefined) return;

        switch (channel.id) {
          case 'surface-ii':
            value += 0.22 * gaussian(timeMs, p + 18, 18);
            value += surfaceQrsII(timeMs, v, 0.95);
            value += 0.12 * gaussian(timeMs, v + 210, 45);
            break;
          case 'surface-v1':
            value += 0.12 * gaussian(timeMs, p + 16, 16);
            value += surfaceQrsV1(timeMs, v, 0.88);
            value -= 0.08 * gaussian(timeMs, v + 205, 42);
            break;
          case 'hra':
            value += biphasic(timeMs, { centerMs: p + 12, amplitude: 0.76, widthMs: 7 });
            value += 0.06 * surfaceQrsII(timeMs, v, 1);
            break;
          case 'hbe-distal':
            value += biphasic(timeMs, { centerMs: a, amplitude: 0.64, widthMs: 6 });
            value += biphasic(timeMs, { centerMs: h, amplitude: 0.36, widthMs: 3.5, polarity: -1 });
            value += biphasic(timeMs, { centerMs: v, amplitude: 0.90, widthMs: 8 });
            break;
          case 'hbe-proximal':
            value += biphasic(timeMs, { centerMs: a + 4, amplitude: 0.54, widthMs: 6.5 });
            value += biphasic(timeMs, { centerMs: h + 2, amplitude: 0.28, widthMs: 3.8, polarity: -1 });
            value += biphasic(timeMs, { centerMs: v + 2, amplitude: 0.70, widthMs: 8.5 });
            break;
          case 'rva':
            value += biphasic(timeMs, { centerMs: v + 6, amplitude: 1.02, widthMs: 8, polarity: -1 });
            break;
          case 'cs-proximal':
          case 'cs-78':
          case 'cs-56':
          case 'cs-34':
          case 'cs-distal': {
            const offset = sinusCsOffsets[channel.id];
            value += biphasic(timeMs, {
              centerMs: p + (offset ?? 26),
              amplitude: 0.62 - channelIndex * 0.012,
              widthMs: 7,
            });
            value += biphasic(timeMs, {
              centerMs: v + 10 + channelIndex * 0.5,
              amplitude: 0.16,
              widthMs: 9,
            });
            break;
          }
          default:
            break;
        }
      });
      return value;
    });
  });
  return Object.freeze(waveformByChannel);
}

export function createSinusEgmScenario(parameters: SinusScenarioParameters): EgmScenario {
  validateParameters(parameters);
  const durationMs = Math.max(2400, parameters.cycleLengthMs * 4 + 300);
  const beats = sinusBeats(parameters, durationMs);
  if (beats.length < 3) throw new Error('The generated EGM must contain at least three complete beats.');
  return Object.freeze({
    id: 'baseline-sinus-intervals',
    title: 'Baseline sinus conduction',
    description: 'Synthetic educational EGM with two surface leads, paired His channels, RVA and a five-bipole coronary-sinus catheter.',
    mechanismLabel: 'Antegrade A → H → V activation',
    cycleLengthMs: parameters.cycleLengthMs,
    durationMs,
    channels,
    beats,
    intervals: sinusIntervals(parameters),
    waveformByChannel: buildSinusWaveforms(durationMs, beats),
  });
}

export interface RetrogradeScenarioParameters {
  readonly cycleLengthMs: number;
  readonly vaMs: number;
  readonly measurementToleranceMs: number;
}

const retrogradeCsOffsets: Readonly<Record<string, number>> = Object.freeze({
  'cs-proximal': 2,
  'cs-78': 6,
  'cs-56': 10,
  'cs-34': 14,
  'cs-distal': 18,
});

export function createRetrogradeEgmScenario(parameters: RetrogradeScenarioParameters): EgmScenario {
  Object.entries(parameters).forEach(([name, value]) => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a finite positive value.`);
    }
  });
  if (!(parameters.cycleLengthMs > parameters.vaMs + 180)) {
    throw new Error('Retrograde cycle length must exceed VA by at least 180 ms.');
  }

  const durationMs = Math.max(2400, parameters.cycleLengthMs * 4 + 300);
  const beats: EgmBeatLandmarks[] = [];
  for (
    let beatIndex = 0, ventricularOnsetMs = 120;
    ventricularOnsetMs + parameters.vaMs < durationMs;
    beatIndex += 1, ventricularOnsetMs += parameters.cycleLengthMs
  ) {
    beats.push(Object.freeze({
      beatIndex,
      ventricularOnsetMs,
      hisOnsetMs: ventricularOnsetMs + 42,
      retrogradeAtrialOnsetMs: ventricularOnsetMs + parameters.vaMs,
    }));
  }

  const waveformByChannel: Record<string, Float64Array> = {};
  channels.forEach((channel, channelIndex) => {
    waveformByChannel[channel.id] = createChannelSamples(durationMs, channelIndex, (timeMs) => {
      let value = 0;
      beats.forEach((beat) => {
        const v = beat.ventricularOnsetMs;
        const h = beat.hisOnsetMs;
        const a = beat.retrogradeAtrialOnsetMs;
        if (h === undefined || a === undefined) return;

        switch (channel.id) {
          case 'surface-ii':
            value += surfaceQrsII(timeMs, v, 0.96);
            value += 0.16 * gaussian(timeMs, a + 16, 16);
            break;
          case 'surface-v1':
            value += surfaceQrsV1(timeMs, v, 0.92);
            value -= 0.11 * gaussian(timeMs, a + 18, 17);
            break;
          case 'hra':
            value += biphasic(timeMs, { centerMs: a + 8, amplitude: 0.64, widthMs: 7 });
            break;
          case 'hbe-distal':
            value += biphasic(timeMs, { centerMs: v, amplitude: 0.84, widthMs: 8 });
            value += biphasic(timeMs, { centerMs: h, amplitude: 0.34, widthMs: 3.5, polarity: -1 });
            value += biphasic(timeMs, { centerMs: a, amplitude: 0.60, widthMs: 6 });
            break;
          case 'hbe-proximal':
            value += biphasic(timeMs, { centerMs: v + 2, amplitude: 0.72, widthMs: 8 });
            value += biphasic(timeMs, { centerMs: h + 2, amplitude: 0.28, widthMs: 3.8, polarity: -1 });
            value += biphasic(timeMs, { centerMs: a + 2, amplitude: 0.54, widthMs: 6.5 });
            break;
          case 'rva':
            value += biphasic(timeMs, { centerMs: v, amplitude: 1.04, widthMs: 8, polarity: -1 });
            break;
          case 'cs-proximal':
          case 'cs-78':
          case 'cs-56':
          case 'cs-34':
          case 'cs-distal': {
            const offset = retrogradeCsOffsets[channel.id];
            value += biphasic(timeMs, {
              centerMs: a + (offset ?? 10),
              amplitude: 0.72 - channelIndex * 0.012,
              widthMs: 7,
            });
            break;
          }
          default:
            break;
        }
      });
      return value;
    });
  });

  const intervals: readonly IntervalDefinition[] = Object.freeze([
    Object.freeze({
      id: 'VA',
      title: 'VA interval',
      startReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['rva', 'surface-ii', 'surface-v1']),
      }),
      endReference: Object.freeze({
        landmark: 'retrograde-atrial-onset',
        allowedChannelIds: Object.freeze(['hbe-distal', 'hbe-proximal', 'cs-proximal']),
      }),
      expectedValueMs: parameters.vaMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      studentPrompt: 'Measure from ventricular onset to the earliest retrograde atrial electrogram.',
      referencePrompt: 'Measure from the earliest ventricular onset to the earliest retrograde atrial onset.',
    }),
    Object.freeze({
      id: 'RR',
      title: 'RR / pacing cycle length',
      startReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      endReference: Object.freeze({
        landmark: 'ventricular-onset',
        allowedChannelIds: Object.freeze(['surface-ii', 'surface-v1']),
      }),
      expectedValueMs: parameters.cycleLengthMs,
      measurementToleranceMs: parameters.measurementToleranceMs,
      landmarkToleranceMs: 12,
      studentPrompt: 'Measure the paced RR / cycle length.',
      referencePrompt: 'Measure between equivalent ventricular onsets in consecutive paced cycles.',
    }),
  ]);

  return Object.freeze({
    id: 'retrograde-va-study',
    title: 'Retrograde VA study',
    description: 'Synthetic ventricular-paced EGM with two surface leads and a complete five-bipole coronary-sinus activation sequence.',
    mechanismLabel: 'Retrograde V → H → A activation',
    cycleLengthMs: parameters.cycleLengthMs,
    durationMs,
    channels,
    beats: Object.freeze(beats),
    intervals,
    waveformByChannel: Object.freeze(waveformByChannel),
  });
}

export const waveformSampleIntervalMs = SAMPLE_INTERVAL_MS;
