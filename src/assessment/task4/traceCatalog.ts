import type { TaskFourTraceId } from './catalog';

export const TASK_FOUR_EDUCATIONAL_TRACE_LABEL =
  'Synthetic educational tracing — not patient data.' as const;

export type TaskFourTraceEventKind =
  | 'qrs'
  | 'atrial'
  | 'his'
  | 'ventricular'
  | 'stimulus'
  | 'pvc';

export interface TaskFourTraceEvent {
  readonly id: string;
  readonly kind: TaskFourTraceEventKind;
  readonly x: number;
}

export interface TaskFourTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly events: readonly TaskFourTraceEvent[];
}

export interface TaskFourTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly channelId?: string;
  readonly visibility: 'student' | 'instructor';
}

export type TaskFourTeachingMetadata =
  | Readonly<{
      kind: 'avrt';
      activationSequence: 'concentric' | 'eccentric';
      earliestAtrialSite: 'his-proximal-cs' | 'distal-cs';
      likelyAccessoryPathwayRegion: 'septal' | 'left-free-wall';
    }>
  | Readonly<{
      kind: 'ventricular-overdrive-pacing';
      response: 'VAAV';
      supports: 'atrial-tachycardia';
    }>
  | Readonly<{
      kind: 'ventricular-overdrive-pacing';
      response: 'VAV';
      tclMs: number;
      ppiMs: number;
      ppiMinusTclMs: number;
      conventionalInterpretation: 'favours-avnrt';
      nextManeuver: 'his-refractory-pvc';
    }>;

export interface TaskFourTraceDefinition {
  readonly id: TaskFourTraceId;
  readonly title: string;
  readonly description: string;
  readonly teachingLabel: typeof TASK_FOUR_EDUCATIONAL_TRACE_LABEL;
  readonly channels: readonly TaskFourTraceChannel[];
  readonly annotations: readonly TaskFourTraceAnnotation[];
  readonly teachingMetadata: TaskFourTeachingMetadata;
}

const event = (id: string, kind: TaskFourTraceEventKind, x: number): TaskFourTraceEvent =>
  Object.freeze({ id, kind, x });

const channel = (
  id: string,
  label: string,
  events: readonly TaskFourTraceEvent[],
): TaskFourTraceChannel => Object.freeze({ id, label, events: Object.freeze([...events]) });

const annotation = (
  id: string,
  label: string,
  x: number,
  visibility: TaskFourTraceAnnotation['visibility'],
  channelId?: string,
  endX?: number,
): TaskFourTraceAnnotation => Object.freeze({ id, label, x, visibility, channelId, endX });

const trace = (
  definition: Omit<TaskFourTraceDefinition, 'teachingLabel'>,
): TaskFourTraceDefinition => Object.freeze({
  ...definition,
  teachingLabel: TASK_FOUR_EDUCATIONAL_TRACE_LABEL,
  channels: Object.freeze([...definition.channels]),
  annotations: Object.freeze([...definition.annotations]),
  teachingMetadata: Object.freeze({ ...definition.teachingMetadata }),
});

const ventricularXs = Object.freeze([90, 250, 410, 570]);
const eventsAt = (
  prefix: string,
  kind: TaskFourTraceEventKind,
  xs: readonly number[],
  offset = 0,
): readonly TaskFourTraceEvent[] => Object.freeze(
  xs.map((x, index) => event(`${prefix}-${index + 1}`, kind, x + offset)),
);

