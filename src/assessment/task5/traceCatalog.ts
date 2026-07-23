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

const tachycardiaXs = Object.freeze([120, 280, 440, 600] as const);

function repeatedEvents(
  prefix: string,
  kind: TaskFiveTraceEventKind,
): readonly TaskFiveTraceEvent[] {
  return Object.freeze(tachycardiaXs.map((x, index) => Object.freeze({
    id: `${prefix}-${index + 1}`,
    kind,
    x,
  })));
}

const rvotTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'wide-complex-ecg-case-1',
  title: 'RVOT ventricular tachycardia — LBBB-like inferior-axis pattern',
  description: 'Synthetic regular wide-complex tachycardia with predominantly positive inferior leads, a predominantly negative V1 complex and a positive V6 complex.',
  teachingLabel: 'Synthetic six-lead wide-complex tachycardia excerpt for morphology interpretation.',
  channels: Object.freeze([
    Object.freeze({ id: 'lead-i', label: 'I', events: repeatedEvents('rvot-i', 'qrs-positive') }),
    Object.freeze({ id: 'lead-ii', label: 'II', events: repeatedEvents('rvot-ii', 'qrs-positive') }),
    Object.freeze({ id: 'lead-iii', label: 'III', events: repeatedEvents('rvot-iii', 'qrs-positive') }),
    Object.freeze({ id: 'lead-avf', label: 'aVF', events: repeatedEvents('rvot-avf', 'qrs-positive') }),
    Object.freeze({ id: 'lead-v1', label: 'V1', events: repeatedEvents('rvot-v1', 'qrs-lbbb') }),
    Object.freeze({ id: 'lead-v6', label: 'V6', events: repeatedEvents('rvot-v6', 'qrs-positive') }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'rvot-lbbb', label: 'LBBB-like precordial pattern', x: 440, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 'rvot-axis', label: 'Inferior leads predominantly positive', x: 280, channelId: 'lead-avf', visibility: 'instructor' }),
  ]),
});

const fascicularTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'wide-complex-ecg-case-2',
  title: 'Left posterior fascicular VT — RBBB-like left/superior-axis pattern',
  description: 'Synthetic regular wide-complex tachycardia with an RBBB-like precordial pattern and negative inferior leads indicating a leftward/superior frontal-plane axis.',
  teachingLabel: 'Synthetic six-lead wide-complex tachycardia excerpt for morphology interpretation.',
  channels: Object.freeze([
    Object.freeze({ id: 'lead-i', label: 'I', events: repeatedEvents('fasc-i', 'qrs-positive') }),
    Object.freeze({ id: 'lead-ii', label: 'II', events: repeatedEvents('fasc-ii', 'qrs-negative') }),
    Object.freeze({ id: 'lead-iii', label: 'III', events: repeatedEvents('fasc-iii', 'qrs-negative') }),
    Object.freeze({ id: 'lead-avf', label: 'aVF', events: repeatedEvents('fasc-avf', 'qrs-negative') }),
    Object.freeze({ id: 'lead-v1', label: 'V1', events: repeatedEvents('fasc-v1', 'qrs-rbbb') }),
    Object.freeze({ id: 'lead-v6', label: 'V6', events: repeatedEvents('fasc-v6', 'qrs-negative') }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'fasc-rbbb', label: 'RBBB-like precordial pattern', x: 440, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 'fasc-axis', label: 'Leftward/superior axis', x: 280, channelId: 'lead-avf', visibility: 'instructor' }),
  ]),
});

const paraHisianTrace: TaskFiveTraceDefinition = Object.freeze({
  id: 'paired-pacing-egm-case',
  title: 'Para-Hisian pacing — unchanged S-A timing and atrial sequence after loss of His capture',
  description: 'Synthetic paired pacing states. Higher output captures the ventricle plus His/right bundle; lower output maintains ventricular capture but loses His/right-bundle capture. QRS widens while stimulus-to-atrial timing and retrograde atrial sequence remain unchanged.',
  teachingLabel: 'Synthetic paired para-Hisian pacing states for capture, timing and retrograde-sequence interpretation.',
  channels: Object.freeze([
    Object.freeze({
      id: 'surface',
      label: 'ECG',
      events: Object.freeze([
        Object.freeze({ id: 'surface-high', kind: 'qrs-narrow', x: 170 }),
        Object.freeze({ id: 'surface-low', kind: 'qrs-wide', x: 510 }),
      ]),
    }),
    Object.freeze({
      id: 'hbe',
      label: 'HBE',
      events: Object.freeze([
        Object.freeze({ id: 'hbe-stim-high', kind: 'stimulus', x: 150 }),
        Object.freeze({ id: 'hbe-his-high', kind: 'his', x: 158 }),
        Object.freeze({ id: 'hbe-v-high', kind: 'ventricular', x: 170 }),
        Object.freeze({ id: 'hbe-stim-low', kind: 'stimulus', x: 490 }),
        Object.freeze({ id: 'hbe-v-low', kind: 'ventricular', x: 510 }),
      ]),
    }),
    Object.freeze({
      id: 'rva',
      label: 'RVA',
      events: Object.freeze([
        Object.freeze({ id: 'rva-v-high', kind: 'ventricular', x: 172 }),
        Object.freeze({ id: 'rva-v-low', kind: 'ventricular', x: 512 }),
      ]),
    }),
    Object.freeze({
      id: 'hra',
      label: 'HRA',
      events: Object.freeze([
        Object.freeze({ id: 'hra-a-high', kind: 'atrial', x: 235 }),
        Object.freeze({ id: 'hra-a-low', kind: 'atrial', x: 575 }),
      ]),
    }),
    Object.freeze({
      id: 'cs12',
      label: 'CS 1-2',
      events: Object.freeze([
        Object.freeze({ id: 'cs-a-high', kind: 'atrial', x: 235 }),
        Object.freeze({ id: 'cs-a-low', kind: 'atrial', x: 575 }),
      ]),
    }),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 'high-output', label: 'Higher output', x: 112, visibility: 'student' }),
    Object.freeze({ id: 'low-output', label: 'Lower output', x: 452, visibility: 'student' }),
    Object.freeze({ id: 'capture-high', label: 'His/RB + RV capture', x: 160, channelId: 'hbe', visibility: 'instructor' }),
    Object.freeze({ id: 'capture-low', label: 'RV-only capture', x: 500, channelId: 'hbe', visibility: 'instructor' }),
    Object.freeze({ id: 'sa-high', label: 'S-A 85 ms', x: 150, endX: 235, channelId: 'hra', visibility: 'instructor' }),
    Object.freeze({ id: 'sa-low', label: 'S-A 85 ms', x: 490, endX: 575, channelId: 'hra', visibility: 'instructor' }),
    Object.freeze({ id: 'sequence', label: 'Retrograde sequence unchanged', x: 355, visibility: 'instructor' }),
  ]),
});

export const taskFiveTraceCatalog: Readonly<Record<TaskFiveTraceId, TaskFiveTraceDefinition>> = Object.freeze({
  'wide-complex-ecg-case-1': rvotTrace,
  'wide-complex-ecg-case-2': fascicularTrace,
  'paired-pacing-egm-case': paraHisianTrace,
});
