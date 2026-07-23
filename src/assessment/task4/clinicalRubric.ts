import { validateTaskFourRubric } from './marking';
import type { TaskFourCriterion, TaskFourRubric } from './marking';

export const TASK_FOUR_CLINICAL_CONTENT_VERSION = 1 as const;
export const TASK_FOUR_CLINICAL_APPROVAL_NOTE =
  'Evidence-reviewed and repository-approved for deterministic synthetic educational assessment only; external clinician sign-off is not claimed.' as const;

export interface TaskFourClinicalSource {
  readonly id: string;
  readonly citation: string;
  readonly supports: readonly string[];
}

export const taskFourClinicalSources: readonly TaskFourClinicalSource[] = Object.freeze([
  Object.freeze({
    id: 'assessment-specification',
    citation: 'Epicardio Assessment Tasks Overview, Task 4 allocation.',
    supports: Object.freeze(['25-mark allocation', 'concentric AVRT', 'eccentric AVRT', 'VAAV response', 'VAV response', '115 ms assessment', 'His-refractory PVC']),
  }),
  Object.freeze({
    id: 'esc-svt-guideline',
    citation: 'Brugada et al. 2019 ESC Guidelines for supraventricular tachycardia. Eur Heart J. 2020;41:655-720.',
    supports: Object.freeze(['AVRT circuit uses AV node/His-Purkinje system and an accessory pathway', 'activation-sequence interpretation requires electrophysiological confirmation']),
  }),
  Object.freeze({
    id: 'ventricular-entrainment-response',
    citation: 'Kumar et al. Choice and Utility of Pacing Maneuver in Establishing the Mechanism of Supraventricular Tachycardia. J Arrhythm. 2017;33:191-196.',
    supports: Object.freeze(['VAV response in AVNRT/orthodromic AVRT', 'VAAV response strongly supporting atrial tachycardia', 'His-refractory PVC atrial advancement in orthodromic AVRT']),
  }),
  Object.freeze({
    id: 'ppi-tcl-threshold',
    citation: 'Michaud et al. Differentiation of atypical AVNRT from orthodromic reciprocating tachycardia using a septal accessory pathway. J Am Coll Cardiol. 2001;38:1163-1167.',
    supports: Object.freeze(['RV-apical PPI minus TCL greater than 115 ms favours AVNRT', 'PPI minus TCL below 115 ms favours orthodromic AVRT in the studied setting']),
  }),
  Object.freeze({
    id: 'his-refractory-pvc',
    citation: 'Sarkar et al. SVT quest: The adventure diagnosing narrow QRS tachycardia. J Arrhythm. 2024;40:971-989.',
    supports: Object.freeze(['His-refractory PVC timing', 'atrial or tachycardia reset supporting accessory-pathway participation', 'limitations of a negative response']),
  }),
  Object.freeze({
    id: 'left-free-wall-sequence',
    citation: 'Orthodromic AVRT case literature with eccentric distal-coronary-sinus earliest atrial activation, including J Arrhythm. 2020;36:397-400.',
    supports: Object.freeze(['eccentric distal-to-proximal coronary-sinus activation', 'distal CS earliest activation supporting a left free-wall accessory pathway']),
  }),
]);

const criterion = (
  id: string,
  label: string,
  acceptedStatements: readonly string[],
): TaskFourCriterion => Object.freeze({
  id,
  label,
  acceptedStatements: Object.freeze([...acceptedStatements]),
});

