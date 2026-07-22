import {
  catheterDefinitions,
  taskOneMeasurementIds,
} from './catalog';
import type {
  CatheterId,
  CatheterTargetId,
} from './catalog';
import type { IntervalId } from '../types';

export type CatheterPlacements = Readonly<Partial<Record<CatheterId, CatheterTargetId>>>;
export type CsOneTwoPosition = '' | 'distal' | 'proximal';
export type MeasurementCompletion = Readonly<Partial<Record<IntervalId, boolean>>>;
export type ActivationClassification = '' | 'normal' | 'abnormal';

export interface SectionScore {
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface TaskOneScore {
  readonly catheterPlacement: SectionScore;
  readonly csLabelling: SectionScore;
  readonly normalMeasurements: SectionScore;
  readonly activationPattern: SectionScore;
  readonly score: number;
  readonly maximumScore: 15;
}

export function markCatheterPlacements(placements: CatheterPlacements): SectionScore {
  const correct = catheterDefinitions.filter((catheter) => (
    placements[catheter.id] === catheter.correctTargetId
  ));
  const score = correct.length;
  const feedback = catheterDefinitions.map((catheter) => (
    placements[catheter.id] === catheter.correctTargetId
      ? `${catheter.shortLabel}: correct position.`
      : `${catheter.shortLabel}: position requires review.`
  ));
  return Object.freeze({ score, maximumScore: 4, feedback: Object.freeze(feedback) });
}

export function markCsLabelling(answer: CsOneTwoPosition): SectionScore {
  const correct = answer === 'distal';
  return Object.freeze({
    score: correct ? 1 : 0,
    maximumScore: 1,
    feedback: Object.freeze([
      correct
        ? 'CS 1–2 correctly identified as the distal pair.'
        : 'Review the distal-to-proximal CS electrode numbering convention.',
    ]),
  });
}

export function markNormalMeasurements(completion: MeasurementCompletion): SectionScore {
  const score = taskOneMeasurementIds.filter((id) => completion[id] === true).length;
  return Object.freeze({
    score,
    maximumScore: 5,
    feedback: Object.freeze(taskOneMeasurementIds.map((id) => (
      completion[id] === true ? `${id}: accepted.` : `${id}: incomplete or outside the accepted landmark/value tolerance.`
    ))),
  });
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function includesAny(text: string, alternatives: readonly string[]): boolean {
  return alternatives.some((alternative) => text.includes(alternative));
}

function hasToken(text: string, token: string): boolean {
  return (` ${text} `).includes(` ${token} `);
}

function orderedForward(
  text: string,
  firstTerms: readonly string[],
  secondTerms: readonly string[],
  relationshipTerms: readonly string[],
): boolean {
  return firstTerms.some((first) => secondTerms.some((second) => {
    const firstIndex = text.indexOf(first);
    const secondIndex = text.indexOf(second, firstIndex + first.length);
    if (firstIndex < 0 || secondIndex < 0) return false;
    const between = ` ${text.slice(firstIndex + first.length, secondIndex).trim()} `;
    return relationshipTerms.some((relationship) => between.includes(relationship));
  }));
}

export function activationConceptMatches(explanation: string): readonly boolean[] {
  const normalizedText = normalized(explanation);
  const text = ` ${normalizedText} `;
  const rightAtrialOrigin = includesAny(text, [' high right atrium ', ' hra ', ' sinus node ']);
  const atrialTerms = [' atrial ', ' atrium ', ' a wave '];
  const hisTerms = [' his ', ' av node ', ' atrioventricular node ', ' h wave '];
  const atriumToHis = orderedForward(
    text,
    atrialTerms,
    hisTerms,
    [' before ', ' then ', ' precedes ', ' followed by ', ' reaches ', ' conducts to ', ' activates '],
  ) || orderedForward(text, hisTerms, atrialTerms, [' after ', ' follows ']);
  const csMentioned = text.includes(' coronary sinus ') || hasToken(normalizedText, 'cs');
  const csProximalToDistal = csMentioned && (
    text.includes(' proximal to distal ')
    || text.includes(' proximal before distal ')
    || text.includes(' distal after proximal ')
  );
  const ventricularTerms = [' ventricular ', ' ventricle ', ' v wave ', ' qrs '];
  const hisBeforeVentricle = orderedForward(
    text,
    [' his ', ' h wave '],
    ventricularTerms,
    [' before ', ' then ', ' precedes ', ' followed by ', ' conducts to ', ' activates '],
  ) || orderedForward(text, ventricularTerms, [' his ', ' h wave '], [' after ', ' follows ']);
  return Object.freeze([rightAtrialOrigin, atriumToHis, csProximalToDistal, hisBeforeVentricle]);
}

export function markActivationPattern(
  classification: ActivationClassification,
  explanation: string,
): SectionScore {
  const conceptMatches = activationConceptMatches(explanation);
  const score = (classification === 'normal' ? 1 : 0)
    + conceptMatches.filter(Boolean).length;
  const labels = [
    'origin near the sinus node/high right atrium',
    'atrial activation preceding AV-node/His activation',
    'proximal-to-distal coronary-sinus activation',
    'His activation preceding ventricular activation',
  ];
  const feedback = [
    classification === 'normal'
      ? 'Pattern classification: correct.'
      : 'Pattern classification: review whether this baseline trace is normal.',
    ...labels.map((label, index) => (
      conceptMatches[index] ? `Explanation includes ${label}.` : `Explanation should address ${label}.`
    )),
  ];
  return Object.freeze({ score, maximumScore: 5, feedback: Object.freeze(feedback) });
}

export function totalTaskOneScore(
  catheterPlacement: SectionScore,
  csLabelling: SectionScore,
  normalMeasurements: SectionScore,
  activationPattern: SectionScore,
): TaskOneScore {
  const score = catheterPlacement.score
    + csLabelling.score
    + normalMeasurements.score
    + activationPattern.score;
  return Object.freeze({
    catheterPlacement,
    csLabelling,
    normalMeasurements,
    activationPattern,
    score,
    maximumScore: 15,
  });
}
