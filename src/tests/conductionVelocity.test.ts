import { describe, expect, it } from 'vitest';
import { defaultAlievPanfilovParameters } from '../engine/models/AlievPanfilov';
import {
  analyzePlanarActivationTimes,
  fitActivationTimes,
  interpolateUpwardCrossing,
  measurePlanarConductionVelocity,
  type PlanarVelocityProtocol,
} from '../engine/verification/PlanarConductionVelocity';
import { hasStateClipping } from '../engine/core/numericalDiagnostics';

const referenceSpeed = 1.42511135536906;
const maximumRelativeSpeedError = 0.02;

const referenceProtocol: PlanarVelocityProtocol = {
  solverConfig: {
    grid: { width: 96, height: 24, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    stepsPerFrame: 1,
    model: defaultAlievPanfilovParameters,
  },
  stimulusMaximumX: 2,
  threshold: 0.5,
  xStations: [24, 36, 48, 60, 72],
  yRows: [6, 12, 18],
  maximumModelTime: 80,
  minimumRSquared: 0.999,
  maximumPlanaritySpread: 0.08,
};

describe('planar conduction velocity verification', () => {
  it('interpolates only a first upward threshold crossing', () => {
    expect(interpolateUpwardCrossing(0.4, 0.6, 2, 3, 0.5)).toBeCloseTo(2.5, 14);
    expect(interpolateUpwardCrossing(0.4, 0.5, 2, 3, 0.5)).toBe(3);
    expect(interpolateUpwardCrossing(0.6, 0.4, 2, 3, 0.5)).toBeNull();
    expect(interpolateUpwardCrossing(0.2, 0.4, 2, 3, 0.5)).toBeNull();
    expect(() => interpolateUpwardCrossing(0.4, 0.6, 2, 2, 0.5)).toThrow(/currentTime/);
    expect(() => interpolateUpwardCrossing(Number.NaN, 0.6, 2, 3, 0.5)).toThrow(/previousValue/);
  });

  it('fits a known synthetic propagation speed and rejects invalid timing', () => {
    const fit = fitActivationTimes([10, 20, 30, 40], [3, 5, 7, 9]);
    expect(1 / fit.slope).toBeCloseTo(5, 14);
    expect(fit.rSquared).toBeCloseTo(1, 14);
    expect(fit.maximumAbsoluteResidual).toBeLessThan(1e-12);
    expect(() => fitActivationTimes([10, 20], [3, 3])).toThrow(/strictly increasing/);
    expect(() => fitActivationTimes([10, 10], [3, 4])).toThrow(/positions/);
  });

  it('rejects nonlinear activation and excessive transverse spread', () => {
    expect(() => analyzePlanarActivationTimes({
      positions: [0, 1, 2, 3],
      activationTimesByStation: [[1], [2], [4], [5]],
      minimumRSquared: 0.999,
      maximumPlanaritySpread: 0.1,
    })).toThrow(/R-squared/);
    expect(() => analyzePlanarActivationTimes({
      positions: [0, 1, 2],
      activationTimesByStation: [[1, 1.2], [2, 2.2], [3, 3.2]],
      minimumRSquared: 0.999,
      maximumPlanaritySpread: 0.1,
    })).toThrow(/transverse spread/);
  });

  it('rejects ragged rows and row-level downstream reversal', () => {
    expect(() => analyzePlanarActivationTimes({
      positions: [0, 1, 2],
      activationTimesByStation: [[1, 1], [2], [3, 3]],
      minimumRSquared: 0,
      maximumPlanaritySpread: 1,
    })).toThrow(/equal transverse row counts/);
    expect(() => analyzePlanarActivationTimes({
      positions: [0, 1, 2],
      activationTimesByStation: [[1, 3], [2, 2.5], [3, 4]],
      minimumRSquared: 0,
      maximumPlanaritySpread: 2,
    })).toThrow(/strictly later/);
  });

  it('measures a deterministic planar reference wave and exposes safeguard contamination', () => {
    const first = measurePlanarConductionVelocity(referenceProtocol);
    const second = measurePlanarConductionVelocity(referenceProtocol);
    expect(second).toEqual(first);
    expect(Math.abs(first.speed - referenceSpeed) / Math.abs(referenceSpeed))
      .toBeLessThanOrEqual(maximumRelativeSpeedError);
    expect(first.units).toBe('model-length-unit/model-time-unit');
    expect(first.safeguardStatus).toBe('clipped');
    expect(hasStateClipping(first.diagnostics)).toBe(true);
    expect(first.positions).toHaveLength(5);
    expect(first.activationTimesByStation.every((station) => station.length === 3)).toBe(true);
    expect(first.rSquared).toBeGreaterThanOrEqual(0.999);
    expect(first.protocol.maximumPlanaritySpread).toBe(first.stableDt);
    expect(first.maximumTransverseSpread).toBeLessThan(Number.EPSILON);
    expect(first.segmentSpeeds.every((speed) => speed > 0 && Number.isFinite(speed))).toBe(true);
    expect(first.diagnostics.denominatorGuardCount).toBe(0);
    expect(first.diagnostics.nonFiniteStateCount).toBe(0);
    expect(first.diagnostics.recoveryClipHighCount).toBeGreaterThan(0);
  });

  it('rejects probes that start active or never activate', () => {
    expect(() => measurePlanarConductionVelocity({ ...referenceProtocol, xStations: [2, 24, 48] }))
      .toThrow(/beyond the initialized stimulus/);
    expect(() => measurePlanarConductionVelocity({ ...referenceProtocol, threshold: 0 }))
      .toThrow(/begin below the activation threshold/);
    expect(() => measurePlanarConductionVelocity({ ...referenceProtocol, maximumModelTime: 1 }))
      .toThrow(/did not activate every probe/);
    expect(() => measurePlanarConductionVelocity({ ...referenceProtocol, yRows: [6, 6, 18] }))
      .toThrow(/distinct/);
  });

  it('does not accept an interpolated crossing after the protocol deadline', () => {
    const shortProtocol = { ...referenceProtocol, xStations: [3, 4, 5], maximumModelTime: 10 };
    const completed = measurePlanarConductionVelocity(shortProtocol);
    const finalCrossing = completed.activationTimesByStation.at(-1)![0]!;
    expect(() => measurePlanarConductionVelocity({
      ...shortProtocol,
      maximumModelTime: finalCrossing - 1e-10,
    })).toThrow(/did not activate every probe/);
  });

  it('returns a deep immutable protocol snapshot independent of caller mutation', () => {
    const mutableStations = [24, 36, 48, 60, 72];
    const mutableModel = { ...defaultAlievPanfilovParameters };
    const result = measurePlanarConductionVelocity({
      ...referenceProtocol,
      solverConfig: { ...referenceProtocol.solverConfig, model: mutableModel },
      xStations: mutableStations,
    });
    mutableStations[0] = 30;
    mutableModel.a = 0.1;
    expect(result.protocol.scenario).toBe('planar-wave');
    expect(result.protocol.xStations[0]).toBe(24);
    expect(result.protocol.solverConfig.model.a).toBe(defaultAlievPanfilovParameters.a);
    expect(Object.isFrozen(result.protocol)).toBe(true);
    expect(Object.isFrozen(result.protocol.solverConfig)).toBe(true);
    expect(Object.isFrozen(result.protocol.solverConfig.grid)).toBe(true);
    expect(Object.isFrozen(result.protocol.solverConfig.model)).toBe(true);
    expect(Object.isFrozen(result.protocol.xStations)).toBe(true);
    expect(Object.isFrozen(result.protocol.yRows)).toBe(true);
  });
});
