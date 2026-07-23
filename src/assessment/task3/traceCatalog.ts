import type {
  AtrialTachycardiaSide,
  AhJumpThresholdClass,
  AvnrtPathway,
} from './marking';
import type { TaskThreeTraceId } from './catalog';

export const TASK_THREE_EDUCATIONAL_TRACE_LABEL =
  'Synthetic educational tracing — not patient data.' as const;

export type TaskThreeTraceMode = 'surface-ecg' | 'intracardiac-egm';
export type TaskThreeTraceEventKind =
  | 'p-positive'
  | 'p-negative'
  | 'p-negative-positive'
  | 'qrs'
  | 'pseudo-r-prime'
  | 'stimulus'
  | 'atrial'
  | 'his'
  | 'ventricular';

export interface TaskThreeTraceEvent {
  readonly id: string;
  readonly kind: TaskThreeTraceEventKind;
  readonly x: number;
}

export interface TaskThreeTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly events: readonly TaskThreeTraceEvent[];
}

export interface TaskThreeTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly channelId?: string;
  readonly visibility: 'student' | 'instructor';
}

export interface AtrialTachycardiaTeachingMetadata {
  readonly kind: 'atrial-tachycardia';
  readonly expectedSide: AtrialTachycardiaSide;
  readonly decisiveLead: 'V1';
  readonly decisiveMorphology: 'positive' | 'negative' | 'negative-positive';
}

export interface AhChangeTeachingMetadata {
  readonly kind: 'ah-change';
  readonly baselineCouplingMs: number;
  readonly testCouplingMs: number;
  readonly couplingDecrementMs: number;
  readonly baselineAhMs: number;
  readonly testAhMs: number;
  readonly deltaAhMs: number;
  readonly thresholdClass: AhJumpThresholdClass;
  readonly meetsConventionalJumpCriterion: boolean;
}

export interface AvnrtTeachingMetadata {
  readonly kind: 'avnrt';
  readonly mechanism: 'slow-fast';
  readonly expectedAntegradePathway: AvnrtPathway;
  readonly rpRelation: 'short-rp';
  readonly surfaceCue: 'pseudo-r-prime-v1';
}

export type TaskThreeTeachingMetadata =
  | AtrialTachycardiaTeachingMetadata
  | AhChangeTeachingMetadata
  | AvnrtTeachingMetadata;

export interface TaskThreeTraceDefinition {
  readonly id: TaskThreeTraceId;
  readonly title: string;
  readonly description: string;
  readonly mode: TaskThreeTraceMode;
  readonly teachingLabel: typeof TASK_THREE_EDUCATIONAL_TRACE_LABEL;
  readonly channels: readonly TaskThreeTraceChannel[];
  readonly annotations: readonly TaskThreeTraceAnnotation[];
  readonly teachingMetadata: TaskThreeTeachingMetadata;
}

const event = (
  id: string,
  kind: TaskThreeTraceEventKind,
  x: number,
): TaskThreeTraceEvent => Object.freeze({ id, kind, x });

const channel = (
  id: string,
  label: string,
  events: readonly TaskThreeTraceEvent[],
): TaskThreeTraceChannel => Object.freeze({ id, label, events: Object.freeze([...events]) });

const annotation = (
  id: string,
  label: string,
  x: number,
  visibility: TaskThreeTraceAnnotation['visibility'],
  channelId?: string,
  endX?: number,
): TaskThreeTraceAnnotation => Object.freeze({ id, label, x, visibility, channelId, endX });

const trace = (
  definition: Omit<TaskThreeTraceDefinition, 'teachingLabel'>,
): TaskThreeTraceDefinition => Object.freeze({
  ...definition,
  teachingLabel: TASK_THREE_EDUCATIONAL_TRACE_LABEL,
  channels: Object.freeze([...definition.channels]),
  annotations: Object.freeze([...definition.annotations]),
  teachingMetadata: Object.freeze({ ...definition.teachingMetadata }),
});

const regularSurfaceEvents = (
  prefix: string,
  pKind: Extract<TaskThreeTraceEventKind, 'p-positive' | 'p-negative' | 'p-negative-positive'>,
): readonly TaskThreeTraceEvent[] => Object.freeze([80, 210, 340, 470, 600].flatMap((pX, index) => [
  event(`${prefix}-p-${index + 1}`, pKind, pX),
  event(`${prefix}-qrs-${index + 1}`, 'qrs', pX + 30),
]));

const avnrtQrsEvents = (prefix: string): readonly TaskThreeTraceEvent[] => Object.freeze(
  [75, 165, 255, 345, 435, 525, 615].map((x, index) => event(`${prefix}-qrs-${index + 1}`, 'qrs', x)),
);

const avnrtPseudoRPrimeEvents = (): readonly TaskThreeTraceEvent[] => Object.freeze(
  [83, 173, 263, 353, 443, 533, 623]
    .map((x, index) => event(`avnrt-r-prime-${index + 1}`, 'pseudo-r-prime', x)),
);

