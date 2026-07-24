import { describe, expect, it } from 'vitest';
import { analyzeObservedOrder } from '../engine/verification/ObservedOrder';
import { evaluateVerification } from '../engine/verification/VerificationAcceptance';
import { runManufacturedReactionDiffusionStudy } from '../engine/verification/ManufacturedReactionDiffusion';
import { runAnalyticDiffusionDecay } from '../engine/verification/AnalyticDiffusion';

describe('analysis and acceptance separation', () => {
  it('preserves failed and non-monotone finite error sequences for reporting', () => {
    const divergent = analyzeObservedOrder([1, 2, 4], 2);
    expect(divergent.trend).toBe('divergent');
    expect(divergent.pairwiseOrders).toEqual([-1, -1]);
    const oscillatory = analyzeObservedOrder([1, 0.5, 0.75], 2);
    expect(oscillatory.trend).toBe('oscillatory');
    const acceptance = evaluateVerification(oscillatory, {
      requireContracting: true,
      minimumPairwiseOrder: 1,
    });
    expect(acceptance.passed).toBe(false);
    expect(acceptance.failures.length).toBeGreaterThan(0);
  });
});

describe('analytic diffusion verification', () => {
  it('reproduces cosine-mode decay with homogeneous Neumann boundaries', () => {
    const first = runAnalyticDiffusionDecay();
    const second = runAnalyticDiffusionDecay();
    console.info('analytic diffusion errors', first.voltageError, first.recoveryError);
    expect(second).toEqual(first);
    expect(first.precision).toBe('float64');
    expect(first.voltageError.rootMeanSquare).toBeLessThan(2e-5);
    expect(first.voltageError.maximumAbsolute).toBeLessThan(4e-5);
    expect(first.recoveryError.maximumAbsolute).toBeLessThan(1e-14);
    expect(first.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    });
  });
});

describe('manufactured reaction-diffusion verification', () => {
  it('reproduces expected combined second-order and temporal first-order convergence', () => {
    const first = runManufacturedReactionDiffusionStudy();
    const second = runManufacturedReactionDiffusionStudy();
    expect(second).toEqual(first);
    expect(first.precision).toBe('float64');
    const spatialReports = Object.values(first.spatialOrders);
    const temporalReports = Object.values(first.temporalOrders);
    spatialReports.forEach((report, index) => {
      const acceptance = evaluateVerification(report, {
        requireContracting: true,
        minimumPairwiseOrder: index % 2 === 0 ? 1.8 : 1.7,
      });
      expect(acceptance.failures).toEqual([]);
    });
    temporalReports.forEach((report) => {
      const acceptance = evaluateVerification(report, {
        requireContracting: true,
        minimumPairwiseOrder: 0.9,
        maximumPairwiseOrder: 1.1,
      });
      expect(acceptance.failures).toEqual([]);
    });
    [...first.spatialLevels, ...first.temporalLevels].forEach((level) => {
      expect(level.diagnostics).toEqual({
        denominatorGuardCount: 0,
        voltageClipLowCount: 0,
        voltageClipHighCount: 0,
        recoveryClipLowCount: 0,
        recoveryClipHighCount: 0,
        nonFiniteStateCount: 0,
      });
    });
  }, 30_000);
});
