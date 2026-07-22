import { taskTwoEcgCases, taskTwoPatternCases } from './catalog';

export interface SectionScore {
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface PatternResponse {
  readonly diagnosis: string;
  readonly explanation: string;
}

export interface TaskTwoResponses {
  readonly snrtLocation: string;
  readonly snrtPurpose: string;
  readonly patterns: Readonly<Record<'ARP' | 'ERP' | 'AVNRT', PatternResponse>>;
  readonly wenckebach: PatternResponse;
  readonly ecgAnswers: readonly string[];
}

export interface TaskTwoScore {
  readonly snrt: SectionScore;
  readonly patternRecognition: SectionScore;
  readonly wenckebach: SectionScore;
  readonly ecg: SectionScore;
  readonly score: number;
  readonly maximumScore: 22;
}

interface ExplanationCriterion {
  readonly feedback: string;
  readonly matches: (text: string) => boolean;
}

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasAny = (text: string, variants: readonly string[]): boolean => variants.some((variant) => normalize(text).includes(normalize(variant)));
const hasPhrase = (text: string, variants: readonly string[]): boolean => {
  const normalized = ` ${normalize(text)} `;
  return variants.some((variant) => normalized.includes(` ${normalize(variant)} `));
};
const hasAllGroups = (text: string, groups: readonly (readonly string[])[]): boolean => groups.every((group) => hasAny(text, group));

const RELATION_MARKERS = Object.freeze([
  ' is ', ' are ', ' was ', ' were ', ' has ', ' have ', ' shows ', ' demonstrates ', ' with ', ' after ', ' before ',
  ' until ', ' followed ', ' follows ', ' remains ', ' fails ', ' failed ', ' does not ', ' did not ', ' not conducted ',
  ' captures ', ' captured ', ' occurs ', ' occur ', ' lengthens ', ' gets longer ', ' increases ', ' resets ', ' returns ',
  ' independent ', ' dissociated ', ' where ', ' while ', ' but ',
]);

function isRelationalExplanation(value: string): boolean {
  const normalized = ` ${normalize(value)} `;
  const words = normalized.trim().split(/\s+/).filter(Boolean);
  return words.length >= 5 && RELATION_MARKERS.some((marker) => normalized.includes(marker));
}

function relationalMatch(text: string, groups: readonly (readonly string[])[]): boolean {
  return isRelationalExplanation(text) && hasAllGroups(text, groups);
}

function freezeSection(score: number, maximumScore: number, feedback: readonly string[]): SectionScore {
  return Object.freeze({ score: Math.min(score, maximumScore), maximumScore, feedback: Object.freeze([...feedback]) });
}

export function markSnrt(location: string, purpose: string): SectionScore {
  const feedback: string[] = [];
  const locationOk = hasPhrase(location, ['high right atrium', 'high right atrial', 'hra', 'atrial electrogram', 'last paced a to first sinus a']);
  const purposeIsRelational = isRelationalExplanation(purpose);
  const purposeA = purposeIsRelational && hasAny(purpose, [
    'sinus node dysfunction', 'sick sinus', 'sinus node disease', 'sinus node function', 'sinus node recovery',
  ]);
  const purposeB = purposeIsRelational
    && hasAny(purpose, ['overdrive pacing', 'atrial pacing', 'paced atrial', 'last paced atrial'])
    && hasAny(purpose, ['recovery time', 'return of sinus', 'first sinus', 'sinus activity returns', 'sinus beat returns']);
  if (!locationOk) feedback.push('Identify SNRT on the high-right-atrial/atrial electrogram from the last paced atrial complex to the first returning sinus atrial complex.');
  if (!purposeA) feedback.push('Explain that SNRT evaluates sinus-node function or dysfunction.');
  if (!purposeB) feedback.push('Relate the measured recovery interval to the return of sinus activity after atrial overdrive pacing.');
  return freezeSection(Number(locationOk) + Number(purposeA) + Number(purposeB), 3, feedback);
}

const patternCriteria: Readonly<Record<'ARP' | 'ERP' | 'AVNRT', readonly ExplanationCriterion[]>> = Object.freeze({
  ARP: Object.freeze([
    Object.freeze({
      feedback: 'State that a premature atrial extrastimulus/S2 is delivered.',
      matches: (text: string) => relationalMatch(text, [
        ['premature', 'early', 's2', 'extra stimulus', 'extrastimulus'],
        ['atrial stimulus', 'atrial beat', 's2', 'extrastimulus'],
      ]),
    }),
    Object.freeze({
      feedback: 'State that the premature stimulus produces no propagated atrial capture or atrial electrogram.',
      matches: (text: string) => isRelationalExplanation(text) && (
        hasAny(text, ['no atrial response', 'no propagated atrial response', 'no atrial capture', 'no atrial electrogram', 'without atrial response', 'not followed by an atrial'])
        || relationalMatch(text, [
          ['atrial', 'atrium'],
          ['fails to depolarise', 'fails to depolarize', 'does not capture', 'failed to capture', 'is refractory'],
        ])
      ),
    }),
  ]),
  ERP: Object.freeze([
    Object.freeze({
      feedback: 'State that the premature stimulus still captures the atrium.',
      matches: (text: string) => isRelationalExplanation(text) && (
        hasAny(text, ['atrial capture remains', 'atrial response remains', 'atrial electrogram remains', 'atrial response is present'])
        || relationalMatch(text, [
          ['premature', 's2', 'extra stimulus', 'extrastimulus'],
          ['captures the atrium', 'captures atrium', 'atrial capture', 'atrial response'],
        ])
      ),
    }),
    Object.freeze({
      feedback: 'State that conduction to His or ventricle fails despite atrial capture.',
      matches: (text: string) => isRelationalExplanation(text) && (
        hasAny(text, ['no his response', 'no ventricular response', 'no h or v', 'not conducted to the his', 'not conducted to the ventricle'])
        || relationalMatch(text, [
          ['his', 'ventricular', 'ventricle', 'h v'],
          ['conduction fails', 'fails to conduct', 'is blocked', 'does not conduct', 'not conducted'],
        ])
      ),
    }),
  ]),
  AVNRT: Object.freeze([
    Object.freeze({
      feedback: 'Describe a regular rapid narrow-QRS/narrow-complex tachycardia.',
      matches: (text: string) => relationalMatch(text, [
        ['regular'],
        ['narrow complex', 'narrow qrs'],
        ['tachycardia', 'rapid rhythm', 'fast rhythm', 'rapid', 'fast'],
      ]),
    }),
    Object.freeze({
      feedback: 'Relate the rhythm to near-simultaneous atrial and ventricular activation or a very short VA interval.',
      matches: (text: string) => isRelationalExplanation(text) && (
        relationalMatch(text, [
          ['atrial', 'a signal', 'a activation', 'atria'],
          ['ventricular', 'v signal', 'v activation', 'ventricle'],
          ['simultaneous', 'together', 'coincident', 'almost the same time', 'near the same time'],
        ])
        || relationalMatch(text, [
          ['a and v activation', 'a v activation'],
          ['simultaneous', 'together', 'coincident', 'almost the same time', 'near the same time'],
        ])
        || relationalMatch(text, [
          ['va interval', 'ventriculoatrial interval'],
          ['short', 'near zero', 'minimal'],
        ])
      ),
    }),
  ]),
});

function markThreeMarkPattern(answer: PatternResponse, id: 'ARP' | 'ERP' | 'AVNRT', correct: string): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  if (normalize(answer.diagnosis) === normalize(correct)) score += 1;
  else feedback.push(`Diagnosis should be ${correct}.`);

