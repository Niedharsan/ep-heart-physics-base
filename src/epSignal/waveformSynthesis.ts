import type {
  CartesianPointMm,
  EpPhysiologicalEvent,
  EpSignalChannelDefinition,
  GeneratedEpSignalChannel,
} from './contracts';
import { sampleCountForDuration, sampleTimeMs } from './sampling';
import type {
  EpActivationSourceDefinition,
  EpVector3,
  EpWaveformKernel,
  EpWaveformSynthesisRequest,
  EpWaveformSynthesisResult,
} from './waveformContracts';
import { assertValidEpWaveformModel } from './waveformValidation';
import { assertValidEpSignalScenario } from './validation';

function normalize(vector: EpVector3): EpVector3 {
  const norm = Math.hypot(vector.x, vector.y, vector.z);
  return { x: vector.x / norm, y: vector.y / norm, z: vector.z / norm };
}

function dot(first: EpVector3, second: EpVector3): number {
  return first.x * second.x + first.y * second.y + first.z * second.z;
}

function displacement(from: CartesianPointMm, to: CartesianPointMm): EpVector3 {
  return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
}

function kernelValue(kernel: EpWaveformKernel, deltaMs: number): number {
  switch (kernel.kind) {
    case 'gaussian': {
      const x = deltaMs / kernel.widthMs;
      return Math.exp(-0.5 * x * x);
    }
    case 'gaussian-derivative': {
      const x = deltaMs / kernel.widthMs;
      const gaussian = Math.exp(-0.5 * x * x);
      return kernel.order === 1 ? -x * gaussian : (x * x - 1) * gaussian;
    }
    case 'difference-of-gaussians': {
      const narrow = Math.exp(-0.5 * (deltaMs / kernel.narrowWidthMs) ** 2);
      const broad = Math.exp(-0.5 * (deltaMs / kernel.broadWidthMs) ** 2);
      return narrow - kernel.broadScale * broad;
    }
  }
}

function supportRadiusMs(kernel: EpWaveformKernel): number {
  switch (kernel.kind) {
    case 'gaussian':
    case 'gaussian-derivative':
      return 6 * kernel.widthMs;
    case 'difference-of-gaussians':
      return 6 * kernel.broadWidthMs;
  }
}

function sourceMatches(source: EpActivationSourceDefinition, event: EpPhysiologicalEvent): boolean {
  return source.eventKind === event.kind && (source.siteId === undefined || source.siteId === event.siteId);
}

function surfaceWeight(channel: EpSignalChannelDefinition, source: EpActivationSourceDefinition): number {
  if (channel.geometry.type !== 'surface-lead') return 0;
  const explicit = source.surfaceLeadWeights?.[channel.geometry.leadName];
  return explicit ?? source.farFieldScale ?? 0.08;
}

function unipolarWeight(contact: CartesianPointMm, source: EpActivationSourceDefinition, conductivityScale: number, minimumDistanceMm: number): number {
  const vector = displacement(source.positionMm, contact);
  const distance = Math.max(minimumDistanceMm, Math.hypot(vector.x, vector.y, vector.z));
  const direction = normalize(source.dipoleDirection);
  const radial = normalize(vector);
  return conductivityScale * dot(direction, radial) / (distance * distance);
}

function channelWeight(channel: EpSignalChannelDefinition, source: EpActivationSourceDefinition, conductivityScale: number, minimumDistanceMm: number): number {
  switch (channel.geometry.type) {
    case 'surface-lead':
      return surfaceWeight(channel, source);
    case 'unipolar':
      return unipolarWeight(channel.geometry.contact.positionMm, source, conductivityScale, minimumDistanceMm);
    case 'bipolar':
      return unipolarWeight(channel.geometry.positive.positionMm, source, conductivityScale, minimumDistanceMm)
        - unipolarWeight(channel.geometry.negative.positionMm, source, conductivityScale, minimumDistanceMm);
    case 'stimulus':
    case 'reference':
      return 0;
  }
}

