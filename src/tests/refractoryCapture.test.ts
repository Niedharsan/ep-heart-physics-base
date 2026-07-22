import { describe, expect, it } from 'vitest';
import {
  analyzeCaptureCrossings,
  analyzeCaptureTransition,
  buildReferenceCouplingIntervals,
  defaultRefractoryCaptureProtocol,
  runRefractoryCaptureStudy,
  type ProbeCrossings,
  type RefractoryCaptureTrialResult,
} from '../engine/verification/RefractoryCapture';

function probe(s2Rising: number | null, s1Rising = 1, s1Falling = 10): ProbeCrossings {
  return { s1Rising, s1Falling, s2Rising };
}

function outcome(couplingInterval: number, value: 'capture' | 'failure'): RefractoryCaptureTrialResult {
  return { couplingInterval, outcome: value } as RefractoryCaptureTrialResult;
}

describe('paired-stimulus capture analysis', () => {
  it('requires complete, planar, downstream-ordered second activations', () => {
    const captured = analyzeCaptureCrossings([
      [probe(30, 1, 10), probe(30.01, 1.01, 10.01)],
      [probe(34, 2, 11), probe(34.01, 2.01, 11.01)],
      [probe(38, 3, 12), probe(38.01, 3.01, 12.01)],
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
    ], 0.02).failureReasons.join(' ')).toMatch(/spread/);
    expect(analyzeCaptureCrossings([
      [probe(30, 10, 1), probe(30)],
      [probe(34), probe(34)],
    ], 0.02).failureReasons.join(' ')).toMatch(/nonsequential/);
    expect(() => analyzeCaptureCrossings([
      [probe(30, 1, Number.NaN), probe(30)],
      [probe(34), probe(34)],
    ], 0.02)).toThrow(/finite or null/);
  });

  it('preserves nonmonotone transition evidence for separate acceptance', () => {
    const nonmonotone = analyzeCaptureTransition([
      outcome(20, 'failure'), outcome(20.02, 'capture'), outcome(20.04, 'failure'),
    ], 0.02);
    expect(nonmonotone.monotone).toBe(false);
    expect(nonmonotone.transitionCount).toBe(2);
    expect(nonmonotone.notes.join(' ')).toMatch(/not a monotone/);
  });

  it('builds an inclusive, ordered, dt-resolved exhaustive interval set', () => {
    const intervals = buildReferenceCouplingIntervals(defaultRefractoryCaptureProtocol);
    expect(intervals).toHaveLength(101);
    expect(intervals[0]).toBe(20);
    expect(intervals.at(-1)).toBe(22);
    intervals.slice(1).forEach((interval, index) => {
      expect(interval - intervals[index]!).toBeCloseTo(0.02, 12);
    });
  });
});

describe('normalized paired-stimulus propagated-capture study', () => {
  it('confirms the optimized transition against an exhaustive scan and no-S2 control', () => {
    const first = runRefractoryCaptureStudy();
    const second = runRefractoryCaptureStudy();
    expect(second).toEqual(first);
    expect(first.referenceScanTrials).toHaveLength(101);
    expect(first.optimizedSearchIntervals.length).toBeLessThan(first.referenceScanTrials.length);
    expect(first.optimizedSearchIntervals).toContain(21.22);
    expect(first.optimizedSearchIntervals).toContain(21.24);
    expect(first.transitionAgreement).toBe(true);
    expect(first.optimizedTransition).toEqual(first.referenceTransition);
    expect(first.referenceTransition.monotone).toBe(true);
    expect(first.referenceTransition.transitionCount).toBe(1);
    expect(first.referenceTransition.transitionResolution).toBe(0.02);
    expect(first.referenceTransition.longestFailingInterval).toBe(21.22);
    expect(first.referenceTransition.shortestCapturedInterval).toBe(21.24);
    expect(first.noS2Control.passed).toBe(true);
    expect(first.noS2Control.crossingsByStation.flat().every((probe) => probe.s2Rising === null)).toBe(true);
    expect(first.conditioningOnsetTimes).toEqual([0, 40, 80]);
    expect(first.conditioningBeats).toHaveLength(3);
    expect(first.conditioningBeats.every((beat) => beat.propagated)).toBe(true);
    expect(first.stimulus).toEqual({
      kind: 'rectangular-monophasic-current',
      amplitudeUnits: 'dimensionless-voltage/model-time-unit',
      integratedStrength: 1,
    });
    expect(first.units).toBe('model-time-unit');
    expect(first.safeguardStatus).toBe('unclipped');
    expect(first.scientificStatus).toBe('implementation-characterization');
    expect(first.acceptance).toEqual({ passed: true, failures: [] });
    expect(first.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    });
    const capture = first.referenceScanTrials.find((trial) => trial.couplingInterval
      === first.referenceTransition.shortestCapturedInterval)!;
    expect(capture.outcome).toBe('capture');
    expect(capture.crossingsByStation.flat().every((crossings) => crossings.s2Rising !== null)).toBe(true);
    expect(capture.stationMeanS2ActivationTimes).toEqual(
      [...capture.stationMeanS2ActivationTimes].sort((left, right) => left! - right!),
    );
    expect(capture.transverseSpreads.every((spread) => spread !== null && spread <= 0.02)).toBe(true);
    const s2Latencies = capture.stationMeanS2ActivationTimes.map((time) => time! - capture.s2ApplicationTime);
    [5.89657, 10.88673, 15.45624].forEach((expected, index) => {
      expect(s2Latencies[index]).toBeCloseTo(expected, 2);
    });
    expect(capture.preS2State.voltage.values).toHaveLength(3);
    expect(capture.preS2State.recovery.values).toHaveLength(3);
    expect(capture.preS2State.voltage.mean).toBeCloseTo(0.017987007275223732, 12);
    expect(capture.preS2State.recovery.mean).toBeCloseTo(0.9299807548522949, 12);
    expect(first.stateExtrema.recoveryMaximum).toBeGreaterThan(2);
    expect(first.stateExtrema.recoveryMaximum).toBeLessThan(2.645);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.referenceScanTrials)).toBe(true);
  }, 240_000);

  it('rejects capped timesteps, off-grid durations, and invalid conditioning definitions', () => {
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      dt: 0.1,
      referenceScan: { minimum: 20, maximum: 22, resolution: 0.1 },
    })).toThrow(/capped/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      stimulusDuration: 0.21,
    })).toThrow(/not aligned/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      conditioningPulseCount: 1,
    })).toThrow(/at least two/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      basicCycleLength: 0.1,
    })).toThrow(/shorter than BCL/);
    expect(() => runRefractoryCaptureStudy({
      ...defaultRefractoryCaptureProtocol,
      stationX: [2, 12, 18],
    })).toThrow(/downstream/);
  });
});