  for (const criterion of patternCriteria[id]) {
    if (criterion.matches(answer.explanation)) score += 1;
    else feedback.push(criterion.feedback);
  }
  return freezeSection(score, 3, feedback);
}

export function markPatternRecognition(responses: TaskTwoResponses['patterns']): SectionScore {
  const results = taskTwoPatternCases.map((taskCase) => markThreeMarkPattern(
    responses[taskCase.id],
    taskCase.id,
    taskCase.correctDiagnosis,
  ));
  return freezeSection(
    results.reduce((sum, result) => sum + result.score, 0),
    9,
    results.flatMap((result, index) => result.feedback.map((item) => `${taskTwoPatternCases[index]!.label}: ${item}`)),
  );
}

const wenckebachCriteria: readonly ExplanationCriterion[] = Object.freeze([
  Object.freeze({
    feedback: 'Describe progressive PR or AH interval prolongation.',
    matches: (text: string) => relationalMatch(text, [
      ['pr', 'ah'],
      ['progressive', 'each beat', 'beat to beat'],
      ['prolong', 'lengthen', 'gets longer', 'longer', 'increases'],
    ]),
  }),
  Object.freeze({
    feedback: 'State that an atrial/P wave is eventually not conducted to a ventricular/QRS response.',
    matches: (text: string) => isRelationalExplanation(text) && (
      hasAny(text, ['non conducted atrial beat', 'nonconducted atrial beat', 'p wave is not followed by a qrs', 'p wave without a qrs'])
      || relationalMatch(text, [
        ['atrial beat', 'p wave', 'atrial impulse'],
        ['dropped', 'not conducted', 'not followed', 'blocked'],
        ['qrs', 'ventricular response', 'ventricle'],
      ])
    ),
  }),
  Object.freeze({
    feedback: 'Describe grouped beating or conducted beats occurring in groups.',
    matches: (text: string) => isRelationalExplanation(text) && (
      hasAny(text, ['grouped beating', 'beats occur in groups', 'conducted beats occur in groups', 'grouped complexes'])
    ),
  }),
  Object.freeze({
    feedback: 'State that the PR/AH sequence resets or becomes shorter after the dropped beat.',
    matches: (text: string) => relationalMatch(text, [
      ['after the dropped', 'after the blocked', 'following the dropped', 'after the pause'],
      ['reset', 'returns shorter', 'becomes shorter', 'becomes short', 'shortens', 'starts again'],
    ]),
  }),
]);

