import { describe, expect, it } from 'vitest';
import { analyzeRefinementTrend } from '../engine/verification/ConvergenceTrend';
import {
  evaluateRadialSymmetry,
  evaluateRefinementTrend,
} from '../engine/verification/VerificationAcceptance';
import {
  defaultPlanarRefinementProtocol,
  runPlanarRefinementStudy,
} from '../engine/verification/PlanarRefinementStudy';
import {
  gridNodeCountForExtent,
  physicalCoordinateToGridIndex,
  snapGridCoordinate,
} from '../engine/verification/PhysicalCoordinates';
import {
  analyzeRadialSymmetry,
  createBilinearSample,
  defaultRadialSymmetryProtocol,
  interpolateBilinearActivationTime,
  measureRadialSymmetry,
} from '../engine/verification/RadialSymmetry';
import {
  defaultRadialSensitivityProtocol,
  runRadialSensitivityStudy,
} from '../engine/verification/RadialSensitivityStudy';

const regressionRelativeTolerance = 0.002;
const spatialSpeedBaseline = [1.5209197267468286, 1.57869319420392, 1.5959101810581984];
const temporalSpeedBaseline = [1.5895046105537185, 1.5959101810581984, 1.5991389791351234];
const thresholdSpeedBaseline = [1.5959105017070088, 1.5959101810581984, 1.5959101893172305];
const radialMeanSpeedBaseline = 1.4962693390258603;
const radialSensitivitySpeedBaseline = [
  1.4653777402674317,
  1.4645844919192605,
  1.513801899835566,
  1.5143245610822662,
  1.527389613045027,
  1.5273811114433564,
];

function expectRelative(actual: number, expected: number, tolerance = regressionRelativeTolerance): void {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(tolerance);
}

describe('PR3 physical coordinates and analysis', () => {
  it('maps only exactly representable physical coordinates to grid indices', () => {
    expect(gridNodeCountForExtent(48, 0.25, 'extent')).toBe(193);
    expect(physicalCoordinateToGridIndex(12, 0.25, 192, 'probe')).toBe(48);
    expect(snapGridCoordinate(12.000000000000002)).toBe(12);
    expect(() => physicalCoordinateToGridIndex(1.1, 0.25, 20, 'probe')).toThrow(/not exactly representable/);
    expect(() => physicalCoordinateToGridIndex(6, 0.25, 20, 'probe')).toThrow(/outside/);
  });

  it('interpolates nodal activation time bilinearly, including an exact node', () => {
    expect(interpolateBilinearActivationTime([1, 3, 5, 7], 0.5, 0.5)).toBe(4);
    expect(interpolateBilinearActivationTime([2, 2, 2, 2], 0, 0)).toBe(2);
    const exact = createBilinearSample(2.5, 3, 0.5, 20, 20);
    expect(exact.gridX).toBe(5);
    expect(exact.gridY).toBe(6);
    expect(new Set(exact.cornerIndices).size).toBe(1);
    expect(() => interpolateBilinearActivationTime([1, 2, 3, 4], 1.1, 0)).toThrow(/fractions/);
  });

  it('analyzes a contracting three-level trend and rejects invalid trends', () => {
    const base = {
      parameterName: 'dx' as const,
      parameterUnits: 'model-length-unit' as const,
      quantityUnits: 'model-length-unit/model-time-unit' as const,
      parameterValues: [1, 0.5, 0.25],
      refinementRatio: 2,
    };
    const gates = {
      refinementRatio: 2,
      maximumContraction: 0.75,
      minimumApparentOrder: 0.5,
      maximumFinestPairRelativeChange: 0.02,
    };
    const result = analyzeRefinementTrend({ ...base, quantities: [1.5, 1.57, 1.59] });
    expect(result.trend).toBe('monotone-contracting');
    expect(result.contraction!).toBeCloseTo(2 / 7, 14);
    expect(result.apparentOrder!).toBeGreaterThan(1);
    expect(evaluateRefinementTrend(result, gates).passed).toBe(true);
    const decreasing = analyzeRefinementTrend({ ...base, quantities: [1.04, 1.01, 1.0025] });
    expect(decreasing.apparentOrder!).toBeCloseTo(2, 12);
    expect(decreasing.richardsonEstimate!).toBeCloseTo(1, 12);
    const increasing = analyzeRefinementTrend({ ...base, quantities: [0.96, 0.99, 0.9975] });
    expect(increasing.apparentOrder!).toBeCloseTo(2, 12);
    expect(increasing.richardsonEstimate!).toBeCloseTo(1, 12);
    expect(() => analyzeRefinementTrend({ ...base, parameterValues: [1, 0.6, 0.25], quantities: [1, 2, 3] }))
      .toThrow(/ratio/);
    const oscillatory = analyzeRefinementTrend({ ...base, quantities: [1.5, 1.6, 1.55] });
    expect(oscillatory.trend).toBe('oscillatory');
    expect(oscillatory.richardsonEstimate).toBeNull();
    expect(evaluateRefinementTrend(oscillatory, gates).passed).toBe(false);
    const noncontracting = analyzeRefinementTrend({ ...base, quantities: [1.5, 1.55, 1.61] });
    expect(noncontracting.trend).toBe('monotone-noncontracting');
    expect(evaluateRefinementTrend(noncontracting, gates).failures).not.toEqual([]);
    expect(() => analyzeRefinementTrend({ ...base, quantities: [1.5, Number.NaN, 1.6] })).toThrow(/finite/);
  });

  it('reports radial angular errors separately from acceptance gates', () => {
    const base = {
      sampleRadii: [2, 4] as const,
    };
    const result = analyzeRadialSymmetry({
      ...base,
      activationTimesByRadius: [[1, 1, 1, 1], [3, 3, 3, 3]],
    });
    expect(result.meanDirectionalSpeed).toBe(1);
    expect(result.maximumRelativeSpeedDeviation).toBe(0);
    expect(result.rmsRelativeSpeedDeviation).toBe(0);
    expect(result.relativeSpeedErrorsByAngle).toEqual([0, 0, 0, 0]);
    expect(result.rmsActivationTimeErrors).toEqual([0, 0]);
    expect(evaluateRadialSymmetry(result, {
      maximumDirectionalSpeedDeviation: 0.05,
      maximumOuterActivationSpread: 0.2,
    }).passed).toBe(true);
    expect(() => analyzeRadialSymmetry({
      ...base,
      activationTimesByRadius: [[1, 1, 1, 1], [3, 0.5, 3, 3]],
    })).toThrow(/after inner/);
    const asymmetric = analyzeRadialSymmetry({
      ...base,
      activationTimesByRadius: [[1, 1, 1, 1], [3, 3.2, 3, 3.2]],
    });
    expect(evaluateRadialSymmetry(asymmetric, {
      maximumDirectionalSpeedDeviation: 0.01,
      maximumOuterActivationSpread: 0.01,
    }).passed).toBe(false);
  });
});