export const taskFourClinicalRubric: TaskFourRubric = validateTaskFourRubric(Object.freeze({
  rubricVersion: 1,
  approvalStatus: 'domain-approved',
  sections: Object.freeze({
    'avrt-concentric': Object.freeze([
      criterion('concentric-mechanism', 'Identify orthodromic AVRT/orthodromic reciprocating tachycardia.', [
        'orthodromic avrt', 'orthodromic atrioventricular reentrant tachycardia', 'orthodromic reciprocating tachycardia', 'ort',
      ]),
      criterion('concentric-sequence', 'Identify concentric retrograde atrial activation.', [
        'concentric retrograde atrial activation', 'concentric atrial activation', 'concentric va activation',
      ]),
      criterion('concentric-earliest', 'Identify the earliest atrial signal at the septum/His/proximal CS or CS ostium.', [
        'earliest atrial activation at the his', 'earliest atrial activation in the his region', 'earliest atrial activation at proximal cs', 'earliest atrial activation at the cs ostium', 'earliest atrial activation is septal',
      ]),
      criterion('concentric-va', 'Recognise a fixed 1:1 ventriculoatrial relationship.', [
        'fixed va interval', 'fixed ventriculoatrial interval', 'one to one va conduction', '1 to 1 va conduction', 'one to one ventriculoatrial relationship',
      ]),
      criterion('concentric-pathway', 'State that a septal accessory pathway is likely, while confirmation requires a pacing manoeuvre.', [
        'septal accessory pathway', 'posteroseptal accessory pathway', 'paraseptal accessory pathway', 'septal ap',
      ]),
    ]),
    'avrt-eccentric': Object.freeze([
      criterion('eccentric-mechanism', 'Identify orthodromic AVRT/orthodromic reciprocating tachycardia.', [
        'orthodromic avrt', 'orthodromic atrioventricular reentrant tachycardia', 'orthodromic reciprocating tachycardia', 'ort',
      ]),
      criterion('eccentric-sequence', 'Identify eccentric or distal-to-proximal coronary-sinus activation.', [
        'eccentric retrograde atrial activation', 'eccentric atrial activation', 'distal to proximal coronary sinus activation', 'distal to proximal cs activation',
      ]),
      criterion('eccentric-earliest', 'Identify the earliest atrial signal at distal CS/CS 1-2.', [
        'earliest atrial activation at distal cs', 'earliest atrial activation in distal cs', 'earliest atrial activation at cs 1 2', 'earliest atrial activation is at cs 1 2', 'earliest a at cs 1 2',
      ]),
      criterion('eccentric-va', 'Recognise a fixed 1:1 ventriculoatrial relationship.', [
        'fixed va interval', 'fixed ventriculoatrial interval', 'one to one va conduction', '1 to 1 va conduction', 'one to one ventriculoatrial relationship',
      ]),
      criterion('eccentric-pathway', 'State that a left free-wall/lateral accessory pathway is likely.', [
        'left free wall accessory pathway', 'left lateral accessory pathway', 'left sided accessory pathway', 'left free wall ap',
      ]),
    ]),
    'vaav-pattern': Object.freeze([
      criterion('vaav-manoeuvre', 'Name ventricular overdrive pacing/ventricular entrainment during SVT.', [
        'ventricular overdrive pacing', 'ventricular entrainment', 'overdrive pacing from the ventricle', 'rv overdrive pacing',
      ]),
      criterion('vaav-rate', 'State that ventricular pacing is delivered slightly faster than the tachycardia.', [
        'pacing cycle length shorter than the tachycardia cycle length', 'paced slightly faster than the tachycardia', 'pace 10 to 40 ms faster', 'pace 10 to 40 ms shorter than tcl',
      ]),
      criterion('vaav-sequence', 'Identify the V-A-A-V post-pacing response.', [
        'v a a v response', 'vaav response', 'ventricle atrium atrium ventricle response',
      ]),
      criterion('vaav-diagnosis', 'State that the response strongly supports atrial tachycardia.', [
        'supports atrial tachycardia', 'suggests atrial tachycardia', 'favours atrial tachycardia', 'favors atrial tachycardia',
      ]),
      criterion('vaav-rationale', 'Explain that an additional atrial activation precedes return of ventricular conduction.', [
        'two atrial activations before the return ventricle', 'two atrial activations occur before the return ventricle', 'extra atrial activation before the return ventricular beat', 'atrium continues independently', 'atrial rhythm continues during ventricular pacing',
      ]),
    ]),
    'vav-pattern': Object.freeze([
      criterion('vav-manoeuvre', 'Name ventricular overdrive pacing/ventricular entrainment during SVT.', [
        'ventricular overdrive pacing', 'ventricular entrainment', 'rv overdrive pacing',
      ]),
      criterion('vav-sequence', 'Identify the V-A-V post-pacing response.', [
        'v a v response', 'vav response', 'ventricle atrium ventricle response',
      ]),
      criterion('vav-not-at', 'State that the response argues against atrial tachycardia.', [
        'argues against atrial tachycardia', 'makes atrial tachycardia unlikely', 'excludes atrial tachycardia', 'not atrial tachycardia',
      ]),
      criterion('vav-differential', 'Keep AVNRT and orthodromic AVRT in the differential.', [
        'avnrt or avrt', 'avnrt versus avrt', 'distinguish avnrt from avrt', 'av nodal reentry or orthodromic avrt',
      ]),
      criterion('vav-ppi', 'Measure the post-pacing interval from the last stimulus to the return ventricular electrogram.', [
        'measure the post pacing interval', 'measure ppi from the last stimulus to the return ventricular beat', 'last pacing stimulus to return ventricular electrogram',
      ]),
      criterion('vav-ppi-tcl', 'Calculate PPI minus tachycardia cycle length.', [
        'calculate ppi minus tcl', 'ppi tcl difference', 'post pacing interval minus tachycardia cycle length',
      ]),
      criterion('vav-over-115', 'Interpret PPI-TCL greater than 115 ms from the RV apex as favouring AVNRT.', [
        'ppi tcl greater than 115 ms favours avnrt', 'ppi minus tcl over 115 ms favors avnrt', 'greater than 115 ms suggests avnrt', 'more than 115 ms supports avnrt',
      ]),
      criterion('vav-under-115', 'Interpret PPI-TCL at or below 115 ms as favouring AVRT in the conventional setting.', [
        'ppi tcl less than 115 ms favours avrt', 'less than 115 ms favours avrt', 'ppi minus tcl below 115 ms favors avrt', '115 ms or less supports avrt', 'less than or equal to 115 ms suggests avrt',
      ]),
      criterion('vav-his-pvc', 'Deliver a PVC timed when the His bundle is refractory.', [
        'his refractory pvc', 'pvc during his refractoriness', 'his synchronous pvc', 'ventricular extrastimulus during his refractoriness',
      ]),
      criterion('vav-aa-advance', 'Interpret A-A advancement/reset or termination as supporting accessory-pathway participation.', [
        'advance the a a interval supports avrt', 'atrial advancement supports an accessory pathway', 'advances the next atrial activation', 'reset of the atrium supports avrt', 'termination without atrial capture supports avrt',
      ]),
    ]),
  }),
}));
