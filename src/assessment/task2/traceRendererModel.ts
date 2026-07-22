import type { TaskTwoTraceDefinition, TraceEventKind } from './traceCatalog';

export interface RenderedTraceEvent {
  readonly id: string;
  readonly kind: TraceEventKind;
  readonly path: string;
}

export interface RenderedTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly baseline: number;
  readonly baselinePath: string;
  readonly events: readonly RenderedTraceEvent[];
}

export interface RenderedTraceAnnotation {
  readonly id: string;
  readonly kind: 'interval' | 'blocked' | 'note';
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly y: number;
}

export interface TraceRenderModel {
  readonly width: number;
  readonly height: number;
  readonly channels: readonly RenderedTraceChannel[];
  readonly annotations: readonly RenderedTraceAnnotation[];
}

const WIDTH = 720;
const LEFT = 44;
const RIGHT = 700;
const TOP = 54;
const CHANNEL_GAP = 58;

const SHAPES: Readonly<Record<TraceEventKind, readonly (readonly [number, number])[]>> = Object.freeze({
  stimulus: Object.freeze([[-2, 0], [0, -25], [2, 0]] as const),
  atrial: Object.freeze([[-9, 0], [-5, -4], [0, -13], [5, -4], [9, 0]] as const),
  his: Object.freeze([[-3, 0], [0, -18], [3, 0]] as const),
  ventricular: Object.freeze([[-8, 0], [-4, -5], [-2, -25], [2, 22], [5, -9], [9, 0]] as const),
  'p-wave': Object.freeze([[-10, 0], [-7, -2], [-3, -8], [1, -11], [5, -7], [9, -2], [12, 0]] as const),
  qrs: Object.freeze([[-8, 0], [-4, -3], [-2, -25], [1, 27], [4, -10], [8, 0], [14, 0], [20, -5], [25, 0]] as const),
  'wide-qrs': Object.freeze([[-12, 0], [-8, -5], [-3, -23], [4, 26], [10, -14], [16, 0], [28, 0], [36, -7], [44, 0]] as const),
});

function eventPath(kind: TraceEventKind, x: number, baseline: number): string {
  return SHAPES[kind]
    .map(([dx, dy], index) => `${index === 0 ? 'M' : 'L'} ${x + dx} ${baseline + dy}`)
    .join(' ');
}

function channelBaseline(index: number): number {
  return TOP + index * CHANNEL_GAP;
}

export function buildTraceRenderModel(definition: TaskTwoTraceDefinition): TraceRenderModel {
  const channels = definition.channels.map((traceChannel, index) => {
    const baseline = channelBaseline(index);
    return Object.freeze({
      id: traceChannel.id,
      label: traceChannel.label,
      baseline,
      baselinePath: `M ${LEFT} ${baseline} H ${RIGHT}`,
      events: Object.freeze(traceChannel.events.map((traceEvent) => Object.freeze({
        id: traceEvent.id,
        kind: traceEvent.kind,
        path: eventPath(traceEvent.kind, traceEvent.x, baseline),
      }))),
    });
  });

  const baselineByChannel = new Map(channels.map((renderedChannel) => [renderedChannel.id, renderedChannel.baseline]));
  const annotations = definition.annotations.map((traceAnnotation, index) => Object.freeze({
    id: traceAnnotation.id,
    kind: traceAnnotation.kind,
    label: traceAnnotation.label,
    x: traceAnnotation.x,
    endX: traceAnnotation.endX,
    y: traceAnnotation.channelId
      ? (baselineByChannel.get(traceAnnotation.channelId) ?? TOP) - 31
      : 22 + index * 13,
  }));

  return Object.freeze({
    width: WIDTH,
    height: TOP + Math.max(1, channels.length) * CHANNEL_GAP,
    channels: Object.freeze(channels),
    annotations: Object.freeze(annotations),
  });
}