export function markWenckebach(answer: PatternResponse): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  if (['wenckebach', 'mobitz i', 'mobitz 1'].includes(normalize(answer.diagnosis))) score += 1;
  else feedback.push('Identify the tracing as Wenckebach/Mobitz I.');

  for (const criterion of wenckebachCriteria) {
    if (criterion.matches(answer.explanation)) score += 1;
    else feedback.push(criterion.feedback);
  }
  return freezeSection(score, 5, feedback);
}

export function markEcgAnswers(answers: readonly string[]): SectionScore {
  const feedback: string[] = [];
  let score = 0;
  taskTwoEcgCases.forEach((taskCase, index) => {
    if (normalize(answers[index] ?? '') === normalize(taskCase.answer)) score += 1;
    else feedback.push(`${taskCase.label}: expected ${taskCase.answer}.`);
  });
  return freezeSection(score, 5, feedback);
}

export function markTaskTwo(responses: TaskTwoResponses): TaskTwoScore {
  const snrt = markSnrt(responses.snrtLocation, responses.snrtPurpose);
  const patternRecognition = markPatternRecognition(responses.patterns);
  const wenckebach = markWenckebach(responses.wenckebach);
  const ecg = markEcgAnswers(responses.ecgAnswers);
  const total = snrt.score + patternRecognition.score + wenckebach.score + ecg.score;
  return Object.freeze({
    snrt,
    patternRecognition,
    wenckebach,
    ecg,
    score: Math.min(total, 22),
    maximumScore: 22,
  });
}
