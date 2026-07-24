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
const CHANNEL_GAP = 38;

const SHAPES: Readonly<Record<TaskFiveTraceEventKind, readonly (readonly [number, number])[]>> = Object.freeze({
  'qrs-positive': Object.freeze([[-18, 0], [-14, -2], [-10, -8], [-7, -25], [-3, -34], [0, -12], [4, 22], [8, 12], [13, 3], [18, 0]] as const),
  'qrs-negative': Object.freeze([[-18, 0], [-13, 2], [-9, 9], [-5, 28], [-1, 35], [3, 12], [7, -17], [11, -8], [16, -2], [18, 0]] as const),
  'qrs-lbbb': Object.freeze([[-20, 0], [-15, 3], [-11, 13], [-6, 28], [-1, 34], [5, 24], [10, 10], [14, -7], [18, -3], [22, 0]] as const),
  'qrs-rbbb': Object.freeze([[-20, 0], [-15, 3], [-11, 11], [-7, -16], [-3, -7], [1, 8], [5, -10], [9, -29], [13, -14], [17, 9], [22, 0]] as const),
  'qrs-narrow': Object.freeze([[-10, 0], [-6, -3], [-3, -18], [0, -26], [3, 24], [7, -8], [10, 0]] as const),
  'qrs-wide': Object.freeze([[-22, 0], [-17, -3], [-12, -13], [-7, -28], [-1, -35], [5, -19], [11, 20], [16, 13], [22, 0]] as const),
  atrial: Object.freeze([[-10, 0], [-6, -2], [-2, -8], [2, -12], [6, -4], [10, 0]] as const),
  his: Object.freeze([[-4, 0], [-1, -6], [0, -17], [2, 5], [4, 0]] as const),
  ventricular: Object.freeze([[-10, 0], [-6, -4], [-2, -18], [1, -25], [4, 20], [8, -7], [11, 0]] as const),
  stimulus: Object.freeze([[-2, 0], [0, -25], [2, 0]] as const),
});

function eventPath(
  kind: TaskFiveTraceEventKind,
  x: number,
  baseline: number,
  widthScale = 1,
  amplitudeScale = 1,
): string {
  return SHAPES[kind]
    .map(([dx, dy], index) => {
      const nextX = x + dx * widthScale;
      const nextY = baseline + dy * amplitudeScale;
      return `${index === 0 ? 'M' : 'L'} ${nextX} ${nextY}`;
    })
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
        path: eventPath(
          traceEvent.kind,
          traceEvent.x,
          baseline,
          traceEvent.widthScale,
          traceEvent.amplitudeScale,
        ),
      }))),
    });
  });

  const baselineByChannel = new Map(
    channels.map((renderedChannel) => [renderedChannel.id, renderedChannel.baseline]),
  );
  const visibleAnnotations = definition.annotations.filter((item) => (
    item.visibility === 'student' || view === 'instructor'
  ));
  const annotations = visibleAnnotations.map((traceAnnotation, index) => Object.freeze({
    id: traceAnnotation.id,
    label: traceAnnotation.label,
    x: traceAnnotation.x,
    ...(traceAnnotation.endX === undefined ? {} : { endX: traceAnnotation.endX }),
    y: traceAnnotation.channelId
      ? (baselineByChannel.get(traceAnnotation.channelId) ?? TOP) - 22
      : 20 + index * 12,
  }));

  return Object.freeze({
    width: WIDTH,
    height: TOP + Math.max(1, channels.length) * CHANNEL_GAP,
    channels: Object.freeze(channels),
    annotations: Object.freeze(annotations),
  });
}