export const taskFourTraceCatalog: Readonly<Record<TaskFourTraceId, TaskFourTraceDefinition>> = Object.freeze({
  'avrt-concentric-septal': trace({
    id: 'avrt-concentric-septal',
    title: 'Orthodromic AVRT with concentric retrograde atrial activation',
    description: 'Regular 1:1 AV tachycardia with earliest retrograde atrial activation at the His/proximal coronary-sinus region, supporting a septal accessory pathway while requiring confirmatory pacing.',
    channels: [
      channel('lead-ii', 'II', eventsAt('conc-qrs', 'qrs', ventricularXs)),
      channel('hra', 'HRA', eventsAt('conc-hra-a', 'atrial', ventricularXs, 82)),
      channel('his', 'His', [
        ...eventsAt('conc-his-h', 'his', ventricularXs, -14),
        ...eventsAt('conc-his-v', 'ventricular', ventricularXs),
        ...eventsAt('conc-his-a', 'atrial', ventricularXs, 58),
      ]),
      channel('cs9-10', 'CS 9-10', eventsAt('conc-cs9-a', 'atrial', ventricularXs, 64)),
      channel('cs5-6', 'CS 5-6', eventsAt('conc-cs5-a', 'atrial', ventricularXs, 78)),
      channel('cs1-2', 'CS 1-2', eventsAt('conc-cs1-a', 'atrial', ventricularXs, 96)),
      channel('rva', 'RVA', eventsAt('conc-rva-v', 'ventricular', ventricularXs, 2)),
    ],
    annotations: [
      annotation('conc-fixed-va', 'Fixed 1:1 V-A relation', 250, 'instructor', 'his', 308),
      annotation('conc-earliest', 'Earliest A at His/proximal CS: concentric sequence', 420, 'instructor', 'his'),
    ],
    teachingMetadata: {
      kind: 'avrt',
      activationSequence: 'concentric',
      earliestAtrialSite: 'his-proximal-cs',
      likelyAccessoryPathwayRegion: 'septal',
    },
  }),
  'avrt-eccentric-left-free-wall': trace({
    id: 'avrt-eccentric-left-free-wall',
    title: 'Orthodromic AVRT with eccentric left-sided retrograde atrial activation',
    description: 'Regular 1:1 AV tachycardia with distal-to-proximal coronary-sinus activation and earliest retrograde atrial activation at CS 1-2, supporting a left free-wall accessory pathway.',
    channels: [
      channel('lead-ii', 'II', eventsAt('ecc-qrs', 'qrs', ventricularXs)),
      channel('hra', 'HRA', eventsAt('ecc-hra-a', 'atrial', ventricularXs, 90)),
      channel('his', 'His', [
        ...eventsAt('ecc-his-h', 'his', ventricularXs, -14),
        ...eventsAt('ecc-his-v', 'ventricular', ventricularXs),
        ...eventsAt('ecc-his-a', 'atrial', ventricularXs, 92),
      ]),
      channel('cs9-10', 'CS 9-10', eventsAt('ecc-cs9-a', 'atrial', ventricularXs, 82)),
      channel('cs5-6', 'CS 5-6', eventsAt('ecc-cs5-a', 'atrial', ventricularXs, 68)),
      channel('cs1-2', 'CS 1-2', eventsAt('ecc-cs1-a', 'atrial', ventricularXs, 54)),
      channel('rva', 'RVA', eventsAt('ecc-rva-v', 'ventricular', ventricularXs, 2)),
    ],
    annotations: [
      annotation('ecc-fixed-va', 'Fixed 1:1 V-A relation', 250, 'instructor', 'his', 342),
      annotation('ecc-earliest', 'Earliest A at CS 1-2: eccentric distal-to-proximal sequence', 430, 'instructor', 'cs1-2'),
    ],
    teachingMetadata: {
      kind: 'avrt',
      activationSequence: 'eccentric',
      earliestAtrialSite: 'distal-cs',
      likelyAccessoryPathwayRegion: 'left-free-wall',
    },
  }),
  'vaav-after-ventricular-overdrive-pacing': trace({
    id: 'vaav-after-ventricular-overdrive-pacing',
    title: 'VAAV response after ventricular overdrive pacing',
    description: 'After an RV overdrive-pacing train, the last paced ventricular event is followed by two atrial activations before the return ventricular beat, strongly supporting atrial tachycardia in the standard interpretation.',
    channels: [
      channel('lead-ii', 'II', [
        ...eventsAt('vaav-qrs-base', 'qrs', [80, 230]),
        ...eventsAt('vaav-qrs-paced', 'qrs', [360, 430, 500, 570]),
        event('vaav-qrs-return', 'qrs', 720),
      ]),
      channel('hra', 'HRA', eventsAt('vaav-a', 'atrial', [145, 295, 425, 495, 565, 635, 685])),
      channel('his', 'His', [
        ...eventsAt('vaav-h', 'his', [68, 218, 708]),
        ...eventsAt('vaav-v', 'ventricular', [80, 230, 360, 430, 500, 570, 720]),
      ]),
      channel('rva', 'RVA', [
        ...eventsAt('vaav-stim', 'stimulus', [360, 430, 500, 570]),
        ...eventsAt('vaav-rva-v', 'ventricular', [80, 230, 360, 430, 500, 570, 720]),
      ]),
    ],
    annotations: [
      annotation('vaav-train', 'Ventricular pacing train', 360, 'student', 'rva', 570),
      annotation('vaav-sequence', 'Last paced V → A → A → return V', 570, 'instructor', 'hra', 720),
      annotation('vaav-at', 'VAAV strongly supports atrial tachycardia', 520, 'instructor', 'lead-ii'),
    ],
    teachingMetadata: {
      kind: 'ventricular-overdrive-pacing',
      response: 'VAAV',
      supports: 'atrial-tachycardia',
    },
  }),
  'vav-after-ventricular-overdrive-pacing': trace({
    id: 'vav-after-ventricular-overdrive-pacing',
    title: 'VAV response after ventricular overdrive pacing',
    description: 'After an RV overdrive-pacing train, the last paced ventricular event is followed by one atrial activation and the return ventricular beat. A PPI-TCL of 140 ms favours AVNRT conventionally; a His-refractory PVC is the next confirmatory manoeuvre for accessory-pathway participation.',
    channels: [
      channel('lead-ii', 'II', [
        ...eventsAt('vav-qrs-base', 'qrs', [80, 270]),
        ...eventsAt('vav-qrs-paced', 'qrs', [390, 455, 520, 585]),
        event('vav-qrs-return', 'qrs', 705),
      ]),
      channel('hra', 'HRA', eventsAt('vav-a', 'atrial', [145, 335, 445, 510, 575, 640])),
      channel('his', 'His', [
        ...eventsAt('vav-h', 'his', [68, 258, 693]),
        ...eventsAt('vav-v', 'ventricular', [80, 270, 390, 455, 520, 585, 705]),
      ]),
      channel('rva', 'RVA', [
        ...eventsAt('vav-stim', 'stimulus', [390, 455, 520, 585]),
        ...eventsAt('vav-rva-v', 'ventricular', [80, 270, 390, 455, 520, 585, 705]),
      ]),
    ],
    annotations: [
      annotation('vav-train', 'Ventricular pacing train', 390, 'student', 'rva', 585),
      annotation('vav-sequence', 'Last paced V → A → return V', 585, 'instructor', 'hra', 705),
      annotation('vav-ppi', 'PPI 440 ms; TCL 300 ms; PPI-TCL 140 ms (>115 ms)', 405, 'instructor', 'lead-ii'),
      annotation('vav-next', 'Next: His-refractory PVC; assess A-A advancement/reset', 455, 'instructor', 'his'),
    ],
    teachingMetadata: {
      kind: 'ventricular-overdrive-pacing',
      response: 'VAV',
      tclMs: 300,
      ppiMs: 440,
      ppiMinusTclMs: 140,
      conventionalInterpretation: 'favours-avnrt',
      nextManeuver: 'his-refractory-pvc',
    },
  }),
});

export const taskFourTraceIds = Object.freeze(Object.keys(taskFourTraceCatalog) as TaskFourTraceId[]);

export function getTaskFourTraceStructureSignature(definition: TaskFourTraceDefinition): string {
  return JSON.stringify({
    channels: definition.channels.map((item) => ({
      id: item.id,
      events: item.events.map((traceEvent) => [traceEvent.kind, traceEvent.x]),
    })),
  });
}
