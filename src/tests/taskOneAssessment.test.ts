import { describe, expect, it } from 'vitest';
import {
  activationConceptMatches,
  markActivationPattern,
  markCatheterPlacements,
  markCsLabelling,
  markNormalMeasurements,
  totalTaskOneScore,
} from '../assessment/task1/marking';

describe('Task 1 basic EP study assessment', () => {
  it('awards one mark for each correctly positioned standard catheter', () => {
    const result = markCatheterPlacements({
      hra: 'high-right-atrium',
      hbe: 'his-bundle-region',
      rva: 'right-ventricular-apex',
      cs: 'coronary-sinus',
    });
    expect(result.score).toBe(4);
    expect(result.maximumScore).toBe(4);
  });

  it('does not award a placement mark when HRA and His positions are swapped', () => {
    const result = markCatheterPlacements({
      hra: 'his-bundle-region',
      hbe: 'high-right-atrium',
      rva: 'right-ventricular-apex',
      cs: 'coronary-sinus',
    });
    expect(result.score).toBe(2);
  });

  it('uses the distal CS 1-2 convention for the one-mark labelling item', () => {
    expect(markCsLabelling('distal').score).toBe(1);
    expect(markCsLabelling('proximal').score).toBe(0);
  });

  it('requires all five configured baseline measurements for five marks', () => {
    expect(markNormalMeasurements({ PA: true, AH: true, HV: true, PR: true, RR: true }).score).toBe(5);
    expect(markNormalMeasurements({ PA: true, AH: true, HV: false, PR: true, RR: true }).score).toBe(4);
  });

  it('scores normal classification plus four source-based activation concepts', () => {
    const explanation = 'Activation begins near the sinus node in the high right atrium. Atrial activation reaches the AV node and His, the coronary sinus runs proximal to distal, and the His signal is followed by ventricular activation.';
    expect(activationConceptMatches(explanation)).toEqual([true, true, true, true]);
    expect(markActivationPattern('normal', explanation).score).toBe(5);
  });

  it('does not award sequence concepts for a keyword list without directional relationships', () => {
    const explanation = 'Atrial His coronary sinus proximal distal ventricular.';
    expect(activationConceptMatches(explanation)).toEqual([false, false, false, false]);
    expect(markActivationPattern('normal', explanation).score).toBe(1);
  });

  it('caps the complete task at the specified 15 marks', () => {
    const placements = markCatheterPlacements({ hra: 'high-right-atrium', hbe: 'his-bundle-region', rva: 'right-ventricular-apex', cs: 'coronary-sinus' });
    const cs = markCsLabelling('distal');
    const measurements = markNormalMeasurements({ PA: true, AH: true, HV: true, PR: true, RR: true });
    const activation = markActivationPattern('normal', 'Sinus node and high right atrium start atrial activation before the AV node and His. Coronary sinus activation proceeds proximal to distal, then His is followed by ventricular QRS activation.');
    const total = totalTaskOneScore(placements, cs, measurements, activation);
    expect(total.score).toBe(15);
    expect(total.maximumScore).toBe(15);
  });
});
