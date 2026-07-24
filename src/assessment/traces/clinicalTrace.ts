export type ClinicalSignalClass = 'surface' | 'intracardiac' | 'stimulus';

export interface ClinicalTraceEvent {
  readonly id: string;
  readonly kind: string;
  readonly timeMs: number;
  readonly widthScale: number;
  readonly amplitudeScale: number;
}

export interface ClinicalTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly signalClass: ClinicalSignalClass;
  readonly events: readonly ClinicalTraceEvent[];
}

export type ClinicalAnnotationVisibility = 'student' | 'instructor';

export interface ClinicalTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly timeMs: number;
  readonly endTimeMs?: number;
  readonly channelId?: string;
  readonly visibility: ClinicalAnnotationVisibility;
}

export interface ClinicalTraceDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly durationMs: number;
  readonly teachingLabel: string;
  readonly channels: readonly ClinicalTraceChannel[];
  readonly annotations: readonly ClinicalTraceAnnotation[];
}

export interface LegacyTraceEvent {
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly widthScale?: number;
  readonly amplitudeScale?: number;
}

export interface LegacyTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly events: readonly LegacyTraceEvent[];
}

export interface LegacyTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly channelId?: string;
  readonly visibility?: ClinicalAnnotationVisibility;
}

export interface LegacyTraceDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly teachingLabel: string;
  readonly channels: readonly LegacyTraceChannel[];
  readonly annotations: readonly LegacyTraceAnnotation[];
}

export interface AdaptLegacyTraceOptions {
  readonly title?: string;
  readonly description?: string;
  readonly mode?: 'surface' | 'intracardiac' | 'mixed';
  readonly durationMs?: number;
  readonly xMin?: number;
  readonly xMax?: number;
}

const SURFACE_LABELS = new Set([
  'I', 'II', 'III', 'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function inferSignalClass(
  channel: LegacyTraceChannel,
  mode: AdaptLegacyTraceOptions['mode'],
): ClinicalSignalClass {
  const id = channel.id.toLowerCase();
  const label = channel.label.trim();

  if (id.includes('stim') || label.toLowerCase().startsWith('stim')) return 'stimulus';
  if (mode === 'surface') return 'surface';
  if (mode === 'intracardiac') return 'intracardiac';
  if (
    id.includes('lead')
    || id.includes('surface')
    || SURFACE_LABELS.has(label)
  ) {
    return 'surface';
  }
  return 'intracardiac';
}

export function adaptLegacyTrace(
  definition: LegacyTraceDefinition,
  options: AdaptLegacyTraceOptions = {},
): ClinicalTraceDefinition {
  const durationMs = options.durationMs
    ?? (options.mode === 'surface' ? 3600 : options.mode === 'intracardiac' ? 4800 : 4200);
  const xMin = options.xMin ?? 48;
  const xMax = options.xMax ?? 742;
  const activeStartMs = 260;
  const activeEndMs = durationMs - 260;

  const mapTime = (x: number): number => {
    const fraction = clamp((x - xMin) / Math.max(1, xMax - xMin), 0, 1);
    return activeStartMs + fraction * (activeEndMs - activeStartMs);
  };

  return Object.freeze({
    id: definition.id,
    title: options.title ?? definition.title,
    description: options.description ?? definition.description,
    durationMs,
    teachingLabel: definition.teachingLabel,
    channels: Object.freeze(definition.channels.map((channel) => Object.freeze({
      id: channel.id,
      label: channel.label,
      signalClass: inferSignalClass(channel, options.mode),
      events: Object.freeze(channel.events.map((event) => Object.freeze({
        id: event.id,
        kind: event.kind,
        timeMs: mapTime(event.x),
        widthScale: event.widthScale ?? 1,
        amplitudeScale: event.amplitudeScale ?? 1,
      }))),
    }))),
    annotations: Object.freeze(definition.annotations.map((annotation) => Object.freeze({
      id: annotation.id,
      label: annotation.label,
      timeMs: mapTime(annotation.x),
      endTimeMs: annotation.endX === undefined ? undefined : mapTime(annotation.endX),
      channelId: annotation.channelId,
      visibility: annotation.visibility ?? 'instructor',
    }))),
  });
}
