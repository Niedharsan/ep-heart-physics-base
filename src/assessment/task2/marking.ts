import { taskTwoEcgCases, taskTwoPatternCases, wenckebachCase } from './catalog';

export interface SectionScore { readonly score: number; readonly maximumScore: number; readonly feedback: readonly string[]; }
export interface PatternResponse { readonly diagnosis: string; readonly explanation: string; }
export interface TaskTwoResponses {
  readonly snrtLocation: string;
  readonly snrtPurpose: string;
  readonly patterns: Readonly<Record<'ARP' | 'ERP' | 'AVNRT', PatternResponse>>;
  readonly wenckebach: PatternResponse;
  readonly ecgAnswers: readonly string[];
}
export interface TaskTwoScore {
  readonly snrt: SectionScore; readonly patternRecognition: SectionScore; readonly wenckebach: SectionScore; readonly ecg: SectionScore;
  readonly score: number; readonly maximumScore: 22;
}
const norm=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const has=(text:string, variants:readonly string[])=>variants.some(v=>norm(text).includes(norm(v)));

export function markSnrt(location:string,purpose:string):SectionScore {
  const feedback:string[]=[];
  const locationOk=has(location,['high right atrium','hra','atrial electrogram','sinus node electrogram']);
  const purposeA=has(purpose,['sinus node dysfunction','sick sinus','sinus node disease']);
  const purposeB=has(purpose,['recovery time','return of sinus activity','overdrive pacing']);
  if(!locationOk) feedback.push('Identify SNRT on the high-right-atrial/atrial electrogram from the last paced atrial complex to the first returning sinus atrial complex.');
  if(!purposeA) feedback.push('State that SNRT assesses sinus-node dysfunction.');
  if(!purposeB) feedback.push('Relate it to recovery after atrial overdrive pacing.');
  return Object.freeze({score:Number(locationOk)+Number(purposeA)+Number(purposeB),maximumScore:3,feedback:Object.freeze(feedback)});
}

function markThreeMarkPattern(answer:PatternResponse,correct:string,concepts:readonly string[]):SectionScore {
  const feedback:string[]=[];
  let score=0;
  if(norm(answer.diagnosis)===norm(correct)){score+=1;}else feedback.push(`Diagnosis should be ${correct}.`);
  for(const concept of concepts){if(has(answer.explanation,[concept])) score+=1; else feedback.push(`Missing concept: ${concept}.`);}
  return Object.freeze({score,maximumScore:3,feedback:Object.freeze(feedback)});
}

export function markPatternRecognition(responses:TaskTwoResponses['patterns']):SectionScore {
  const results=taskTwoPatternCases.map(c=>markThreeMarkPattern(responses[c.id],c.correctDiagnosis,c.explanationConcepts));
  return Object.freeze({score:results.reduce((s,r)=>s+r.score,0),maximumScore:9,feedback:Object.freeze(results.flatMap((r,i)=>r.feedback.map(f=>`${taskTwoPatternCases[i]!.label}: ${f}`)))});
}

export function markWenckebach(answer:PatternResponse):SectionScore {
  const feedback:string[]=[]; let score=0;
  if(has(answer.diagnosis,['wenckebach','mobitz i','mobitz 1'])) score+=1; else feedback.push('Identify the tracing as Wenckebach/Mobitz I.');
  for(const concept of wenckebachCase.explanationConcepts){if(has(answer.explanation,[concept])) score+=1; else feedback.push(`Missing concept: ${concept}.`);}
  return Object.freeze({score,maximumScore:5,feedback:Object.freeze(feedback)});
}

export function markEcgAnswers(answers:readonly string[]):SectionScore {
  const feedback:string[]=[]; let score=0;
  taskTwoEcgCases.forEach((c,i)=>{if(norm(answers[i]??'')===norm(c.answer)) score+=1; else feedback.push(`${c.label}: expected ${c.answer}.`);});
  return Object.freeze({score,maximumScore:5,feedback:Object.freeze(feedback)});
}

export function markTaskTwo(responses:TaskTwoResponses):TaskTwoScore {
  const snrt=markSnrt(responses.snrtLocation,responses.snrtPurpose);
  const patternRecognition=markPatternRecognition(responses.patterns);
  const wenckebach=markWenckebach(responses.wenckebach);
  const ecg=markEcgAnswers(responses.ecgAnswers);
  return Object.freeze({snrt,patternRecognition,wenckebach,ecg,score:snrt.score+patternRecognition.score+wenckebach.score+ecg.score,maximumScore:22});
}
