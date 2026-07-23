import type {
  TaskFiveTraceDefinition,
  TaskFiveTraceEventKind,
} from './traceCatalog';

export type TaskFiveTraceView = 'student' | 'instructor';

export interface RenderedTaskFiveTraceEvent {
  readonly id: string;
  readonly className: 'qrs' | 'atrial' | 'his' | 'ventricular' | 'stimulus';
  readonly path: string;
}

export interface RenderedTaskFiveTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly baseline: number;
  readonly baselinePath: string;
  readonly events: readonly RenderedTaskFiveTraceEvent[];
}

export interface RenderedTaskFiveTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly y: number;
}

export interface TaskFiveTraceRenderModel {
  readonly width: number;
  readonly height: number;
  readonly channels: readonly RenderedTaskFiveTraceChannel[];
  readonly annotations: readonly RenderedTaskFiveTraceAnnotation[];
}

const WIDTH = 760;
const LEFT = 48;
const RIGHT = 742;
const TOP = 54;
const CHANNEL_GAP = 42;

const SHAPES: Readonly<Record<TaskFiveTraceEventKind, readonly (readonly [number, number])[]>> = Object.freeze({
  'qrs-positive': Object.freeze([[-12, 0], [-8, -4], [-5, -28], [-1, -8], [3, 24], [7, 7], [12, 0]] as const),
  'qrs-negative': Object.freeze([[-12, 0], [-8, 4], [-5, 27], [-1, 8], [3, -18], [7, -5], [12, 0]] as const),
  'qrs-lbbb': Object.freeze([[-14, 0], [-10, 4], [-6, 22], [-1, 30], [5, 12], [10, -5], [14, 0]] as const),
  'qrs-rbbb': Object.freeze([[-14, 0], [-9, 5], [-5, -18], [-1, 5], [3, -9], [7, -27], [11, 8], [15, 0]] as const),
  'qrs-narrow': Object.freeze([[-7, 0], [-3, -3], [-1, -20], [2, 22], [5, -7], [8, 0]] as const),
  'qrs-wide': Object.freeze([[-14, 0], [-10, -5], [-6, -24], [-1, -31], [5, 20], [10, 9], [15, 0]] as const),
  atrial: Object.freeze([[-8, 0], [-4, -3], [0, -11], [4, -3], [8, 0]] as const),
  his: Object.freeze([[-3, 0], [0, -16], [3, 0]] as const),
  ventricular: Object.freeze([[-7, 0], [-3, -4], [-1, -21], [2, 20], [5, -8], [8, 0]] as const),
  stimulus: Object.freeze([[-2, 0], [0, -24], [2, 0]] as const),
});

function eventPath(kind: TaskFiveTraceEventKind, x: number, baseline: number): string {
  return SHAPES[kind]
    .map(([dx, dy], index) => `${index === 0 ? 'M' : 'L'} ${x + dx} ${baseline + dy}`)
    .join(' ');
}

function publicEventClass(kind: TaskFiveTraceEventKind): RenderedTaskFiveTraceEvent['className'] {
  switch (kind) {
    case 'atrial':
    case 'his':
    case 'ventricular':
    case 'stimulus':
      return kind;
    default:
      return 'qrs';
  }
}

export function buildTaskFiveTraceRenderModel(
  definition: TaskFiveTraceDefinition,
  view: TaskFiveTraceView = 'student',
): TaskFiveTraceRenderModel {
  const channels = definition.channels.map((traceChannel, index) => {
    const baseline = TOP + index * CHANNEL_GAP;
    return Object.freeze({
      id: traceChannel.id,
      label: traceChannel.label,
      baseline,
      baselinePath: `M ${LEFT} ${baseline} H ${RIGHT}`,
      events: Object.freeze(traceChannel.events.map((traceEvent) => Object.freeze({
        id: traceEvent.id,
        className: publicEventClass(traceEvent.kind),
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
    ...(traceAnnotation.endX === undefined ? {} : { endX: traceAnnotation.endX }),
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