function addKernel(samples: Float64Array, sampleRateHz: number, eventTimeMs: number, amplitude: number, kernel: EpWaveformKernel): void {
  const support = supportRadiusMs(kernel);
  const first = Math.max(0, Math.floor((eventTimeMs - support) * sampleRateHz / 1000));
  const last = Math.min(samples.length - 1, Math.ceil((eventTimeMs + support) * sampleRateHz / 1000));
  for (let index = first; index <= last; index += 1) {
    const timeMs = sampleTimeMs(index, sampleRateHz);
    samples[index] = samples[index]! + amplitude * kernelValue(kernel, timeMs - eventTimeMs);
  }
}

function addStimulusArtifact(samples: Float64Array, sampleRateHz: number, eventTimeMs: number, amplitudeMv: number, decayMs: number, oppositeLobeScale: number, oppositeLobeDelayMs: number): void {
  const first = Math.max(0, Math.floor(eventTimeMs * sampleRateHz / 1000));
  const last = Math.min(samples.length - 1, Math.ceil((eventTimeMs + 8 * decayMs + oppositeLobeDelayMs) * sampleRateHz / 1000));
  for (let index = first; index <= last; index += 1) {
    const delta = sampleTimeMs(index, sampleRateHz) - eventTimeMs;
    const firstLobe = delta >= 0 ? Math.exp(-delta / decayMs) : 0;
    const shifted = delta - oppositeLobeDelayMs;
    const secondLobe = shifted >= 0 ? Math.exp(-shifted / decayMs) : 0;
    samples[index] = samples[index]! + amplitudeMv * (firstLobe - oppositeLobeScale * secondLobe);
  }
}

export function synthesizeEpWaveforms(request: EpWaveformSynthesisRequest): EpWaveformSynthesisResult {
  const { scenario, model } = request;
  assertValidEpSignalScenario(scenario);
  assertValidEpWaveformModel(model);
  const sampleRateHz = scenario.acquisition.sampleRateHz;
  const sampleCount = sampleCountForDuration(scenario.acquisition.durationMs, sampleRateHz);
  const buffers = new Map<string, Float64Array>();
  for (const channel of scenario.channels) buffers.set(channel.id, new Float64Array(sampleCount));

  let matchedEventCount = 0;
  const unmatchedEventIds: string[] = [];
  for (const event of scenario.events) {
    if (event.kind === 'pacing-stimulus') {
      for (const channel of scenario.channels) {
        const samples = buffers.get(channel.id)!;
        let amplitude = model.stimulusArtifact.amplitudeMv;
        if (channel.kind === 'surface-ecg') amplitude *= 0.12;
        else if (channel.kind === 'reference') amplitude = 0;
        else if (event.channelIds && !event.channelIds.includes(channel.id)) amplitude *= 0.25;
        if (channel.invertPolarity) amplitude *= -1;
        addStimulusArtifact(samples, sampleRateHz, event.timeMs, amplitude, model.stimulusArtifact.decayTimeConstantMs, model.stimulusArtifact.oppositeLobeScale, model.stimulusArtifact.oppositeLobeDelayMs);
      }
      matchedEventCount += 1;
      continue;
    }
    const sources = model.sources.filter((source) => sourceMatches(source, event));
    if (sources.length === 0) {
      unmatchedEventIds.push(event.id);
      continue;
    }
    matchedEventCount += 1;
    for (const source of sources) {
      for (const channel of scenario.channels) {
        const samples = buffers.get(channel.id)!;
        let weight = channelWeight(channel, source, model.conductivityScale, model.minimumDistanceMm);
        if (channel.invertPolarity) weight *= -1;
        addKernel(samples, sampleRateHz, event.timeMs, source.amplitudeMv * weight, source.kernel);
      }
    }
  }

  const channels: GeneratedEpSignalChannel[] = scenario.channels.map((channel) => ({
    channelId: channel.id,
    unit: 'mV',
    samples: buffers.get(channel.id)!,
  }));

  return Object.freeze({
    signalSet: Object.freeze({
      schemaVersion: scenario.schemaVersion,
      scenarioId: scenario.id,
      scenarioVersion: scenario.provenance.scenarioVersion,
      engineVersion: scenario.provenance.engineVersion,
      deterministicSeed: scenario.deterministicSeed,
      sampleRateHz,
      durationMs: scenario.acquisition.durationMs,
      sampleCount,
      channels: Object.freeze(channels),
      events: scenario.events,
    }),
    matchedEventCount,
    unmatchedEventIds: Object.freeze(unmatchedEventIds),
  });
}
