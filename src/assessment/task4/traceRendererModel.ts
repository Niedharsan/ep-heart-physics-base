import type {
  TaskFourTraceDefinition,
  TaskFourTraceEventKind,
} from './traceCatalog';

export type TaskFourTraceView = 'student' | 'instructor';

export interface RenderedTaskFourTraceEvent {
  readonly id: string;
  readonly kind: TaskFourTraceEventKind;
  readonly path: string;
}

export interface RenderedTaskFourTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly baseline: number;
  readonly baselinePath: string;
  readonly events: readonly RenderedTaskFourTraceEvent[];
}

export interface RenderedTaskFourTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly y: number;
}

export interface TaskFourTraceRenderModel {
  readonly width: number;
  readonly height: number;
  readonly channels: readonly RenderedTaskFourTraceChannel[];
  readonly annotations: readonly RenderedTaskFourTraceAnnotation[];
}

const WIDTH = 760;
const LEFT = 48;
const RIGHT = 742;
const TOP = 52;
const CHANNEL_GAP = 44;

const SHAPES: Readonly<Record<TaskFourTraceEventKind, readonly (readonly [number, number])[]>> = Object.freeze({
  qrs: Object.freeze([[-8, 0], [-4, -3], [-2, -22], [1, 24], [4, -9], [8, 0]] as const),
  atrial: Object.freeze([[-8, 0], [-4, -3], [0, -11], [4, -3], [8, 0]] as const),
  his: Object.freeze([[-3, 0], [0, -16], [3, 0]] as const),
  ventricular: Object.freeze([[-7, 0], [-3, -4], [-1, -21], [2, 20], [5, -8], [8, 0]] as const),
  stimulus: Object.freeze([[-2, 0], [0, -24], [2, 0]] as const),
  pvc: Object.freeze([[-8, 0], [-4, -5], [-1, -27], [3, 24], [7, -8], [10, 0]] as const),
});

function eventPath(kind: TaskFourTraceEventKind, x: number, baseline: number): string {
  return SHAPES[kind]
    .map(([dx, dy], index) => `${index === 0 ? 'M' : 'L'} ${x + dx} ${baseline + dy}`)
    .join(' ');
}

export function buildTaskFourTraceRenderModel(
  definition: TaskFourTraceDefinition,
  view: TaskFourTraceView = 'student',
): TaskFourTraceRenderModel {
  const channels = definition.channels.map((traceChannel, index) => {
    const baseline = TOP + index * CHANNEL_GAP;
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
  const visibleAnnotations = definition.annotations.filter((item) => (
    item.visibility === 'student' || view === 'instructor'
  ));
  const annotations = visibleAnnotations.map((traceAnnotation, index) => Object.freeze({
    id: traceAnnotation.id,
    label: traceAnnotation.label,
    x: traceAnnotation.x,
    endX: traceAnnotation.endX,
    y: traceAnnotation.channelId
      ? (baselineByChannel.get(traceAnnotation.channelId) ?? TOP) - 25
      : 20 + index * 12,
  }));

  return Object.freeze({
    width: WIDTH,
    height: TOP + Math.max(1, channels.length) * CHANNEL_GAP,
    channels: Object.freeze(channels),
    annotations: Object.freeze(annotations),
  });
}
