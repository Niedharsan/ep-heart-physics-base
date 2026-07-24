import type { GeneratedEpSignalChannel } from './contracts';
import { createDeterministicRandom } from './deterministic';
import type { EpAcquisitionProcessingRequest, EpAcquisitionProcessingResult } from './acquisitionContracts';
import { assertValidEpRecorderProfile } from './acquisitionValidation';

function mean(values: Float64Array): number {
  let sum = 0;
  for (const value of values) sum += value;
  return values.length ? sum / values.length : 0;
}

function lowPassOnePole(input: Float64Array, sampleRateHz: number, cutoffHz: number): Float64Array {
  const output = new Float64Array(input.length);
  if (!input.length) return output;
  const dt = 1 / sampleRateHz;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);
  output[0] = input[0]!;
  for (let i = 1; i < input.length; i += 1) output[i] = output[i - 1]! + alpha * (input[i]! - output[i - 1]!);
  return output;
}

function highPassOnePole(input: Float64Array, sampleRateHz: number, cutoffHz: number): Float64Array {
  const output = new Float64Array(input.length);
  if (!input.length || cutoffHz === 0) return input.slice();
  const dt = 1 / sampleRateHz;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = rc / (rc + dt);
  for (let i = 1; i < input.length; i += 1) output[i] = alpha * (output[i - 1]! + input[i]! - input[i - 1]!);
  return output;
}

function notchBiquad(input: Float64Array, sampleRateHz: number, frequencyHz: number, q = 30): Float64Array {
  const output = new Float64Array(input.length);
  const w0 = 2 * Math.PI * frequencyHz / sampleRateHz;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = 1;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const x0 = input[i]!;
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    output[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return output;
}

function gaussian(random: ReturnType<typeof createDeterministicRandom>): number {
  const u1 = Math.max(Number.MIN_VALUE, random.nextFloat());
  const u2 = random.nextFloat();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function addNoise(input: Float64Array, sampleRateHz: number, seed: number, channelIndex: number, request: EpAcquisitionProcessingRequest): Float64Array {
  const output = input.slice();
  const random = createDeterministicRandom(seed, 1000 + channelIndex);
  const noise = request.recorder.noise;
  const mainsHz = request.notchHz ?? 50;
  const mainsPhase = noise.mainsPhaseRadians ?? 0;
  for (let i = 0; i < output.length; i += 1) {
    const t = i / sampleRateHz;
    output[i] = output[i]!
      + noise.whiteNoiseRmsMv * gaussian(random)
      + noise.baselineWanderAmplitudeMv * Math.sin(2 * Math.PI * noise.baselineWanderHz * t + channelIndex * 0.31)
      + noise.mainsAmplitudeMv * Math.sin(2 * Math.PI * mainsHz * t + mainsPhase + channelIndex * 0.17);
  }
  return output;
}

function quantizeAndClip(input: Float64Array, rangeMv: number, bits: number | null): { samples: Float64Array; clipped: number } {
  const output = new Float64Array(input.length);
  const max = rangeMv;
  const min = -rangeMv;
  const levels = bits === null ? null : 2 ** bits - 1;
  let clipped = 0;
  for (let i = 0; i < input.length; i += 1) {
    let value = input[i]!;
    if (value > max) { value = max; clipped += 1; }
    else if (value < min) { value = min; clipped += 1; }
    if (levels !== null) value = min + Math.round((value - min) / (max - min) * levels) / levels * (max - min);
    output[i] = value;
  }
  return { samples: output, clipped };
}

export function processEpAcquisition(request: EpAcquisitionProcessingRequest): EpAcquisitionProcessingResult {
  const { signalSet, recorder } = request;
  assertValidEpRecorderProfile(recorder, signalSet.sampleRateHz, request.lowPassHz, request.highPassHz, request.notchHz);
  let clippedSampleCount = 0;
  const channels: GeneratedEpSignalChannel[] = signalSet.channels.map((channel, channelIndex) => {
    let samples = addNoise(channel.samples, signalSet.sampleRateHz, signalSet.deterministicSeed, channelIndex, request);
    if (recorder.removeDcOffset) {
      const dc = mean(samples);
      samples = Float64Array.from(samples, (value) => value - dc);
    }
    if (request.highPassHz !== null && request.highPassHz > 0) samples = highPassOnePole(samples, signalSet.sampleRateHz, request.highPassHz);
    samples = lowPassOnePole(samples, signalSet.sampleRateHz, request.lowPassHz);
    if (request.notchHz !== null) samples = notchBiquad(samples, signalSet.sampleRateHz, request.notchHz);
    const finalized = quantizeAndClip(samples, recorder.inputRangeMv, recorder.resolutionBits);
    clippedSampleCount += finalized.clipped;
    return Object.freeze({ channelId: channel.channelId, unit: channel.unit, samples: finalized.samples });
  });
  return Object.freeze({
    signalSet: Object.freeze({ ...signalSet, channels: Object.freeze(channels) }),
    clippedSampleCount,
  });
}