describe('PR3 deterministic integration protocols', () => {
  it('records separate spatial and temporal planar refinement trends', () => {
    const first = runPlanarRefinementStudy();
    const second = runPlanarRefinementStudy();
    expect(second).toEqual(first);
    expect(first.uniqueRunCount).toBe(7);
    expect(first.safeguardStatus).toBe('unclipped');
    expect(first.scientificAcceptance.passed).toBe(true);
    expect(first.spatialAcceptance.passed).toBe(true);
    expect(first.temporalAcceptance.passed).toBe(true);
    first.spatialRuns.forEach((run, index) => {
      expectRelative(run.speed, spatialSpeedBaseline[index]!);
      expect(run.stableDt).toBe(defaultPlanarRefinementProtocol.spatialDt);
      expect((run.protocol.solverConfig.grid.width - 1) * run.protocol.solverConfig.grid.dx).toBe(48);
      expect((run.protocol.solverConfig.grid.height - 1) * run.protocol.solverConfig.grid.dx).toBe(12);
      expect(run.safeguardStatus).toBe('unclipped');
      expect(run.diagnostics).toEqual({
        denominatorGuardCount: 0,
        voltageClipLowCount: 0,
        voltageClipHighCount: 0,
        recoveryClipLowCount: 0,
        recoveryClipHighCount: 0,
        nonFiniteStateCount: 0,
      });
    });
    first.temporalRuns.forEach((run, index) => {
      expectRelative(run.speed, temporalSpeedBaseline[index]!);
      expect(run.stableDt).toBe(defaultPlanarRefinementProtocol.temporalDt[index]);
      expect(run.safeguardStatus).toBe('unclipped');
      expect(run.diagnostics).toEqual({
        denominatorGuardCount: 0,
        voltageClipLowCount: 0,
        voltageClipHighCount: 0,
        recoveryClipLowCount: 0,
        recoveryClipHighCount: 0,
        nonFiniteStateCount: 0,
      });
    });
    expect(first.spatialTrend.contraction!).toBeLessThanOrEqual(0.75);
    expect(first.spatialTrend.apparentOrder!).toBeGreaterThanOrEqual(0.5);
    expect(first.spatialTrend.finestPairRelativeChange).toBeLessThanOrEqual(0.02);
    expect(first.temporalTrend.contraction!).toBeLessThanOrEqual(0.75);
    expect(first.temporalTrend.apparentOrder!).toBeGreaterThanOrEqual(0.5);
    expect(first.temporalTrend.finestPairRelativeChange).toBeLessThanOrEqual(0.02);
    expect(first.thresholdSensitivity.thresholds).toEqual([0.3, 0.5, 0.7]);
    expect(first.thresholdRuns).toHaveLength(3);
    first.thresholdRuns.forEach((run, index) => expectRelative(run.speed, thresholdSpeedBaseline[index]!));
    expect(Number.isFinite(first.thresholdSensitivity.relativeSpan)).toBe(true);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.protocol.model)).toBe(true);
  }, 120_000);

  it('characterizes radial symmetry over dx and sub-cell stimulus-centre phase', () => {
    const first = runRadialSensitivityStudy();
    const second = runRadialSensitivityStudy();
    expect(second).toEqual(first);
    expect(first.cases).toHaveLength(6);
    expect(first.scientificAcceptance.passed).toBe(true);
    expect(first.phaseTrends).toHaveLength(2);
    expect(first.shiftedCenterRelativeDifferences).toHaveLength(3);
    first.cases.forEach((entry, index) => {
      expectRelative(entry.result.meanDirectionalSpeed, radialSensitivitySpeedBaseline[index]!);
      expect(entry.result.safeguardStatus).toBe('unclipped');
      expect(entry.result.relativeSpeedErrorsByAngle).toHaveLength(defaultRadialSensitivityProtocol.angleCount);
      expect(entry.result.rmsRelativeSpeedDeviation).toBeGreaterThanOrEqual(0);
      expect(entry.result.rmsActivationTimeErrors).toHaveLength(2);
      expect(Math.abs(entry.result.relativeSpeedErrorsByAngle.reduce((sum, error) => sum + error, 0)))
        .toBeLessThan(1e-12);
      if (entry.phase === 'half-cell-shifted') {
        expect(entry.centerX).toBe(defaultRadialSensitivityProtocol.baseCenterX + entry.dx / 2);
      }
    });
    expect(first.cases.filter((entry) => entry.dx === 1).every((entry) => !entry.result.acceptance.passed)).toBe(true);
    expect(first.cases.filter((entry) => entry.dx < 1).every((entry) => entry.result.acceptance.passed)).toBe(true);
    expect(first.phaseTrends.every((entry) => entry.acceptance.passed)).toBe(true);
    expect(first.shiftedCenterRelativeDifferences[2]).toBeLessThan(first.shiftedCenterRelativeDifferences[0]!);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.cases)).toBe(true);
  }, 120_000);

  it('measures deterministic radial grid-isotropy at equal polar angles', () => {
    const first = measureRadialSymmetry();
    const second = measureRadialSymmetry();
    expect(second).toEqual(first);
    expectRelative(first.meanDirectionalSpeed, radialMeanSpeedBaseline);
    expect(first.angles).toHaveLength(32);
    expect(first.activationTimesByRadius.every((times) => times.length === 32)).toBe(true);
    expect(first.maximumRelativeSpeedDeviation).toBeLessThanOrEqual(0.01);
    expect(first.activationSpreads[1]).toBeLessThanOrEqual(0.04);
    expect(first.stableDt).toBe(0.02);
    expect(first.safeguardStatus).toBe('unclipped');
    expect(first.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    });
    expect(first.stateExtrema.recoveryMaximum).toBeGreaterThan(0);
    expect(first.acceptance.passed).toBe(true);
    expect(Object.isFrozen(first.protocol)).toBe(true);
    expect(Object.isFrozen(first.samplesByRadius[0])).toBe(true);
  }, 60_000);

  it('rejects a timestep silently capped by the diffusion stability limit', () => {
    expect(() => measureRadialSymmetry({
      ...defaultRadialSymmetryProtocol,
      solverConfig: { ...defaultRadialSymmetryProtocol.solverConfig, requestedDt: 0.1 },
    })).toThrow(/capped/);
  });

  it('fails fast on invalid radial geometry and refinement definitions', () => {
    expect(() => measureRadialSymmetry({
      ...defaultRadialSymmetryProtocol,
      sampleRadii: [14, 8],
    })).toThrow(/strictly increasing/);
    expect(() => measureRadialSymmetry({
      ...defaultRadialSymmetryProtocol,
      stimulusRadius: 8,
    })).toThrow(/smaller than the inner/);
    expect(() => measureRadialSymmetry({
      ...defaultRadialSymmetryProtocol,
      maximumDirectionalSpeedDeviation: Number.NaN,
    })).toThrow(/gates/);
    expect(() => runPlanarRefinementStudy({
      ...defaultPlanarRefinementProtocol,
      spatialDx: [1, 0.6, 0.25],
    })).toThrow(/ratio/);
    expect(() => runPlanarRefinementStudy({
      ...defaultPlanarRefinementProtocol,
      gates: { ...defaultPlanarRefinementProtocol.gates, maximumContraction: Number.NaN },
    })).toThrow(/Maximum contraction/);
  });
});
