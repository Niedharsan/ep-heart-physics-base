import { validateTaskThreeRubric } from './marking';
import type { TaskThreeClinicalRubric, TextCriterion } from './marking';

export const TASK_THREE_CLINICAL_CONTENT_VERSION = 1 as const;
export const TASK_THREE_CLINICAL_APPROVAL_NOTE =
  'Evidence-reviewed and repository-approved for deterministic synthetic educational assessment content only; external clinician sign-off is not claimed.' as const;

export interface TaskThreeClinicalSource {
  readonly id: string;
  readonly citation: string;
  readonly supports: readonly string[];
}

export const taskThreeClinicalSources: readonly TaskThreeClinicalSource[] = Object.freeze([
  Object.freeze({
    id: 'assessment-specification',
    citation: 'Epicardio Assessment Tasks Overview, Task 3 allocation.',
    supports: Object.freeze(['23-mark allocation', 'three atrial tachycardia ECGs', 'two AH-change EGMs', 'cannon wave', 'adenosine', 'AVNRT pathway']),
  }),
  Object.freeze({
    id: 'kistler-2006-p-wave-localisation',
    citation: 'Kistler et al. J Am Coll Cardiol. 2006;48:1010-1017. doi:10.1016/j.jacc.2006.03.058.',
    supports: Object.freeze(['V1 negative or positive-negative pattern supports right atrial origin', 'V1 positive or negative-positive pattern supports left atrial origin']),
  }),
  Object.freeze({
    id: 'ah-jump-threshold',
    citation: 'Fishberger et al. J Cardiovasc Electrophysiol. 2006;17:1001-1006. PMID:16836714.',
    supports: Object.freeze(['conventional AH jump threshold of at least 50 ms after a 10 ms A1A2 decrement']),
  }),
  Object.freeze({
    id: 'cannon-a-wave',
    citation: 'Merck Manual Professional Edition, Cardiovascular Examination, jugular venous pulse findings.',
    supports: Object.freeze(['giant cannon a wave', 'atrial contraction against a closed tricuspid valve', 'atrioventricular dissociation']),
  }),
  Object.freeze({
    id: 'adenosine-regular-narrow-complex',
    citation: 'American Heart Association, Adult Advanced Life Support, regular narrow-complex tachycardia recommendations.',
    supports: Object.freeze(['transient AV nodal block', 'therapeutic and diagnostic use', 'very short half-life', 'ECG recording and monitoring']),
  }),
  Object.freeze({
    id: 'avnrt-typical-slow-fast',
    citation: '2019 ESC supraventricular tachycardia guideline and AVNRT ECG literature.',
    supports: Object.freeze(['typical slow-fast AVNRT', 'antegrade slow pathway', 'short RP', 'retrograde P wave close to or within QRS', 'pseudo-r-prime in V1']),
  }),
]);

const criterion = (
  id: string,
  label: string,
  acceptedStatements: readonly string[],
): TextCriterion => Object.freeze({
  id,
  label,
  acceptedStatements: Object.freeze([...acceptedStatements]),
});

const acceptedAtrialTachycardiaDiagnoses = Object.freeze([
  'Atrial tachycardia',
  'Focal atrial tachycardia',
  'AT',
  'Focal AT',
]);

