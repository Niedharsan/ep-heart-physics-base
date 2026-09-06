import type {
  ClinicalTraceChannel,
  ClinicalTraceDefinition,
  ClinicalTraceEvent,
} from '../traces/clinicalTrace';
import type { VtLocalizationTaskId } from './vtLocalizationPractice';

type SurfaceQrsKind =
  | 'qrs-positive'
  | 'qrs-negative'
  | 'qrs-rbbb'
  | 'qrs-lbbb'
  | 'qrs-wide'
  | 'qrs-narrow';

const VT_BEAT_TIMES = Object.freeze([420, 1020, 1620, 2220, 2820, 3420] as const);
const SINUS_BEAT_TIMES = Object.freeze([500, 1740, 2980] as const);
const PVC_BEAT_TIMES = Object.freeze([1080, 2320] as const);

function regularEvents(
  prefix: string,
  kind: SurfaceQrsKind,
  amplitudeScale: number,
  widthScale = 1,
): readonly ClinicalTraceEvent[] {
  return Object.freeze(VT_BEAT_TIMES.map((timeMs, index) => Object.freeze({
    id: `${prefix}-${index + 1}`,
    kind,
    timeMs,
    widthScale: widthScale * (index % 2 === 0 ? 1 : 1.04),
    amplitudeScale: amplitudeScale * (index % 3 === 0 ? 1 : 0.96),
  })));
}

function pvcEvents(
  prefix: string,
  pvcKind: SurfaceQrsKind,
  pvcAmplitudeScale: number,
  sinusKind: SurfaceQrsKind = 'qrs-narrow',
  sinusAmplitudeScale = 0.44,
): readonly ClinicalTraceEvent[] {
  const sinus = SINUS_BEAT_TIMES.map((timeMs, index) => Object.freeze({
    id: `${prefix}-sinus-${index + 1}`,
    kind: sinusKind,
    timeMs,
    widthScale: 0.82,
    amplitudeScale: sinusAmplitudeScale,
  }));
  const pvcs = PVC_BEAT_TIMES.map((timeMs, index) => Object.freeze({
    id: `${prefix}-pvc-${index + 1}`,
    kind: pvcKind,
    timeMs,
    widthScale: 1.22,
    amplitudeScale: pvcAmplitudeScale,
  }));
  return Object.freeze([...sinus, ...pvcs].sort((a, b) => a.timeMs - b.timeMs));
}

function surfaceChannel(
  id: string,
  label: string,
  events: readonly ClinicalTraceEvent[],
): ClinicalTraceChannel {
  return Object.freeze({
    id,
    label,
    signalClass: 'surface',
    events,
  });
}

const taskSixTrace: ClinicalTraceDefinition = Object.freeze({
  id: 'class6-live-page19',
  title: 'Class 6 ECG localisation case 1',
  description: 'Live synthetic 12-lead recreation of the morphology and polarity relationships used by the supplied page 19 teaching case.',
  durationMs: 3800,
  teachingLabel: 'Live synthetic 12-lead teaching ECG based on the supplied Class 6 pattern.',
  channels: Object.freeze([
    surfaceChannel('lead-i', 'I', regularEvents('t6-i', 'qrs-positive', 0.48, 1.12)),
    surfaceChannel('lead-ii', 'II', regularEvents('t6-ii', 'qrs-negative', 0.98, 1.16)),
    surfaceChannel('lead-iii', 'III', regularEvents('t6-iii', 'qrs-negative', 1.04, 1.16)),
    surfaceChannel('lead-avr', 'aVR', regularEvents('t6-avr', 'qrs-positive', 0.72, 1.12)),
    surfaceChannel('lead-avl', 'aVL', regularEvents('t6-avl', 'qrs-positive', 0.80, 1.12)),
    surfaceChannel('lead-avf', 'aVF', regularEvents('t6-avf', 'qrs-negative', 0.94, 1.16)),
    surfaceChannel('lead-v1', 'V1', regularEvents('t6-v1', 'qrs-rbbb', 1.02, 1.10)),
    surfaceChannel('lead-v2', 'V2', regularEvents('t6-v2', 'qrs-rbbb', 0.88, 1.08)),
    surfaceChannel('lead-v3', 'V3', regularEvents('t6-v3', 'qrs-wide', 0.68, 1.08)),
    surfaceChannel('lead-v4', 'V4', regularEvents('t6-v4', 'qrs-positive', 0.62, 1.12)),
    surfaceChannel('lead-v5', 'V5', regularEvents('t6-v5', 'qrs-positive', 0.48, 1.12)),
    surfaceChannel('lead-v6', 'V6', regularEvents('t6-v6', 'qrs-negative', 0.60, 1.12)),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 't6-morphology', label: 'RBBB-type morphology in V1', timeMs: 1620, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 't6-inferior', label: 'Inferior leads are predominantly negative', timeMs: 2220, channelId: 'lead-avf', visibility: 'instructor' }),
    Object.freeze({ id: 't6-concordance', label: 'aVR and aVL are concordant positive', timeMs: 2820, channelId: 'lead-avl', visibility: 'instructor' }),
  ]),
});

