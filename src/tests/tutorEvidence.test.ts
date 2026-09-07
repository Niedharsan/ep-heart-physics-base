import { describe, expect, it } from 'vitest';
import { buildTutorEvidence, summarizeTutorSignal } from '../ai/buildTutorEvidence';
import type { EngineSnapshot } from '../engine/core/types';
import { summarizeTissueActivity } from '../ui/TissueActivity';

function createSnapshot(): EngineSnapshot {
  return {
    width: 2,
    height: 2,
    dx: 1,
    time: 12.5,
    solverStepIndex: 100,
    voltage: new Float32Array([0, 0.3, 0.8, 0.1]),
    tissueMask: new Uint8Array([1, 1, 1, 1]),
    lesions: [{ id: 'lesion-1', x: 1, y: 1, radius: 1, createdAt: 10 }],
    simulationStepsPerSecond: 1250,
    diagnostics: {
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    },
  };
}

describe('EP tutor evidence boundary', () => {
  it('summarizes the pseudo-ECG without sending the raw trace', () => {
    expect(summarizeTutorSignal([-2, 1, 3])).toEqual({
      sampleCount: 3,
      minimum: -2,
      maximum: 3,
      peakToPeak: 5,
      lastValue: 3,
    });
  });

  it('builds compact serializable evidence without the voltage field', () => {
    const snapshot = createSnapshot();
    const evidence = buildTutorEvidence({
      scenario: 'manual-pacing',
      running: true,
      stableDt: 0.08,
      snapshot,
      tissueActivity: summarizeTissueActivity(snapshot),
      pacingSiteCount: 2,
      ecgSamples: [-0.2, 0.4, 0.1],
    });

    expect(evidence.schemaVersion).toBe(1);
    expect(evidence.scenario).toBe('manual-pacing');
    expect(evidence.lesionCount).toBe(1);
    expect(evidence.pacingSiteCount).toBe(2);
    expect(evidence.tissue.visibleActiveCellCount).toBe(2);
    expect(evidence.pseudoEcg.peakToPeak).toBeCloseTo(0.6);
    expect('voltage' in evidence).toBe(false);
    expect('tissueMask' in evidence).toBe(false);
    expect(JSON.stringify(evidence)).not.toContain('Float32Array');
  });
});
