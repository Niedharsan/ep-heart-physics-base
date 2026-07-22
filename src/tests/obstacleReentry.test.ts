import { describe, expect, it } from 'vitest';
import {
  analyzeObstacleReentry,
  defaultObstacleReentryProtocol,
  measureObstacleReentry,
} from '../engine/verification/ObstacleReentry';

const analysisGates = {
  observationEndTime: 35,
  finalActiveCellCount: 10,
  minimumCircuitCount: 2,
  maximumPeriodRelativeSpread: 0.1,
  maximumEndGapPeriods: 1,
};

describe('obstacle re-entry analysis', () => {
  it('accepts repeated circuits in either consistent direction', () => {
    const forward = analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 20, 30], [12, 22], [14, 24], [16, 26]],
    });
    expect(forward.outcome).toBe('persistent-reentry');
    expect(forward.direction).toBe('west-south-east-north');
    expect(forward.circuitPeriods).toEqual([10, 10]);

    const reverse = analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 20, 30], [16, 26], [14, 24], [12, 22]],
    });
    expect(reverse.outcome).toBe('persistent-reentry');
    expect(reverse.direction).toBe('west-north-east-south');
  });

  it('rejects incomplete, inconsistent, irregular, stale, inactive, and invalid observations', () => {
    expect(analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 20, 30], [12, 22], [14], [16, 26]],
    }).outcome).toBe('no-persistent-reentry');
    expect(analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 20, 30], [12, 26], [14, 24], [16, 22]],
    }).failureReasons.join(' ')).toMatch(/consistent rotation/);
    expect(analyzeObstacleReentry({
      ...analysisGates,
      observationEndTime: 40,
      crossingTimesByProbe: [[10, 20, 35], [12, 22], [14, 24], [16, 26]],
    }).failureReasons.join(' ')).toMatch(/relative spread/);
    expect(analyzeObstacleReentry({
      ...analysisGates,
      observationEndTime: 60,
      crossingTimesByProbe: [[10, 20, 30], [12, 22], [14, 24], [16, 26]],
    }).failureReasons.join(' ')).toMatch(/remote/);
    expect(analyzeObstacleReentry({
      ...analysisGates,
      finalActiveCellCount: 0,
      crossingTimesByProbe: [[10, 20, 30], [12, 22], [14, 24], [16, 26]],
    }).failureReasons.join(' ')).toMatch(/no active/);
    expect(() => analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, Number.NaN], [12], [14], [16]],
    })).toThrow(/finite/);
    expect(() => analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 9], [12], [14], [16]],
    })).toThrow(/strictly increasing/);
    expect(() => analyzeObstacleReentry({
      ...analysisGates,
      crossingTimesByProbe: [[10, 40], [12], [14], [16]],
    })).toThrow(/observation window/);
  });
});

describe('deterministic obstacle re-entry protocol', () => {
  it('reproduces two persistent ordered circuits and exposes clipping', () => {
    const first = measureObstacleReentry();
    const second = measureObstacleReentry();
    expect(second).toEqual(first);
    expect(first.outcome).toBe('persistent-reentry');
    expect(first.direction).toBe('west-south-east-north');
    expect(first.circuitCount).toBe(2);
    expect(first.circuitPeriods[0]).toBeCloseTo(68.733, 2);
    expect(first.circuitPeriods[1]).toBeCloseTo(66.547, 2);
    expect(first.periodRelativeSpread).toBeLessThanOrEqual(0.1);
    expect(first.finalActiveCellCount).toBe(2911);
    expect(first.safeguardStatus).toBe('clipped');
    expect(first.scientificStatus).toBe('implementation-characterization-compromised-by-clipping');
    expect(first.diagnostics.denominatorGuardCount).toBe(0);
    expect(first.diagnostics.nonFiniteStateCount).toBe(0);
    expect(first.diagnostics.recoveryClipHighCount).toBe(1_179_395);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.protocol.solverConfig)).toBe(true);
    expect(Object.isFrozen(first.crossingTimesByProbe)).toBe(true);
  }, 30_000);

  it('distinguishes a nearby S2 timing that terminates without a circuit', () => {
    const control = measureObstacleReentry({ ...defaultObstacleReentryProtocol, s2Time: 24 });
    expect(control.outcome).toBe('no-persistent-reentry');
    expect(control.circuitCount).toBe(0);
    expect(control.finalActiveCellCount).toBe(0);
  }, 15_000);

  it('rejects capped timesteps and invalid protocol geometry before simulation', () => {
    expect(() => measureObstacleReentry({
      ...defaultObstacleReentryProtocol,
      solverConfig: { ...defaultObstacleReentryProtocol.solverConfig, requestedDt: 0.4 },
    })).toThrow(/capped/);
    expect(() => measureObstacleReentry({
      ...defaultObstacleReentryProtocol,
      obstacleRadius: 16,
    })).toThrow(/probe radius/);
    expect(() => measureObstacleReentry({
      ...defaultObstacleReentryProtocol,
      s2Rectangle: { ...defaultObstacleReentryProtocol.s2Rectangle, xMaximum: 50.5 },
    })).toThrow(/not exactly representable/);
    expect(() => measureObstacleReentry({
      ...defaultObstacleReentryProtocol,
      maximumModelTime: 28,
    })).toThrow(/extend beyond S2/);
  });
});