const taskSevenTrace: ClinicalTraceDefinition = Object.freeze({
  id: 'class6-live-page20',
  title: 'Class 6 ECG localisation case 2',
  description: 'Live synthetic 12-lead recreation of the morphology, inferior-lead polarity and precordial concordance used by the supplied page 20 teaching case.',
  durationMs: 3800,
  teachingLabel: 'Live synthetic 12-lead teaching ECG based on the supplied Class 6 pattern.',
  channels: Object.freeze([
    surfaceChannel('lead-i', 'I', regularEvents('t7-i', 'qrs-positive', 0.72, 1.14)),
    surfaceChannel('lead-ii', 'II', regularEvents('t7-ii', 'qrs-positive', 0.94, 1.16)),
    surfaceChannel('lead-iii', 'III', regularEvents('t7-iii', 'qrs-positive', 0.88, 1.16)),
    surfaceChannel('lead-avr', 'aVR', regularEvents('t7-avr', 'qrs-negative', 0.68, 1.12)),
    surfaceChannel('lead-avl', 'aVL', regularEvents('t7-avl', 'qrs-positive', 0.76, 1.12)),
    surfaceChannel('lead-avf', 'aVF', regularEvents('t7-avf', 'qrs-positive', 0.92, 1.16)),
    surfaceChannel('lead-v1', 'V1', regularEvents('t7-v1', 'qrs-rbbb', 1.00, 1.08)),
    surfaceChannel('lead-v2', 'V2', regularEvents('t7-v2', 'qrs-rbbb', 0.88, 1.08)),
    surfaceChannel('lead-v3', 'V3', regularEvents('t7-v3', 'qrs-wide', 0.78, 1.10)),
    surfaceChannel('lead-v4', 'V4', regularEvents('t7-v4', 'qrs-wide', 0.76, 1.10)),
    surfaceChannel('lead-v5', 'V5', regularEvents('t7-v5', 'qrs-positive', 0.70, 1.14)),
    surfaceChannel('lead-v6', 'V6', regularEvents('t7-v6', 'qrs-positive', 0.66, 1.14)),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 't7-morphology', label: 'RBBB-type morphology in V1', timeMs: 1620, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 't7-inferior', label: 'Inferior leads are predominantly positive', timeMs: 2220, channelId: 'lead-avf', visibility: 'instructor' }),
    Object.freeze({ id: 't7-avr-avl', label: 'aVR and aVL are discordant', timeMs: 2820, channelId: 'lead-avl', visibility: 'instructor' }),
    Object.freeze({ id: 't7-precordial', label: 'Precordial leads remain predominantly concordant', timeMs: 3420, channelId: 'lead-v5', visibility: 'instructor' }),
  ]),
});

const taskEightTrace: ClinicalTraceDefinition = Object.freeze({
  id: 'class6-live-page21',
  title: 'Class 6 ECG localisation case 3',
  description: 'Live synthetic 12-lead sinus rhythm with recurring PVCs recreating the polarity and V3/V4 transition used by the supplied page 21 teaching case.',
  durationMs: 3600,
  teachingLabel: 'Live synthetic 12-lead ECG with recurring PVCs based on the supplied Class 6 pattern.',
  channels: Object.freeze([
    surfaceChannel('lead-i', 'I', pvcEvents('t8-i', 'qrs-wide', 0.52)),
    surfaceChannel('lead-ii', 'II', pvcEvents('t8-ii', 'qrs-wide', 0.96)),
    surfaceChannel('lead-iii', 'III', pvcEvents('t8-iii', 'qrs-wide', 0.90)),
    surfaceChannel('lead-avr', 'aVR', pvcEvents('t8-avr', 'qrs-wide', -0.62, 'qrs-negative', 0.36)),
    surfaceChannel('lead-avl', 'aVL', pvcEvents('t8-avl', 'qrs-wide', -0.58, 'qrs-positive', 0.34)),
    surfaceChannel('lead-avf', 'aVF', pvcEvents('t8-avf', 'qrs-wide', 0.94)),
    surfaceChannel('lead-v1', 'V1', pvcEvents('t8-v1', 'qrs-lbbb', -1.04, 'qrs-negative', 0.38)),
    surfaceChannel('lead-v2', 'V2', pvcEvents('t8-v2', 'qrs-lbbb', -0.88, 'qrs-negative', 0.34)),
    surfaceChannel('lead-v3', 'V3', pvcEvents('t8-v3', 'qrs-wide', -0.28, 'qrs-positive', 0.34)),
    surfaceChannel('lead-v4', 'V4', pvcEvents('t8-v4', 'qrs-wide', 0.38, 'qrs-positive', 0.38)),
    surfaceChannel('lead-v5', 'V5', pvcEvents('t8-v5', 'qrs-positive', 0.76, 'qrs-positive', 0.42)),
    surfaceChannel('lead-v6', 'V6', pvcEvents('t8-v6', 'qrs-positive', 0.88, 'qrs-positive', 0.44)),
  ]),
  annotations: Object.freeze([
    Object.freeze({ id: 't8-pvc-1', label: 'PVC', timeMs: 1080, channelId: 'lead-ii', visibility: 'student' }),
    Object.freeze({ id: 't8-pvc-2', label: 'PVC', timeMs: 2320, channelId: 'lead-ii', visibility: 'student' }),
    Object.freeze({ id: 't8-morphology', label: 'LBBB-type PVC morphology', timeMs: 2320, channelId: 'lead-v1', visibility: 'instructor' }),
    Object.freeze({ id: 't8-inferior', label: 'PVCs are positive in the inferior leads', timeMs: 2320, channelId: 'lead-avf', visibility: 'instructor' }),
    Object.freeze({ id: 't8-transition', label: 'PVC transition occurs between V3 and V4', timeMs: 2320, channelId: 'lead-v4', visibility: 'instructor' }),
    Object.freeze({ id: 't8-avr-avl', label: 'PVC polarity is concordant in aVR and aVL', timeMs: 2320, channelId: 'lead-avl', visibility: 'instructor' }),
  ]),
});

export const vtLocalizationTraceCatalog: Readonly<Record<VtLocalizationTaskId, ClinicalTraceDefinition>> = Object.freeze({
  '6': taskSixTrace,
  '7': taskSevenTrace,
  '8': taskEightTrace,
});