export const taskThreeClinicalRubric: TaskThreeClinicalRubric = validateTaskThreeRubric(Object.freeze({
  rubricVersion: 1,
  approvalStatus: 'domain-approved',
  atrialTachycardia: Object.freeze({
    'at-1': Object.freeze({
      acceptedDiagnoses: acceptedAtrialTachycardiaDiagnoses,
      expectedSide: 'left',
    }),
    'at-2': Object.freeze({
      acceptedDiagnoses: acceptedAtrialTachycardiaDiagnoses,
      expectedSide: 'right',
    }),
    'at-3': Object.freeze({
      acceptedDiagnoses: acceptedAtrialTachycardiaDiagnoses,
      expectedSide: 'left',
    }),
  }),
  ahJump: Object.freeze({
    'ah-jump-below-50': Object.freeze({
      expectedAhJump: false,
      expectedThresholdClass: 'below-50-ms',
    }),
    'ah-jump-above-50': Object.freeze({
      expectedAhJump: true,
      expectedThresholdClass: 'above-50-ms',
    }),
  }),
  cannonWaveCriteria: Object.freeze([
    criterion('cannon-jvp', 'Identify a giant/cannon jugular a wave.', [
      'cannon a wave',
      'giant a wave',
      'large jugular a wave',
      'large jugular venous pulsation',
    ]),
    criterion('cannon-atrial-contraction', 'Relate it to right atrial contraction.', [
      'right atrial contraction',
      'right atrium contracts',
      'atrium contracts',
    ]),
    criterion('cannon-closed-valve', 'State that contraction occurs against a closed tricuspid/AV valve.', [
      'closed tricuspid valve',
      'tricuspid valve is closed',
      'closed atrioventricular valve',
      'closed av valve',
    ]),
    criterion('cannon-av-dissociation', 'Relate it to atrioventricular dissociation.', [
      'atrioventricular dissociation',
      'av dissociation',
    ]),
    criterion('cannon-coincidence', 'Explain the intermittent timing when atrial and ventricular systole coincide.', [
      'atrial and ventricular contraction coincide',
      'atrial contraction coincides with ventricular systole',
      'atrium contracts during ventricular systole',
    ]),
  ]),
  adenosineCriteria: Object.freeze([
    criterion('adenosine-av-node-block', 'Describe transient AV nodal block.', [
      'transient atrioventricular nodal block',
      'transient av nodal block',
      'temporarily blocks the av node',
      'temporarily blocks atrioventricular nodal conduction',
    ]),
    criterion('adenosine-therapeutic', 'State that it can terminate AV-node-dependent re-entry.', [
      'terminates av node dependent tachycardia',
      'terminate av node dependent tachycardia',
      'terminates avnrt',
      'terminate avnrt',
      'terminates orthodromic avrt',
    ]),
    criterion('adenosine-diagnostic', 'Describe diagnostic unmasking of atrial activity.', [
      'reveals atrial activity',
      'reveal atrial activity',
      'unmasks atrial flutter',
      'helps diagnose atrial flutter',
      'helps diagnose atrial tachycardia',
      'diagnostic av block',
    ]),
    criterion('adenosine-administration', 'Give it as a rapid IV bolus because its action is extremely brief.', [
      'rapid intravenous bolus',
      'rapid iv bolus',
      'very rapid intravenous bolus',
      'very short half life',
      'half life of a few seconds',
    ]),
    criterion('adenosine-monitoring', 'Record/monitor the ECG during administration.', [
      'continuous ecg monitoring',
      'continuous electrocardiographic monitoring',
      'record an ecg during administration',
      'record a multilead ecg',
      'recording a multilead ecg',
      'record a 12 lead ecg',
    ]),
  ]),
  avnrtEcg: Object.freeze({
    acceptedDiagnoses: Object.freeze([
      'AVNRT',
      'Atrioventricular nodal reentrant tachycardia',
      'Atrioventricular nodal re-entry tachycardia',
    ]),
    expectedPathway: 'slow',
    explanationCriterion: criterion(
      'avnrt-slow-fast-rationale',
      'Relate short-RP/pseudo-r-prime morphology to typical slow-fast AVNRT with antegrade slow-pathway conduction.',
      [
        'antegrade slow pathway',
        'slow pathway conducts antegrade',
        'typical slow fast avnrt',
        'retrograde p wave is close to the qrs',
        'retrograde atrial activation is close to the qrs',
        'pseudo r prime in v1',
        'short rp avnrt',
      ],
    ),
  }),
}));
