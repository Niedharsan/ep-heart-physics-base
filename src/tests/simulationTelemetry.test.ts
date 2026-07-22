import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { createEngineSnapshot, StepRateMeter } from '../engine/workers/SimulationTelemetry';

function createSolver(): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 16, height: 12, dx: 0.5 },
    diffusion: 0.8,
    requestedDt: 0.02,
    stepsPerFrame: 1,
    statePrecision: 'float32',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
}

describe('simulation telemetry', () => {
  it('resets every performance counter and excludes pre-reset steps', () => {
    const meter = new StepRateMeter(500, 0);
    meter.recordSteps(100);
    expect(meter.measure(500)).toBe(200);
    meter.recordSteps(50);
    meter.reset(600);
    expect(meter.measure(900)).toBe(0);
    meter.recordSteps(10);
    expect(meter.measure(1100)).toBe(20);
  });

  it('creates an independent fresh snapshot with grid spacing and zero reset rate', () => {
    const solver = createSolver();
    solver.applyStimulus({ x: 3, y: 4, radius: 1, amplitude: 1 });
    solver.step();
    solver.reset();
    const snapshot = createEngineSnapshot(solver, 0, 0);
    expect(snapshot.time).toBe(0);
    expect(snapshot.dx).toBe(0.5);
    expect(snapshot.simulationStepsPerSecond).toBe(0);
    expect(snapshot.voltage).not.toBe(solver.voltage);
    expect(snapshot.tissueMask).not.toBe(solver.tissue.mask);
    expect([...snapshot.voltage].every((value) => value === 0)).toBe(true);
  });
});
