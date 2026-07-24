import { describe, expect, it } from 'vitest';
import { markEcgAnswers, markPatternRecognition, markSnrt, markTaskTwo, markWenckebach } from '../assessment/task2/marking';

const complete = {
  snrtLocation: 'The interval is measured on the high right atrial electrogram from the last paced A to the first returning sinus A.',
  snrtPurpose: 'It evaluates sinus node dysfunction because the recovery time shows when sinus activity returns after atrial overdrive pacing.',
  patterns: {
    ARP: { diagnosis: 'ARP', explanation: 'A premature atrial S2 is delivered, but no atrial electrogram follows because the atrium is refractory.' },
    ERP: { diagnosis: 'ERP', explanation: 'The premature stimulus still captures the atrium, while conduction to the His bundle or ventricle is blocked.' },
    AVNRT: { diagnosis: 'AVNRT', explanation: 'This is a regular narrow-QRS tachycardia with atrial and ventricular signals occurring almost together.' },
  },
  wenckebach: {
    diagnosis: 'Mobitz I',
    explanation: 'The PR interval gets progressively longer on each beat until a P wave is not followed by a QRS. Conducted beats occur in groups, and after the dropped beat the PR interval becomes short again.',
  },
  ecgAnswers: ['Sinus bradycardia', 'Sinus pause', 'Mobitz I', 'Mobitz II', 'Complete heart block'],
} as const;

describe('Task 2 assessment', () => {
  it('caps the complete rubric at exactly 22 marks', () => {
    expect(markTaskTwo(complete)).toMatchObject({ score: 22, maximumScore: 22 });
  });

  it('scores SNRT location and two purpose relationships', () => {
    expect(markSnrt(complete.snrtLocation, complete.snrtPurpose)).toMatchObject({ score: 3, maximumScore: 3 });
  });

  it('retains partial credit for a specific but incomplete SNRT answer', () => {
    expect(markSnrt('HRA', 'Recovery time is measured after atrial overdrive pacing when sinus activity returns.').score).toBe(2);
  });

  it('scores ARP, ERP and AVNRT independently', () => {
    expect(markPatternRecognition(complete.patterns)).toMatchObject({ score: 9, maximumScore: 9 });
  });

  it('accepts clinically equivalent explanation wording', () => {
    const alternatives = {
      ARP: { diagnosis: 'ARP', explanation: 'An early extrastimulus is given to the atrium and it does not capture, so there is no atrial response.' },
      ERP: { diagnosis: 'ERP', explanation: 'S2 captures atrium, but the impulse is not conducted to His or the ventricle.' },
      AVNRT: { diagnosis: 'AVNRT', explanation: 'The tracing shows a fast regular narrow-complex rhythm where A and V activation are nearly simultaneous.' },
    } as const;
    expect(markPatternRecognition(alternatives).score).toBe(9);
  });

  it('does not award explanation marks for unordered keyword lists', () => {
    const keywordDump = {
      ARP: { diagnosis: 'ARP', explanation: 'premature stimulus atrium response capture refractory' },
      ERP: { diagnosis: 'ERP', explanation: 'atrial capture his ventricle conduction block' },
      AVNRT: { diagnosis: 'AVNRT', explanation: 'regular narrow qrs tachycardia atrial ventricular simultaneous' },
    } as const;
    expect(markPatternRecognition(keywordDump).score).toBe(3);
    expect(markWenckebach({
      diagnosis: 'Mobitz I',
      explanation: 'progressive pr prolongation dropped qrs grouped beating reset',
    }).score).toBe(1);
  });

  it('scores Wenckebach across diagnosis and four defining relationships', () => {
    expect(markWenckebach(complete.wenckebach)).toMatchObject({ score: 5, maximumScore: 5 });
  });

  it('preserves Wenckebach, Mobitz I and Mobitz 1 diagnosis synonyms', () => {
    expect(markWenckebach({ ...complete.wenckebach, diagnosis: 'Wenckebach' }).score).toBe(5);
    expect(markWenckebach({ ...complete.wenckebach, diagnosis: 'Mobitz I' }).score).toBe(5);
    expect(markWenckebach({ ...complete.wenckebach, diagnosis: 'Mobitz 1' }).score).toBe(5);
  });

  it('does not misread Mobitz II as the Mobitz I synonym', () => {
    expect(markWenckebach({ ...complete.wenckebach, diagnosis: 'Mobitz II' }).score).toBe(4);
  });

  it('awards one mark per ECG diagnosis', () => {
    expect(markEcgAnswers(complete.ecgAnswers)).toMatchObject({ score: 5, maximumScore: 5 });
  });

  it('cannot exceed 22 even when extra ECG answers are supplied', () => {
    expect(markTaskTwo({ ...complete, ecgAnswers: [...complete.ecgAnswers, 'Complete heart block'] }).score).toBe(22);
  });
});
