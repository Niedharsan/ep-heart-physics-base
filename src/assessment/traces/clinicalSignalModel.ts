import type {
  ClinicalSignalClass,
  ClinicalTraceChannel,
  ClinicalTraceDefinition,
  ClinicalTraceEvent,
} from './clinicalTrace';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function gaussian(value: number, centre: number, width: number): number {
  const z = (value - centre) / Math.max(0.001, width);
  return Math.exp(-0.5 * z * z);
}

function stablePhase(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 6283) / 1000;
}

function baselineNoise(timeMs: number, channelId: string, signalClass: ClinicalSignalClass): number {
  const phase = stablePhase(channelId);
  const drift = Math.sin(timeMs / 680 + phase) * (signalClass === 'surface' ? 0.018 : 0.010);
  const fine = Math.sin(timeMs / 23 + phase * 1.7) * (signalClass === 'surface' ? 0.006 : 0.012);
  const mains = Math.sin(timeMs / 3.18 + phase * 0.4) * 0.0025;
  return drift + fine + mains;
}

function eventWaveform(
  event: ClinicalTraceEvent,
  timeMs: number,
  signalClass: ClinicalSignalClass,
): number {
  const dt = timeMs - event.timeMs;
  const width = Math.max(0.45, event.widthScale);
  const amplitude = event.amplitudeScale;
  const kind = event.kind.toLowerCase();

  if (kind === 'stimulus') {
    return amplitude * (
      -0.30 * gaussian(dt, -4 * width, 2.5 * width)
      + 1.25 * gaussian(dt, 0, 2.5 * width)
      - 0.38 * gaussian(dt, 5 * width, 3.2 * width)
    );
  }

  if (kind === 'his') {
    return amplitude * (
      0.62 * gaussian(dt, -5 * width, 3.5 * width)
      - 1.02 * gaussian(dt, 0, 3.2 * width)
      + 0.56 * gaussian(dt, 6 * width, 4.1 * width)
    );
  }

  if (kind === 'atrial') {
    return amplitude * (
      0.42 * gaussian(dt, -8 * width, 6.5 * width)
      - 0.70 * gaussian(dt, 0, 5.5 * width)
      + 0.33 * gaussian(dt, 9 * width, 7 * width)
    );
  }

  if (kind === 'ventricular') {
    return amplitude * (
      -0.42 * gaussian(dt, -9 * width, 5.5 * width)
      + 1.05 * gaussian(dt, 0, 6.3 * width)
      - 0.66 * gaussian(dt, 11 * width, 8.5 * width)
    );
  }

  if (kind === 'p-negative-positive') {
    return amplitude * (
      -0.36 * gaussian(dt, -7 * width, 10 * width)
      + 0.52 * gaussian(dt, 9 * width, 11 * width)
    );
  }

  if (kind === 'p-negative') {
    return amplitude * (
      -0.55 * gaussian(dt, 0, 12 * width)
      + 0.14 * gaussian(dt, 20 * width, 12 * width)
    );
  }

  if (kind === 'p-positive' || kind === 'p-wave') {
    return amplitude * (
      0.52 * gaussian(dt, 0, 12 * width)
      - 0.12 * gaussian(dt, 20 * width, 12 * width)
    );
  }

  if (kind === 'pseudo-r-prime') {
    return amplitude * (
      -0.10 * gaussian(dt, -4 * width, 3.8 * width)
      + 0.32 * gaussian(dt, 2 * width, 4.2 * width)
    );
  }

  if (kind === 'qrs-rbbb') {
    return amplitude * (
      -0.18 * gaussian(dt, -17 * width, 6.5 * width)
      + 0.72 * gaussian(dt, -7 * width, 7.5 * width)
      - 0.44 * gaussian(dt, 4 * width, 7.5 * width)
      + 0.92 * gaussian(dt, 17 * width, 9 * width)
      - 0.28 * gaussian(dt, 34 * width, 12 * width)
      + 0.16 * gaussian(dt, 170 * width, 45 * width)
    );
  }

  if (kind === 'qrs-lbbb') {
    return amplitude * (
      -0.28 * gaussian(dt, -20 * width, 8 * width)
      + 0.78 * gaussian(dt, -2 * width, 15 * width)
      - 0.62 * gaussian(dt, 22 * width, 15 * width)
      + 0.30 * gaussian(dt, 48 * width, 18 * width)
      + 0.16 * gaussian(dt, 185 * width, 50 * width)
    );
  }

  if (kind === 'qrs-wide' || kind === 'wide-qrs' || kind === 'pvc') {
    return amplitude * (
      -0.24 * gaussian(dt, -24 * width, 10 * width)
      + 0.94 * gaussian(dt, -5 * width, 17 * width)
      - 0.72 * gaussian(dt, 25 * width, 19 * width)
      + 0.24 * gaussian(dt, 58 * width, 24 * width)
      + 0.18 * gaussian(dt, 210 * width, 58 * width)
    );
  }

  if (kind === 'qrs-negative') {
    return -amplitude * (
      -0.16 * gaussian(dt, -12 * width, 4.5 * width)
      + 1.02 * gaussian(dt, 0, 5.6 * width)
      - 0.34 * gaussian(dt, 12 * width, 7.5 * width)
      + 0.18 * gaussian(dt, 155 * width, 42 * width)
    );
  }

  if (
    kind === 'qrs'
    || kind === 'qrs-positive'
    || kind === 'qrs-narrow'
  ) {
    if (signalClass === 'intracardiac') {
      return amplitude * (
        -0.38 * gaussian(dt, -8 * width, 5.2 * width)
        + 0.98 * gaussian(dt, 0, 5.8 * width)
        - 0.58 * gaussian(dt, 11 * width, 7.8 * width)
      );
    }
    return amplitude * (
      -0.16 * gaussian(dt, -12 * width, 4.5 * width)
      + 1.02 * gaussian(dt, 0, 5.6 * width)
      - 0.34 * gaussian(dt, 12 * width, 7.5 * width)
      + 0.18 * gaussian(dt, 155 * width, 42 * width)
    );
  }

  return amplitude * (
    0.28 * gaussian(dt, -6 * width, 7 * width)
    - 0.42 * gaussian(dt, 3 * width, 7 * width)
  );
}

function amplitudePixels(signalClass: ClinicalSignalClass): number {
  if (signalClass === 'surface') return 20;
  if (signalClass === 'stimulus') return 23;
  return 16;
}

export function buildClinicalTracePath(
  definition: ClinicalTraceDefinition,
  channel: ClinicalTraceChannel,
  baselineY: number,
  plotWidth: number,
  sampleStepMs = 4,
): string {
  const commands: string[] = [];
  const amplitudePx = amplitudePixels(channel.signalClass);
  const durationMs = Math.max(1, definition.durationMs);

  for (let timeMs = 0; timeMs <= durationMs; timeMs += sampleStepMs) {
    let signal = baselineNoise(timeMs, channel.id, channel.signalClass);
    for (const event of channel.events) {
      if (Math.abs(timeMs - event.timeMs) <= 320 * event.widthScale) {
        signal += eventWaveform(event, timeMs, channel.signalClass);
      }
    }
    const x = (timeMs / durationMs) * plotWidth;
    const y = baselineY - clamp(signal, -1.35, 1.35) * amplitudePx;
    commands.push(`${commands.length === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  if (commands.length === 0) return `M 0 ${baselineY.toFixed(2)} L ${plotWidth.toFixed(2)} ${baselineY.toFixed(2)}`;
  return commands.join(' ');
}
