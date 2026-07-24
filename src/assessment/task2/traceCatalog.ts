export const EDUCATIONAL_TRACE_LABEL = 'Synthetic educational tracing — not patient data.' as const;

export type TaskTwoTraceId =
  | 'snrt'
  | 'arp'
  | 'erp'
  | 'avnrt'
  | 'wenckebach'
  | 'sinus-bradycardia'
  | 'sinus-pause'
  | 'mobitz-i'
  | 'mobitz-ii'
  | 'complete-heart-block';

export type TraceEventKind =
  | 'stimulus'
  | 'atrial'
  | 'his'
  | 'ventricular'
  | 'p-wave'
  | 'qrs'
  | 'wide-qrs';

export interface TraceEvent {
  readonly id: string;
  readonly kind: TraceEventKind;
  readonly x: number;
}

export interface TraceChannel {
  readonly id: string;
  readonly label: string;
  readonly events: readonly TraceEvent[];
}

export interface TraceAnnotation {
  readonly id: string;
  readonly kind: 'interval' | 'blocked' | 'note';
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly channelId?: string;
}

export interface TaskTwoTraceDefinition {
  readonly id: TaskTwoTraceId;
  readonly title: string;
  readonly description: string;
  readonly teachingLabel: typeof EDUCATIONAL_TRACE_LABEL;
  readonly channels: readonly TraceChannel[];
  readonly annotations: readonly TraceAnnotation[];
}

const event = (id: string, kind: TraceEventKind, x: number): TraceEvent => Object.freeze({ id, kind, x });
const channel = (id: string, label: string, events: readonly TraceEvent[]): TraceChannel =>
  Object.freeze({ id, label, events: Object.freeze(events) });
const annotation = (
  id: string,
  kind: TraceAnnotation['kind'],
  label: string,
  x: number,
  channelId?: string,
  endX?: number,
): TraceAnnotation => Object.freeze({ id, kind, label, x, channelId, endX });
const trace = (
  definition: Omit<TaskTwoTraceDefinition, 'teachingLabel'>,
): TaskTwoTraceDefinition => Object.freeze({
  ...definition,
  teachingLabel: EDUCATIONAL_TRACE_LABEL,
  channels: Object.freeze(definition.channels),
  annotations: Object.freeze(definition.annotations),
});

