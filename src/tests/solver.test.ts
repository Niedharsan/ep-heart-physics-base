import { describe, expect, it } from 'vitest';
import { defaultAlievPanfilovParameters } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { configureScenario } from '../engine/core/scenarios';

function createSolver(): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 48, height: 32, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    stepsPerFrame: 4,
    model: defaultAlievPanfilovParameters,
  });
}

function createDiagnosticSolver(requestedDt = 1): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 8, height: 8, dx: 1 },
    diffusion: 0.001,
    requestedDt,
    stepsPerFrame: 1,
    model: defaultAlievPanfilovParameters,
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

  it('keeps a short default run finite while exposing safeguard activation', () => {
    const solver = createSolver();
    solver.applyStimulus({ x: 8, y: 16, radius: 3, amplitude: 1 });
    for (let index = 0; index < 500; index += 1) solver.step();
    expect(Array.from(solver.voltage).every(Number.isFinite)).toBe(true);
    expect(Array.from(solver.recovery).every(Number.isFinite)).toBe(true);
    expect(solver.diagnostics.denominatorGuardCount).toBe(0);
    expect(solver.diagnostics.voltageClipLowCount).toBe(0);
    expect(solver.diagnostics.voltageClipHighCount).toBe(0);
    expect(solver.diagnostics.recoveryClipLowCount).toBe(0);
    // This is a bounded-output regression check, not evidence that the
    // unconstrained PDE/ODE is stable: the diagnostic makes clipping explicit.
    expect(solver.diagnostics.recoveryClipHighCount).toBeGreaterThan(0);
  });

  it('reports each unchanged state-clipping safeguard separately', () => {
    const voltageHigh = createDiagnosticSolver();
    voltageHigh.voltage.fill(0.7);
    voltageHigh.step();
    expect(voltageHigh.diagnostics.voltageClipHighCount).toBeGreaterThan(0);

    const voltageAndRecoveryLow = createDiagnosticSolver(10);
    voltageAndRecoveryLow.voltage.fill(1.5);
    voltageAndRecoveryLow.recovery.fill(2);
    voltageAndRecoveryLow.step();
    expect(voltageAndRecoveryLow.diagnostics.voltageClipLowCount).toBeGreaterThan(0);
    expect(voltageAndRecoveryLow.diagnostics.recoveryClipLowCount).toBeGreaterThan(0);

    const recoveryHigh = createDiagnosticSolver(100);
    recoveryHigh.voltage.fill(0.8);
    recoveryHigh.step();
    expect(recoveryHigh.diagnostics.recoveryClipHighCount).toBeGreaterThan(0);
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
  });

  it('reports safeguard use in the application default focal scenario', () => {
    const solver = new MonodomainSolver({
      grid: { width: 160, height: 104, dx: 1 },
      diffusion: 0.8,
      requestedDt: 0.08,
      stepsPerFrame: 8,
      model: defaultAlievPanfilovParameters,
    });
    const scenario = configureScenario(solver, 'focal-rhythm');
    for (let step = 0; step < 500; step += 1) {
      scenario.beforeStep(solver);
      solver.step();
    }
    // Characterization sentinel for unchanged PR1 behavior, not a scientific
    // validation target. Later calibration work is expected to revisit it.
    expect(solver.diagnostics).toEqual({
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 99_714,
      nonFiniteStateCount: 0,
    });
  });
});
