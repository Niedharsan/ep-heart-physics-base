import { describe, expect, it } from 'vitest';
import {
  analyzeCaptureCrossings,
  buildCouplingIntervals,
  defaultRefractoryCaptureProtocol,
  runRefractoryCaptureStudy,
  type ProbeCrossings,
} from '../engine/verification/RefractoryCapture';

function probe(s2Rising: number | null, s1Rising = 1, s1Falling = 10): ProbeCrossings {
  return { s1Rising, s1Falling, s2Rising };
}

describe('refractory capture analysis', () => {
  it('requires complete, planar, downstream-ordered second activations', () => {
    const captured = analyzeCaptureCrossings([
      [probe(30), probe(30.01)],
      [probe(34), probe(34.01)],
      [probe(38), probe(38.01)],
    ], 0.02);
    expect(captured.outcome).toBe('capture');
    expect(captured.stationMeanS2ActivationTimes[0]).toBeCloseTo(30.005, 12);

    expect(analyzeCaptureCrossings([
      [probe(null), probe(30)],
      [probe(34), probe(34)],
    ], 0.02).outcome).toBe('failure');
    expect(analyzeCaptureCrossings([
      [probe(35), probe(35)],
      [probe(34), probe(34)],
    ], 0.02).failureReasons.join(' ')).toMatch(/not strictly ordered/);
    expect(analyzeCaptureCrossings([
      [probe(30), probe(30.1)],
      [probe(34), probe(34)],
    ], 0.02).failureReasons.join(' ')).toMatch(/transverse spread/);
    expect(analyzeCaptureCrossings([
      [probe(30, 10, 1), probe(30)],
      [probe(34), probe(34)],
    ], 0.02).failureReasons.join(' ')).toMatch(/nonsequential/);
    expect(() => analyzeCaptureCrossings([
      [probe(30, 1, Number.NaN), probe(30)],
      [probe(34), probe(34)],
    ], 0.02)).toThrow(/finite or null/);
  });

  it('builds a sorted, deduplicated dt-resolved interval set', () => {
    const intervals = buildCouplingIntervals(defaultRefractoryCaptureProtocol);
    expect(intervals[0]).toBe(30);
    expect(intervals.at(-1)).toBe(33);
    expect(intervals).toContain(31);
    expect(intervals).toContain(32);
    expect(new Set(intervals).size).toBe(intervals.length);
  });
});

describe('deterministic paired-stimulus capture study', () => {
  it('reproduces a monotone failure-to-capture transition with zero clipping', () => {
    const first = runRefractoryCaptureStudy();
    const second = runRefractoryCaptureStudy();
    expect(second).toEqual(first);
    expect(first.longestFailingInterval).toBe(31.58);
    expect(first.shortestCapturedInterval).toBe(31.6);
    expect(first.transitionResolution).toBe(0.02);
    expect(first.units).toBe('model-time-unit');
    expect(first.safeguardStatus).toBe('unclipped');
    expect(first.scientificStatus).toBe('implementation-characterization');
    expect(first.diagnostics.recoveryClipHighCount).toBe(0);
    expect(first.diagnostics.denominatorGuardCount).toBe(0);
    expect(first.diagnostics.nonFiniteStateCount).toBe(0);

    const failure = first.trials.find((trial) => trial.couplingInterval === 31.58)!;
    const capture = first.trials.find((trial) => trial.couplingInterval === 31.6)!;
    expect(failure.outcome).toBe('failure');
    expect(capture.outcome).toBe('capture');
    expect(capture.crossingsByStation.flat().every((crossings) => crossings.s2Rising !== null)).toBe(true);
    expect(capture.stationMeanS2ActivationTimes).toEqual([...capture.stationMeanS2ActivationTimes].sort((a, b) => a! - b!));
    expect(capture.transverseSpreads.every((spread) => spread !== null && spread <= 0.02)).toBe(true);
    const s2Latencies = capture.stationMeanS2ActivationTimes.map((time) => time! - capture.s2ApplicationTime);
    [5.64225, 11.04835, 15.62037].forEach((expected, index) => {
      expect(s2Latencies[index]).toBeCloseTo(expected, 2);
    });
    expect(capture.preS2State.voltage.values).toHaveLength(3);
    expect(capture.preS2State.recovery.values).toHaveLength(3);
    expect(first.stateExtrema.recoveryMaximum).toBeGreaterThan(2);
    expect(first.stateExtrema.recoveryMaximum).toBeLessThan(2.645);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.protocol.model)).toBe(true);
    expect(Object.isFrozen(first.trials)).toBe(true);
  }, 120_000);

  it('rejects capped timesteps, off-grid intervals, and invalid probe geometry', () => {
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      dt: 0.1,
      transitionScan: { minimum: 24, maximum: 25, resolution: 0.1 },
      coarseCouplingIntervals: [24, 25],
    })).toThrow(/capped/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      coarseCouplingIntervals: [24.301],
    })).toThrow(/not aligned/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      stationX: [2, 12, 18],
    })).toThrow(/downstream/);
  });
});