export const taskThreeTraceCatalog: Readonly<Record<TaskThreeTraceId, TaskThreeTraceDefinition>> = Object.freeze({
  'at-left-v1-positive': trace({
    id: 'at-left-v1-positive',
    title: 'Focal atrial tachycardia — left-sided pattern A',
    description: 'Regular atrial tachycardia with discrete abnormal P waves; lead V1 is predominantly positive.',
    mode: 'surface-ecg',
    channels: [
      channel('lead-i', 'I', regularSurfaceEvents('at1-i', 'p-positive')),
      channel('lead-ii', 'II', regularSurfaceEvents('at1-ii', 'p-positive')),
      channel('lead-v1', 'V1', regularSurfaceEvents('at1-v1', 'p-positive')),
    ],
    annotations: [
      annotation('at1-v1-cue', 'V1 positive P-wave pattern supports a left atrial focus.', 340, 'instructor', 'lead-v1'),
    ],
    teachingMetadata: {
      kind: 'atrial-tachycardia',
      expectedSide: 'left',
      decisiveLead: 'V1',
      decisiveMorphology: 'positive',
    },
  }),
  'at-right-v1-negative': trace({
    id: 'at-right-v1-negative',
    title: 'Focal atrial tachycardia — right-sided pattern',
    description: 'Regular atrial tachycardia with discrete abnormal P waves; lead V1 is predominantly negative.',
    mode: 'surface-ecg',
    channels: [
      channel('lead-i', 'I', regularSurfaceEvents('at2-i', 'p-positive')),
      channel('lead-ii', 'II', regularSurfaceEvents('at2-ii', 'p-positive')),
      channel('lead-v1', 'V1', regularSurfaceEvents('at2-v1', 'p-negative')),
    ],
    annotations: [
      annotation('at2-v1-cue', 'V1 negative P-wave pattern supports a right atrial focus.', 340, 'instructor', 'lead-v1'),
    ],
    teachingMetadata: {
      kind: 'atrial-tachycardia',
      expectedSide: 'right',
      decisiveLead: 'V1',
      decisiveMorphology: 'negative',
    },
  }),
  'at-left-v1-negative-positive': trace({
    id: 'at-left-v1-negative-positive',
    title: 'Focal atrial tachycardia — left-sided pattern B',
    description: 'Regular atrial tachycardia with discrete abnormal P waves; lead V1 has a negative-positive biphasic pattern.',
    mode: 'surface-ecg',
    channels: [
      channel('lead-i', 'I', regularSurfaceEvents('at3-i', 'p-negative')),
      channel('lead-ii', 'II', regularSurfaceEvents('at3-ii', 'p-positive')),
      channel('lead-v1', 'V1', regularSurfaceEvents('at3-v1', 'p-negative-positive')),
    ],
    annotations: [
      annotation('at3-v1-cue', 'V1 negative-positive P-wave pattern supports a left atrial focus.', 340, 'instructor', 'lead-v1'),
    ],
    teachingMetadata: {
      kind: 'atrial-tachycardia',
      expectedSide: 'left',
      decisiveLead: 'V1',
      decisiveMorphology: 'negative-positive',
    },
  }),
  'ah-change-40-ms': trace({
    id: 'ah-change-40-ms',
    title: 'AH change below the conventional threshold',
    description: 'A 10 ms A1A2 decrement produces AH prolongation from 90 ms to 130 ms: a 40 ms change below the conventional 50 ms jump criterion.',
    mode: 'intracardiac-egm',
    channels: [
      channel('stim', 'Stim', [
        event('ah40-base-s1', 'stimulus', 60), event('ah40-base-s2', 'stimulus', 230),
        event('ah40-test-s1', 'stimulus', 380), event('ah40-test-s2', 'stimulus', 540),
      ]),
      channel('hra', 'HRA', [
        event('ah40-base-a1', 'atrial', 70), event('ah40-base-a2', 'atrial', 240),
        event('ah40-test-a1', 'atrial', 390), event('ah40-test-a2', 'atrial', 550),
      ]),
      channel('his', 'His', [
        event('ah40-base-h1', 'his', 160), event('ah40-base-h2', 'his', 330),
        event('ah40-test-h1', 'his', 480), event('ah40-test-h2', 'his', 680),
      ]),
      channel('rv', 'RV', [
        event('ah40-base-v1', 'ventricular', 185), event('ah40-base-v2', 'ventricular', 355),
        event('ah40-test-v1', 'ventricular', 505), event('ah40-test-v2', 'ventricular', 705),
      ]),
    ],
    annotations: [
      annotation('ah40-coupling-base', 'A1A2 170 ms', 70, 'instructor', 'hra', 240),
      annotation('ah40-coupling-test', 'A1A2 160 ms', 390, 'instructor', 'hra', 550),
      annotation('ah40-baseline', 'A2H2 90 ms', 240, 'instructor', 'his', 330),
      annotation('ah40-test', 'A2H2 130 ms', 550, 'instructor', 'his', 680),
      annotation('ah40-delta', '10 ms decrement; ΔAH 40 ms: below threshold', 470, 'instructor', 'his'),
    ],
    teachingMetadata: {
      kind: 'ah-change',
      baselineCouplingMs: 170,
      testCouplingMs: 160,
      couplingDecrementMs: 10,
      baselineAhMs: 90,
      testAhMs: 130,
      deltaAhMs: 40,
      thresholdClass: 'below-50-ms',
      meetsConventionalJumpCriterion: false,
    },
  }),
  'ah-change-60-ms': trace({
    id: 'ah-change-60-ms',
    title: 'AH jump above the conventional threshold',
    description: 'A 10 ms A1A2 decrement produces AH prolongation from 90 ms to 150 ms: a 60 ms change meeting the conventional 50 ms jump criterion.',
    mode: 'intracardiac-egm',
    channels: [
      channel('stim', 'Stim', [
        event('ah60-base-s1', 'stimulus', 60), event('ah60-base-s2', 'stimulus', 230),
        event('ah60-test-s1', 'stimulus', 360), event('ah60-test-s2', 'stimulus', 520),
      ]),
      channel('hra', 'HRA', [
        event('ah60-base-a1', 'atrial', 70), event('ah60-base-a2', 'atrial', 240),
        event('ah60-test-a1', 'atrial', 370), event('ah60-test-a2', 'atrial', 530),
      ]),
      channel('his', 'His', [
        event('ah60-base-h1', 'his', 160), event('ah60-base-h2', 'his', 330),
        event('ah60-test-h1', 'his', 460), event('ah60-test-h2', 'his', 680),
      ]),
      channel('rv', 'RV', [
        event('ah60-base-v1', 'ventricular', 185), event('ah60-base-v2', 'ventricular', 355),
        event('ah60-test-v1', 'ventricular', 485), event('ah60-test-v2', 'ventricular', 705),
      ]),
    ],
    annotations: [
      annotation('ah60-coupling-base', 'A1A2 170 ms', 70, 'instructor', 'hra', 240),
      annotation('ah60-coupling-test', 'A1A2 160 ms', 370, 'instructor', 'hra', 530),
      annotation('ah60-baseline', 'A2H2 90 ms', 240, 'instructor', 'his', 330),
      annotation('ah60-test', 'A2H2 150 ms', 530, 'instructor', 'his', 680),
      annotation('ah60-delta', '10 ms decrement; ΔAH 60 ms: meets threshold', 455, 'instructor', 'his'),
    ],
    teachingMetadata: {
      kind: 'ah-change',
      baselineCouplingMs: 170,
      testCouplingMs: 160,
      couplingDecrementMs: 10,
      baselineAhMs: 90,
      testAhMs: 150,
      deltaAhMs: 60,
      thresholdClass: 'above-50-ms',
      meetsConventionalJumpCriterion: true,
    },
  }),
  'avnrt-slow-fast-short-rp': trace({
    id: 'avnrt-slow-fast-short-rp',
    title: 'Typical slow-fast AVNRT',
    description: 'Regular narrow-complex tachycardia with a short RP relation and a small pseudo-r-prime deflection in V1.',
    mode: 'surface-ecg',
    channels: [
      channel('lead-ii', 'II', [
        ...avnrtQrsEvents('avnrt-ii'),
        ...[83, 173, 263, 353, 443, 533, 623]
          .map((x, index) => event(`avnrt-ii-p-${index + 1}`, 'p-negative', x)),
      ]),
      channel('lead-v1', 'V1', [
        ...avnrtQrsEvents('avnrt-v1'),
        ...avnrtPseudoRPrimeEvents(),
      ]),
    ],
    annotations: [
      annotation('avnrt-short-rp', 'Short RP / retrograde atrial activation close to QRS', 350, 'instructor', 'lead-v1'),
      annotation('avnrt-slow-fast', 'Typical slow-fast AVNRT: antegrade slow pathway', 455, 'instructor', 'lead-v1'),
    ],
    teachingMetadata: {
      kind: 'avnrt',
      mechanism: 'slow-fast',
      expectedAntegradePathway: 'slow',
      rpRelation: 'short-rp',
      surfaceCue: 'pseudo-r-prime-v1',
    },
  }),
});

export const taskThreeTraceIds = Object.freeze(Object.keys(taskThreeTraceCatalog) as TaskThreeTraceId[]);

export function getTaskThreeTraceStructureSignature(definition: TaskThreeTraceDefinition): string {
  return JSON.stringify({
    mode: definition.mode,
    channels: definition.channels.map((item) => ({
      id: item.id,
      events: item.events.map((traceEvent) => [traceEvent.kind, traceEvent.x]),
    })),
  });
}