export const taskTwoTraceCatalog: Readonly<Record<TaskTwoTraceId, TaskTwoTraceDefinition>> = Object.freeze({
  snrt: trace({
    id: 'snrt',
    title: 'Sinus-node recovery time',
    description: 'Atrial overdrive pacing stops, followed by a recovery interval before sinus atrial activity returns.',
    channels: [
      channel('stim', 'Stim', [
        event('s1-1', 'stimulus', 90), event('s1-2', 'stimulus', 150), event('s1-3', 'stimulus', 210), event('s1-4', 'stimulus', 270),
      ]),
      channel('hra', 'HRA', [
        event('a1', 'atrial', 98), event('a2', 'atrial', 158), event('a3', 'atrial', 218), event('a4', 'atrial', 278),
        event('sinus-a1', 'atrial', 410), event('sinus-a2', 'atrial', 500), event('sinus-a3', 'atrial', 590),
      ]),
    ],
    annotations: [annotation('snrt-interval', 'interval', 'SNRT', 278, 'hra', 410)],
  }),
  arp: trace({
    id: 'arp',
    title: 'Atrial refractory period',
    description: 'A premature atrial stimulus is delivered but is not followed by a propagated atrial electrogram.',
    channels: [
      channel('stim', 'Stim', [
        event('s1-1', 'stimulus', 90), event('s1-2', 'stimulus', 190), event('s1-3', 'stimulus', 290), event('s2', 'stimulus', 350),
      ]),
      channel('hra', 'HRA', [
        event('a1', 'atrial', 98), event('a2', 'atrial', 198), event('a3', 'atrial', 298),
      ]),
    ],
    annotations: [annotation('blocked-atrial', 'blocked', 'S2: no atrial response', 350, 'hra')],
  }),
  erp: trace({
    id: 'erp',
    title: 'Effective refractory period',
    description: 'The premature stimulus still captures atrium, while His and ventricular conduction are absent.',
    channels: [
      channel('hra', 'HRA', [
        event('a1', 'atrial', 98), event('a2', 'atrial', 198), event('a3', 'atrial', 298), event('captured-a-s2', 'atrial', 358),
      ]),
      channel('his', 'His', [
        event('h1', 'his', 116), event('h2', 'his', 216), event('h3', 'his', 316),
      ]),
      channel('rv', 'RV', [
        event('v1', 'ventricular', 132), event('v2', 'ventricular', 232), event('v3', 'ventricular', 332),
      ]),
    ],
    annotations: [annotation('blocked-hv', 'blocked', 'A captured; no H/V', 358, 'his')],
  }),
  avnrt: trace({
    id: 'avnrt',
    title: 'Atrioventricular nodal re-entry tachycardia',
    description: 'A regular rapid narrow-complex rhythm with atrial and ventricular activation occurring almost together.',
    channels: [
      channel('his', 'His', [
        event('h1', 'his', 88), event('h2', 'his', 158), event('h3', 'his', 228), event('h4', 'his', 298),
        event('h5', 'his', 368), event('h6', 'his', 438), event('h7', 'his', 508), event('h8', 'his', 578),
      ]),
      channel('hra', 'HRA', [
        event('a1', 'atrial', 99), event('a2', 'atrial', 169), event('a3', 'atrial', 239), event('a4', 'atrial', 309),
        event('a5', 'atrial', 379), event('a6', 'atrial', 449), event('a7', 'atrial', 519), event('a8', 'atrial', 589),
      ]),
      channel('rv', 'RV', [
        event('v1', 'ventricular', 96), event('v2', 'ventricular', 166), event('v3', 'ventricular', 236), event('v4', 'ventricular', 306),
        event('v5', 'ventricular', 376), event('v6', 'ventricular', 446), event('v7', 'ventricular', 516), event('v8', 'ventricular', 586),
      ]),
    ],
    annotations: [annotation('short-va', 'note', 'near-simultaneous A/V', 420, 'hra')],
  }),
  wenckebach: trace({
    id: 'wenckebach',
    title: 'Wenckebach conduction',
    description: 'Regular atrial activity shows progressive AH delay, one non-conducted atrial beat, then reset.',
    channels: [
      channel('hra', 'A', [
        event('a1', 'atrial', 70), event('a2', 'atrial', 160), event('a3', 'atrial', 250), event('a4', 'atrial', 340),
        event('a5-drop', 'atrial', 430), event('a6', 'atrial', 520), event('a7', 'atrial', 610),
      ]),
      channel('his', 'H', [
        event('h1', 'his', 88), event('h2', 'his', 188), event('h3', 'his', 288), event('h4', 'his', 388),
        event('h6', 'his', 538), event('h7', 'his', 638),
      ]),
      channel('rv', 'V', [
        event('v1', 'ventricular', 104), event('v2', 'ventricular', 204), event('v3', 'ventricular', 304), event('v4', 'ventricular', 404),
        event('v6', 'ventricular', 554), event('v7', 'ventricular', 654),
      ]),
    ],
    annotations: [
      annotation('ah-1', 'interval', 'AH 1', 70, 'hra', 88),
      annotation('ah-2', 'interval', 'AH 2', 160, 'hra', 188),
      annotation('ah-3', 'interval', 'AH 3', 250, 'hra', 288),
      annotation('ah-4', 'interval', 'AH 4', 340, 'hra', 388),
      annotation('drop', 'blocked', 'dropped V', 430, 'rv'),
      annotation('reset', 'note', 'reset', 538, 'his'),
    ],
  }),
  'sinus-bradycardia': trace({
    id: 'sinus-bradycardia',
    title: 'Sinus bradycardia',
    description: 'Regular P waves precede every QRS at a slow, constant rate.',
    channels: [channel('lead-ii', 'II', [
      event('p1', 'p-wave', 75), event('q1', 'qrs', 102),
      event('p2', 'p-wave', 235), event('q2', 'qrs', 262),
      event('p3', 'p-wave', 395), event('q3', 'qrs', 422),
      event('p4', 'p-wave', 555), event('q4', 'qrs', 582),
    ])],
    annotations: [annotation('slow-regular', 'note', 'slow, regular sinus rhythm', 360, 'lead-ii')],
  }),
  'sinus-pause': trace({
    id: 'sinus-pause',
    title: 'Sinus pause',
    description: 'An expected sinus P–QRS complex is absent, producing a prolonged pause before sinus activity resumes.',
    channels: [channel('lead-ii', 'II', [
      event('p1', 'p-wave', 65), event('q1', 'qrs', 92),
      event('p2', 'p-wave', 175), event('q2', 'qrs', 202),
      event('p4', 'p-wave', 395), event('q4', 'qrs', 422),
      event('p5', 'p-wave', 505), event('q5', 'qrs', 532),
      event('p6', 'p-wave', 615), event('q6', 'qrs', 642),
    ])],
    annotations: [annotation('pause', 'interval', 'sinus pause', 202, 'lead-ii', 395)],
  }),
  'mobitz-i': trace({
    id: 'mobitz-i',
    title: 'Second-degree AV block: Mobitz I',
    description: 'PR intervals progressively lengthen until one P wave is not followed by a QRS, then the sequence resets.',
    channels: [channel('lead-ii', 'II', [
      event('p1', 'p-wave', 55), event('q1', 'qrs', 80),
      event('p2', 'p-wave', 145), event('q2', 'qrs', 180),
      event('p3', 'p-wave', 235), event('q3', 'qrs', 280),
      event('p4-drop', 'p-wave', 325),
      event('p5', 'p-wave', 415), event('q5', 'qrs', 440),
      event('p6', 'p-wave', 505), event('q6', 'qrs', 540),
      event('p7', 'p-wave', 595), event('q7', 'qrs', 640),
    ])],
    annotations: [
      annotation('pr-1', 'interval', 'PR', 55, 'lead-ii', 80),
      annotation('pr-2', 'interval', 'PR↑', 145, 'lead-ii', 180),
      annotation('pr-3', 'interval', 'PR↑↑', 235, 'lead-ii', 280),
      annotation('mobitz-i-drop', 'blocked', 'P without QRS', 325, 'lead-ii'),
    ],
  }),
  'mobitz-ii': trace({
    id: 'mobitz-ii',
    title: 'Second-degree AV block: Mobitz II',
    description: 'Conducted beats retain a fixed PR interval while intermittent P waves are not followed by QRS complexes.',
    channels: [channel('lead-ii', 'II', [
      event('p1', 'p-wave', 55), event('q1', 'qrs', 82),
      event('p2', 'p-wave', 145), event('q2', 'qrs', 172),
      event('p3-drop', 'p-wave', 235),
      event('p4', 'p-wave', 325), event('q4', 'qrs', 352),
      event('p5', 'p-wave', 415), event('q5', 'qrs', 442),
      event('p6-drop', 'p-wave', 505),
      event('p7', 'p-wave', 595), event('q7', 'qrs', 622),
    ])],
    annotations: [
      annotation('fixed-pr-1', 'interval', 'fixed PR', 55, 'lead-ii', 82),
      annotation('fixed-pr-2', 'interval', 'fixed PR', 145, 'lead-ii', 172),
      annotation('mobitz-ii-drop-1', 'blocked', 'dropped QRS', 235, 'lead-ii'),
      annotation('mobitz-ii-drop-2', 'blocked', 'dropped QRS', 505, 'lead-ii'),
    ],
  }),
  'complete-heart-block': trace({
    id: 'complete-heart-block',
    title: 'Complete heart block',
    description: 'Atrial P waves and a slower ventricular escape rhythm continue independently without a fixed PR relationship.',
    channels: [channel('lead-ii', 'II', [
      event('p1', 'p-wave', 50), event('p2', 'p-wave', 135), event('p3', 'p-wave', 220), event('p4', 'p-wave', 305),
      event('p5', 'p-wave', 390), event('p6', 'p-wave', 475), event('p7', 'p-wave', 560), event('p8', 'p-wave', 645),
      event('v1', 'wide-qrs', 92), event('v2', 'wide-qrs', 237), event('v3', 'wide-qrs', 382), event('v4', 'wide-qrs', 527), event('v5', 'wide-qrs', 672),
    ])],
    annotations: [annotation('av-dissociation', 'note', 'independent A and V rhythms', 360, 'lead-ii')],
  }),
});

export const taskTwoTraceIds = Object.freeze(Object.keys(taskTwoTraceCatalog) as TaskTwoTraceId[]);

export function getTraceStructureSignature(definition: TaskTwoTraceDefinition): string {
  return JSON.stringify({
    channels: definition.channels.map((traceChannel) => ({
      label: traceChannel.label,
      events: traceChannel.events.map(({ kind, x }) => ({ kind, x })),
    })),
    annotations: definition.annotations.map(({ kind, x, endX, channelId }) => ({ kind, x, endX, channelId })),
  });
}
