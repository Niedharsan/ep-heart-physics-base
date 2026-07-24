import type {
  TaskThreeTraceDefinition,
  TaskThreeTraceEventKind,
} from './traceCatalog';

export type TaskThreeTraceView = 'student' | 'instructor';

export interface RenderedTaskThreeTraceEvent {
  readonly id: string;
  readonly kind: TaskThreeTraceEventKind;
  readonly path: string;
}

export interface RenderedTaskThreeTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly baseline: number;
  readonly baselinePath: string;
  readonly events: readonly RenderedTaskThreeTraceEvent[];
}

export interface RenderedTaskThreeTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly y: number;
}

export interface TaskThreeTraceRenderModel {
  readonly width: number;
  readonly height: number;
  readonly channels: readonly RenderedTaskThreeTraceChannel[];
  readonly annotations: readonly RenderedTaskThreeTraceAnnotation[];
}

const WIDTH = 760;
const LEFT = 44;
const RIGHT = 740;
const TOP = 54;
const CHANNEL_GAP = 58;

const SHAPES: Readonly<Record<TaskThreeTraceEventKind, readonly (readonly [number, number])[]>> = Object.freeze({
  'p-positive': Object.freeze([[-11, 0], [-7, -2], [-3, -8], [1, -12], [5, -7], [9, -2], [12, 0]] as const),
  'p-negative': Object.freeze([[-11, 0], [-7, 2], [-3, 8], [1, 12], [5, 7], [9, 2], [12, 0]] as const),
  'p-negative-positive': Object.freeze([[-12, 0], [-8, 3], [-4, 9], [0, 0], [4, -10], [8, -3], [12, 0]] as const),
  qrs: Object.freeze([[-8, 0], [-4, -3], [-2, -25], [1, 27], [4, -10], [8, 0], [14, 0], [20, -5], [25, 0]] as const),
  'pseudo-r-prime': Object.freeze([[-2, 0], [0, -8], [3, 0]] as const),
  stimulus: Object.freeze([[-2, 0], [0, -25], [2, 0]] as const),
  atrial: Object.freeze([[-9, 0], [-5, -4], [0, -13], [5, -4], [9, 0]] as const),
  his: Object.freeze([[-3, 0], [0, -18], [3, 0]] as const),
  ventricular: Object.freeze([[-8, 0], [-4, -5], [-2, -25], [2, 22], [5, -9], [9, 0]] as const),
});

function eventPath(kind: TaskThreeTraceEventKind, x: number, baseline: number): string {
  return SHAPES[kind]
    .map(([dx, dy], index) => `${index === 0 ? 'M' : 'L'} ${x + dx} ${baseline + dy}`)
    .join(' ');
}

function channelBaseline(index: number): number {
  return TOP + index * CHANNEL_GAP;
}

export function buildTaskThreeTraceRenderModel(
  definition: TaskThreeTraceDefinition,
  view: TaskThreeTraceView = 'student',
): TaskThreeTraceRenderModel {
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
  const visibleAnnotations = definition.annotations.filter((item) => (
    item.visibility === 'student' || view === 'instructor'
  ));
  const annotations = visibleAnnotations.map((traceAnnotation, index) => Object.freeze({
    id: traceAnnotation.id,
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
