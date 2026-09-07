import { describe, expect, it } from 'vitest';
import { isTutorActionV1 } from '../ai/tutorActions';
import { isTutorResponseV1 } from '../ai/tutorClient';

describe('EP tutor tool whitelist', () => {
  it('accepts only the four supported simulator action shapes', () => {
    expect(isTutorActionV1({ type: 'start', scenario: null })).toBe(true);
    expect(isTutorActionV1({ type: 'pause', scenario: null })).toBe(true);
    expect(isTutorActionV1({ type: 'reset', scenario: null })).toBe(true);
    expect(isTutorActionV1({ type: 'load_scenario', scenario: 'planar-wave' })).toBe(true);
  });

  it('rejects arbitrary or malformed simulator actions', () => {
    expect(isTutorActionV1({ type: 'ablate', scenario: null })).toBe(false);
    expect(isTutorActionV1({ type: 'stimulate', scenario: null })).toBe(false);
    expect(isTutorActionV1({ type: 'set-solver-steps-per-batch', scenario: null })).toBe(false);
    expect(isTutorActionV1({ type: 'load_scenario', scenario: 'invented-scenario' })).toBe(false);
    expect(isTutorActionV1({ type: 'start', scenario: 'planar-wave' })).toBe(false);
  });

  it('accepts at most one validated proposal in a tutor response', () => {
    const base = {
      answer: 'Try the planar-wave scenario.',
      evidenceUsed: ['current scenario: manual-pacing'],
      limitations: [],
    };

    expect(isTutorResponseV1({
      ...base,
      proposedActions: [{ type: 'load_scenario', scenario: 'planar-wave' }],
    })).toBe(true);

    expect(isTutorResponseV1({
      ...base,
      proposedActions: [
        { type: 'pause', scenario: null },
        { type: 'reset', scenario: null },
      ],
    })).toBe(false);

    expect(isTutorResponseV1({
      ...base,
      proposedActions: [{ type: 'ablate', scenario: null }],
    })).toBe(false);
  });
});
