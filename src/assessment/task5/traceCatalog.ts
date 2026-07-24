import type { TaskFiveTraceId } from './catalog';

export type TaskFiveTraceEventKind =
  | 'qrs-positive'
  | 'qrs-negative'
  | 'qrs-lbbb'
  | 'qrs-rbbb'
  | 'qrs-narrow'
  | 'qrs-wide'
  | 'atrial'
  | 'his'
  | 'ventricular'
  | 'stimulus';

export interface TaskFiveTraceEvent {
  readonly id: string;
  readonly kind: TaskFiveTraceEventKind;
  readonly x: number;
  readonly widthScale?: number;
  readonly amplitudeScale?: number;
}

export interface TaskFiveTraceChannel {
  readonly id: string;
  readonly label: string;
  readonly events: readonly TaskFiveTraceEvent[];
}

export interface TaskFiveTraceAnnotation {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly endX?: number;
  readonly channelId?: string;
  readonly visibility: 'student' | 'instructor';
}

export interface TaskFiveTraceDefinition {
  readonly id: TaskFiveTraceId;
  readonly title: string;
  readonly description: string;
  readonly teachingLabel: string;
  readonly channels: readonly TaskFiveTraceChannel[];
  readonly annotations: readonly TaskFiveTraceAnnotation[];
}

const tachycardiaXs = Object.freeze([120, 278, 438, 598] as const);
const beatWidths = Object.freeze([0.96, 1.03, 0.99, 1.05] as const);
const beatAmplitudes = Object.freeze([1, 0.94, 1.04, 0.97] as const);

function repeatedEvents(
  prefix: string,
  kind: TaskFiveTraceEventKind,
  amplitude = 1,
): readonly TaskFiveTraceEvent[] {
  return Object.freeze(tachycardiaXs.map((x, index) => Object.freeze({
    id: `${prefix}-${index + 1}`,
    kind,
    x,
    widthScale: beatWidths[index],
    amplitudeScale: (beatAmplitudes[index] ?? 1) * amplitude,
  })));
}

const rvotTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'wide-complex-ecg-case-1',
  title: 'RVOT ventricular tachycardia — LBBB-like inferior-axis pattern',
  description: 'Synthetic regular ventricular tachycardia with predominantly positive inferior leads and an LBBB-like precordial pattern.',
  teachingLabel: 'Schematic six-lead teaching ECG for morphology interpretation.',
  channels: Object.freeze([
    Object.freeze({ id: 'lead-i', label: 'I', events: repeatedEvents('rvot-i', 'qrs-positive', 0.56) }),
    Object.freeze({ id: 'lead-ii', label: 'II', events: repeatedEvents('rvot-ii', 'qrs-positive', 1.00) }),
    Object.freeze({ id: 'lead-iii', label: 'III', events: repeatedEvents('rvot-iii', 'qrs-positive', 0.92) }),
    Object.freeze({ id: 'lead-avf', label: 'aVF', events: repeatedEvents('rvot-avf', 'qrs-positive', 0.96) }),
    Object.freeze({ id: 'lead-v1', label: 'V1', events: repeatedEvents('rvot-v1', 'qrs-lbbb', 1.02) }),
    Object.freeze({ id: 'lead-v6', label: 'V6', events: repeatedEvents('rvot-v6', 'qrs-positive', 0.78) }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'rvot-lbbb', label: 'LBBB-like precordial pattern', x: 438, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 'rvot-axis', label: 'Inferior leads predominantly positive', x: 278, channelId: 'lead-avf', visibility: 'instructor' }),
  ]),
});

const fascicularTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'wide-complex-ecg-case-2',
  title: 'Left posterior fascicular VT — RBBB-like left/superior-axis pattern',
  description: 'Synthetic regular fascicular ventricular tachycardia with an RBBB-like precordial pattern and negative inferior leads.',
  teachingLabel: 'Schematic six-lead teaching ECG for morphology interpretation.',
  channels: Object.freeze([
    Object.freeze({ id: 'lead-i', label: 'I', events: repeatedEvents('fasc-i', 'qrs-positive', 0.72) }),
    Object.freeze({ id: 'lead-ii', label: 'II', events: repeatedEvents('fasc-ii', 'qrs-negative', 0.86) }),
    Object.freeze({ id: 'lead-iii', label: 'III', events: repeatedEvents('fasc-iii', 'qrs-negative', 0.98) }),
    Object.freeze({ id: 'lead-avf', label: 'aVF', events: repeatedEvents('fasc-avf', 'qrs-negative', 0.92) }),
    Object.freeze({ id: 'lead-v1', label: 'V1', events: repeatedEvents('fasc-v1', 'qrs-rbbb', 1.02) }),
    Object.freeze({ id: 'lead-v6', label: 'V6', events: repeatedEvents('fasc-v6', 'qrs-negative', 0.62) }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'fasc-rbbb', label: 'RBBB-like precordial pattern', x: 438, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 'fasc-axis', label: 'Leftward/superior axis', x: 278, channelId: 'lead-avf', visibility: 'instructor' }),
  ]),
});

function pairedEvents(
  prefix: string,
  kind: TaskFiveTraceEventKind,
  highX: number,
  lowX: number,
  amplitudeScale = 1,
): readonly TaskFiveTraceEvent[] {
  return Object.freeze([
    Object.freeze({
      id: `${prefix}-high`,
      kind,
      x: highX,
      amplitudeScale,
    }),
    Object.freeze({
      id: `${prefix}-low`,
      kind,
      x: lowX,
      amplitudeScale: amplitudeScale * 0.97,
    }),
  ]);
}

const paraHisianTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'paired-pacing-egm-case',
  title: 'Para-Hisian pacing — unchanged S-A timing and retrograde sequence after loss of His capture',
  description: 'Paired synthetic pacing states. Lower output loses direct His/right-bundle capture while ventricular capture persists; the surface QRS widens but S-A timing and the distal-to-proximal CS sequence remain unchanged.',
  teachingLabel: 'Schematic para-Hisian pacing comparison with a complete five-bipole coronary-sinus sequence.',
  channels: Object.freeze([
    Object.freeze({
      id: 'surface-ii',
      label: 'II',
      events: Object.freeze([
        Object.freeze({ id: 'surface-high', kind: 'qrs-narrow', x: 170 }),
        Object.freeze({ id: 'surface-low', kind: 'qrs-wide', x: 510 }),
      ]),
    }),
    Object.freeze({
      id: 'surface-v1',
      label: 'V1',
      events: Object.freeze([
        Object.freeze({ id: 'v1-high', kind: 'qrs-negative', x: 170, amplitudeScale: 0.75 }),
        Object.freeze({ id: 'v1-low', kind: 'qrs-lbbb', x: 510, amplitudeScale: 0.95 }),
      ]),
    }),
    Object.freeze({
      id: 'hra',
      label: 'HRA',
      events: pairedEvents('hra-a', 'atrial', 260, 600, 0.72),
    }),
    Object.freeze({
      id: 'hbe-distal',
      label: 'His d',
      events: Object.freeze([
        Object.freeze({ id: 'hd-stim-high', kind: 'stimulus', x: 150 }),
        Object.freeze({ id: 'hd-his-high', kind: 'his', x: 158 }),
        Object.freeze({ id: 'hd-v-high', kind: 'ventricular', x: 170 }),
        Object.freeze({ id: 'hd-stim-low', kind: 'stimulus', x: 490 }),
        Object.freeze({ id: 'hd-v-low', kind: 'ventricular', x: 510 }),
        Object.freeze({ id: 'hd-a-high', kind: 'atrial', x: 256, amplitudeScale: 0.72 }),
        Object.freeze({ id: 'hd-a-low', kind: 'atrial', x: 596, amplitudeScale: 0.70 }),
      ]),
    }),
    Object.freeze({
      id: 'hbe-proximal',
      label: 'His p',
      events: Object.freeze([
        Object.freeze({ id: 'hp-stim-high', kind: 'stimulus', x: 150 }),
        Object.freeze({ id: 'hp-his-high', kind: 'his', x: 160, amplitudeScale: 0.78 }),
        Object.freeze({ id: 'hp-v-high', kind: 'ventricular', x: 172, amplitudeScale: 0.82 }),
        Object.freeze({ id: 'hp-stim-low', kind: 'stimulus', x: 490 }),
        Object.freeze({ id: 'hp-v-low', kind: 'ventricular', x: 512, amplitudeScale: 0.82 }),
        Object.freeze({ id: 'hp-a-high', kind: 'atrial', x: 258, amplitudeScale: 0.62 }),
        Object.freeze({ id: 'hp-a-low', kind: 'atrial', x: 598, amplitudeScale: 0.60 }),
      ]),
    }),
    Object.freeze({
      id: 'rva',
      label: 'RVA',
      events: Object.freeze([
        Object.freeze({ id: 'rva-v-high', kind: 'ventricular', x: 174, amplitudeScale: 0.96 }),
        Object.freeze({ id: 'rva-v-low', kind: 'ventricular', x: 514, amplitudeScale: 1.02 }),
      ]),
    }),
    Object.freeze({
      id: 'cs-proximal',
      label: 'CS 9-10',
      events: pairedEvents('cs910-a', 'atrial', 255, 595, 0.66),
    }),
    Object.freeze({
      id: 'cs-78',
      label: 'CS 7-8',
      events: pairedEvents('cs78-a', 'atrial', 250, 590, 0.70),
    }),
    Object.freeze({
      id: 'cs-56',
      label: 'CS 5-6',
      events: pairedEvents('cs56-a', 'atrial', 245, 585, 0.74),
    }),
    Object.freeze({
      id: 'cs-34',
      label: 'CS 3-4',
      events: pairedEvents('cs34-a', 'atrial', 240, 580, 0.78),
    }),
    Object.freeze({
      id: 'cs-distal',
      label: 'CS 1-2',
      events: pairedEvents('cs12-a', 'atrial', 235, 575, 0.84),
    }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'high-output', label: 'Higher output', x: 112, visibility: 'student' }),
    Object.freeze({ id: 'low-output', label: 'Lower output', x: 452, visibility: 'student' }),
    Object.freeze({ id: 'capture-high', label: 'His/RB + ventricular capture', x: 160, channelId: 'hbe-distal', visibility: 'instructor' }),
    Object.freeze({ id: 'capture-low', label: 'Ventricular capture only', x: 500, channelId: 'hbe-distal', visibility: 'instructor' }),
    Object.freeze({ id: 'sa-high', label: 'S-A 85 ms', x: 150, endX: 235, channelId: 'cs-distal', visibility: 'instructor' }),
    Object.freeze({ id: 'sa-low', label: 'S-A 85 ms', x: 490, endX: 575, channelId: 'cs-distal', visibility: 'instructor' }),
    Object.freeze({ id: 'sequence', label: 'Distal-to-proximal sequence unchanged', x: 352, visibility: 'instructor' }),
  ]),
});

export const taskFiveTraceCatalog: Readonly<Record<TaskFiveTraceId, TaskFiveTraceDefinition>> = Object.freeze({
  'wide-complex-ecg-case-1': rvotTrace,
  'wide-complex-ecg-case-2': fascicularTrace,
  'paired-pacing-egm-case': paraHisianTrace,
});
