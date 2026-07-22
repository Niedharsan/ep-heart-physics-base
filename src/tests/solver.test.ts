import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { configureScenario } from '../engine/core/scenarios';

function createSolver(): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 48, height: 32, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    statePrecision: 'float32',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
}

function createDiagnosticSolver(requestedDt = 1): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 8, height: 8, dx: 1 },
    diffusion: 0.001,
    requestedDt,
    statePrecision: 'float32',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
}

describe('MonodomainSolver', () => {
  it('derives a stable positive timestep', () => {
    const solver = createSolver();
    expect(solver.stableDt).toBeGreaterThan(0);
    expect(solver.stableDt).toBeLessThanOrEqual(0.08);
  });

  it('remains at rest without stimulation', () => {
    const solver = createSolver();
    for (let index = 0; index < 50; index += 1) solver.step();
    expect(Math.max(...solver.voltage)).toBeCloseTo(0, 6);
  });

  it('responds to a physical stimulus and propagates', () => {
    const solver = createSolver();
    solver.applyStimulus({ x: 8, y: 16, radius: 3, amplitude: 1 });
    const initialActive = solver.voltage.filter((value) => value > 0.5).length;
    for (let index = 0; index < 80; index += 1) solver.step();
    const laterActive = solver.voltage.filter((value) => value > 0.1).length;
    expect(initialActive).toBeGreaterThan(0);
    expect(laterActive).toBeGreaterThan(initialActive);
  });

  it('creates a non-conductive physical lesion', () => {
    const solver = createSolver();
    const lesion = solver.createLesion(24, 16, 4);
    expect(lesion.radius).toBe(4);
    expect(solver.tissue.mask[solver.tissue.index(24, 16)]).toBe(0);
    expect(solver.lesions).toHaveLength(1);
  });

  it('rejects invalid circular interactions atomically at the engine boundary', () => {
    const invalidStimuli = [
      { x: Number.NaN, y: 1, radius: 1, amplitude: 1 },
      { x: -1, y: 1, radius: 1, amplitude: 1 },
      { x: 48, y: 1, radius: 1, amplitude: 1 },
      { x: 1, y: 32, radius: 1, amplitude: 1 },
      { x: 1, y: 1, radius: 0, amplitude: 1 },
      { x: 1, y: 1, radius: Number.POSITIVE_INFINITY, amplitude: 1 },
      { x: 1, y: 1, radius: 1, amplitude: 0 },
      { x: 1, y: 1, radius: 1, amplitude: Number.NaN },
      { x: 1, y: 1, radius: 1, amplitude: 1.6 },
    ];
    invalidStimuli.forEach((stimulus) => {
      const solver = createSolver();
      const before = [...solver.voltage];
      expect(() => solver.applyStimulus(stimulus)).toThrow();
      expect([...solver.voltage]).toEqual(before);
    });

    const invalidCircles = [
      [-1, 1, 1], [48, 1, 1], [1, Number.NaN, 1], [1, 1, 0], [1, 1, Number.POSITIVE_INFINITY],
    ] as const;
    invalidCircles.forEach(([x, y, radius]) => {
      const solver = createSolver();
      const mask = [...solver.tissue.mask];
      expect(() => solver.createLesion(x, y, radius)).toThrow();
      expect([...solver.tissue.mask]).toEqual(mask);
      expect(solver.lesions).toHaveLength(0);
      expect(() => solver.addObstacle(x, y, radius)).toThrow();
      expect([...solver.tissue.mask]).toEqual(mask);
    });
  });

  it('rejects invalid rectangular stimuli before mutating voltage', () => {
    const invalid = [
      [-1, 2, 0, 4, 1],
      [0, 48, 0, 4, 1],
      [2, 1, 0, 4, 1],
      [0, 2, 4, 3, 1],
      [0, 2, 0, 4, 0],
      [0, 2, 0, 4, Number.NaN],
      [0, 2, 0, 4, 1.6],
    ] as const;
    invalid.forEach(([minimumX, maximumX, minimumY, maximumY, amplitude]) => {
      const solver = createSolver();
      expect(() => solver.applyRectangularStimulus(
        minimumX, maximumX, minimumY, maximumY, amplitude,
      )).toThrow();
      expect([...solver.voltage].every((value) => value === 0)).toBe(true);
    });
  });

  it('is deterministic for identical inputs', () => {
    const first = createSolver();
    const second = createSolver();
    const stimulus = { x: 8, y: 16, radius: 3, amplitude: 1 } as const;
    first.applyStimulus(stimulus);
    second.applyStimulus(stimulus);
    for (let index = 0; index < 100; index += 1) {
      first.step();
      second.step();
    }
    expect(Array.from(first.voltage)).toEqual(Array.from(second.voltage));
  });

  it('keeps a short sourced-preset run finite without state clipping', () => {
    const solver = createSolver();
    solver.applyStimulus({ x: 8, y: 16, radius: 3, amplitude: 1 });
    for (let index = 0; index < 500; index += 1) solver.step();
    expect(Array.from(solver.voltage).every(Number.isFinite)).toBe(true);
    expect(Array.from(solver.recovery).every(Number.isFinite)).toBe(true);
    expect(solver.diagnostics.denominatorGuardCount).toBe(0);
    expect(solver.diagnostics.voltageClipLowCount).toBe(0);
    expect(solver.diagnostics.voltageClipHighCount).toBe(0);
    expect(solver.diagnostics.recoveryClipLowCount).toBe(0);
    expect(solver.diagnostics.recoveryClipHighCount).toBe(0);
    expect(solver.stateExtrema.recoveryMaximum).toBeGreaterThan(2);
    expect(Object.isFrozen(solver.stateExtrema)).toBe(true);
  });

  it('retains voltage clipping while allowing recovery to evolve without an arbitrary cap', () => {
    const voltageHigh = createDiagnosticSolver();
    voltageHigh.voltage.fill(0.7);
    voltageHigh.step();
    expect(voltageHigh.diagnostics.voltageClipHighCount).toBeGreaterThan(0);

    const voltageAndRecoveryLow = createDiagnosticSolver(10);
    voltageAndRecoveryLow.voltage.fill(1.5);
    voltageAndRecoveryLow.recovery.fill(2);
    voltageAndRecoveryLow.step();
    expect(voltageAndRecoveryLow.diagnostics.voltageClipLowCount).toBeGreaterThan(0);
    expect(voltageAndRecoveryLow.diagnostics.recoveryClipLowCount).toBe(0);
    expect(voltageAndRecoveryLow.stateExtrema.recoveryMinimum).toBeLessThan(0);

    const recoveryHigh = createDiagnosticSolver(100);
    recoveryHigh.voltage.fill(0.8);
    recoveryHigh.recovery.fill(1);
    recoveryHigh.step();
    expect(recoveryHigh.diagnostics.recoveryClipHighCount).toBe(0);
    expect(recoveryHigh.stateExtrema.recoveryMaximum).toBeGreaterThan(2);
  });

  it('counts non-finite state before throwing and resets all diagnostics', () => {
    const solver = createDiagnosticSolver();
    solver.voltage.fill(0.7);
    solver.step();
    solver.voltage[0] = Number.NaN;
    expect(() => solver.step()).toThrow(/Non-finite solver state/);
    expect(solver.diagnostics.nonFiniteStateCount).toBe(1);
    const snapshot = solver.diagnostics;
    expect(Object.isFrozen(snapshot)).toBe(true);
    solver.reset();
    expect(solver.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    });
    expect(solver.stateExtrema).toEqual({
      voltageMinimum: 0,
      voltageMaximum: 0,
      recoveryMinimum: 0,
      recoveryMaximum: 0,
    });
  });

  it('keeps the application default focal scenario unclipped and records its range', () => {
    const solver = new MonodomainSolver({
      grid: { width: 160, height: 104, dx: 1 },
      diffusion: 0.8,
      requestedDt: 0.08,
      statePrecision: 'float32',
      model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
    });
    const scenario = configureScenario(solver, 'focal-rhythm');
    for (let step = 0; step < 500; step += 1) {
      scenario.beforeStep(solver, step);
      solver.step();
    }
    expect(solver.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    });
    expect(solver.stateExtrema.recoveryMaximum).toBeGreaterThan(2);
    expect(solver.stateExtrema.recoveryMaximum).toBeLessThan(2.645);
  });
});
