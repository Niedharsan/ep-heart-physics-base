import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { writeCircularStimulusCurrent } from '../engine/numerics/CircularStimulusCurrent';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { SimulationRuntime } from '../engine/runtime/SimulationRuntime';

function createRuntime(): SimulationRuntime {
  const solver = new MonodomainSolver({
    grid: { width: 64, height: 48, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    statePrecision: 'float64',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
  return new SimulationRuntime(solver, 'manual-pacing');
}

describe('manual finite-duration current pacing', () => {
  it('has no hidden automatic source', () => {
    const runtime = createRuntime();
    runtime.advanceSolverSteps(20);
    expect([...runtime.solver.voltage].every((value) => value === 0)).toBe(true);
    expect([...runtime.solver.recovery].every((value) => value === 0)).toBe(true);
  });

  it('queues simultaneous sites without directly overwriting voltage state', () => {
    const runtime = createRuntime();
    const first = { x: 16, y: 16, radius: 3, amplitude: 4, durationModelTime: 0.24 };
    const second = { x: 48, y: 32, radius: 3, amplitude: 4, durationModelTime: 0.24 };

    runtime.scheduleCurrentStimulus(first);
    runtime.scheduleCurrentStimulus(second);

    const firstIndex = runtime.solver.tissue.index(first.x, first.y);
    const secondIndex = runtime.solver.tissue.index(second.x, second.y);
    expect(runtime.solver.voltage[firstIndex]).toBe(0);
    expect(runtime.solver.voltage[secondIndex]).toBe(0);
    expect(runtime.activeCurrentPulseCount).toBe(2);

    runtime.advanceSolverSteps(1);
    expect(runtime.solver.voltage[firstIndex]).toBeCloseTo(0.32, 12);
    expect(runtime.solver.voltage[secondIndex]).toBeCloseTo(0.32, 12);

    const durationSteps = Math.max(
      1,
      Math.ceil(first.durationModelTime / runtime.solver.stableDt),
    );
    runtime.advanceSolverSteps(durationSteps - 1);
    expect(runtime.activeCurrentPulseCount).toBe(0);
  });

  it('clears queued pulses on reset', () => {
    const runtime = createRuntime();
    runtime.scheduleCurrentStimulus({
      x: 20,
      y: 20,
      radius: 3,
      amplitude: 4,
      durationModelTime: 0.24,
    });
    runtime.reset('manual-pacing');
    runtime.advanceSolverSteps(1);
    expect([...runtime.solver.voltage].every((value) => value === 0)).toBe(true);
  });

  it('writes circular current only into conductive nodes', () => {
    const width = 9;
    const height = 9;
    const target = new Float64Array(width * height);
    const mask = new Uint8Array(width * height).fill(1);
    const center = 4 * width + 4;
    mask[center] = 0;

    writeCircularStimulusCurrent(target, mask, width, height, {
      x: 4,
      y: 4,
      radius: 2,
    }, 3);

    expect(target[center]).toBe(0);
    expect(target[4 * width + 5]).toBe(3);
    expect(target.filter((value) => value !== 0).length).toBeGreaterThan(0);
  });
});
