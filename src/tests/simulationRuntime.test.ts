import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { SimulationRuntime } from '../engine/runtime/SimulationRuntime';

function createRuntime(): SimulationRuntime {
  const solver = new MonodomainSolver({
    grid: { width: 40, height: 28, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    statePrecision: 'float32',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
  return new SimulationRuntime(solver, 'focal-rhythm');
}

describe('SimulationRuntime scientific clocks', () => {
  it('is deterministic and invariant to solver batch and render-drain grouping', () => {
    const oneBatch = createRuntime();
    oneBatch.advanceSolverSteps(40);
    const oneBatchSamples = oneBatch.drainSignalSamples();

    const grouped = createRuntime();
    const groupedSamples = [];
    for (const batch of [3, 7, 1, 11, 18]) {
      grouped.advanceSolverSteps(batch);
      groupedSamples.push(...grouped.drainSignalSamples());
    }

    expect(grouped.solverStepIndex).toBe(40);
    expect(grouped.solver.time).toBe(oneBatch.solver.time);
    expect([...grouped.solver.voltage]).toEqual([...oneBatch.solver.voltage]);
    expect(groupedSamples).toEqual(oneBatchSamples);
    expect(oneBatchSamples).toHaveLength(40);
    expect(oneBatchSamples.map((sample) => sample.solverStepIndex))
      .toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
  });

  it('keeps publication passive and reset clears state, history and backlog', () => {
    const runtime = createRuntime();
    runtime.advanceSolverSteps(8);
    const timeBeforeDrain = runtime.solver.time;
    const stateBeforeDrain = [...runtime.solver.voltage];
    expect(runtime.drainSignalSamples()).toHaveLength(8);
    expect(runtime.drainSignalSamples()).toEqual([]);
    expect(runtime.solver.time).toBe(timeBeforeDrain);
    expect([...runtime.solver.voltage]).toEqual(stateBeforeDrain);

    runtime.advanceSolverSteps(2);
    runtime.reset('planar-wave');
    expect(runtime.solverStepIndex).toBe(0);
    expect(runtime.solver.time).toBe(0);
    expect(runtime.drainSignalSamples()).toEqual([]);
    runtime.advanceSolverSteps(1);
    expect(runtime.drainSignalSamples()[0]).toMatchObject({
      measurementId: 'pseudo-ecg-primary',
      solverStepIndex: 1,
      modelTime: runtime.solver.stableDt,
    });
  });

  it('rejects invalid solver batch counts', () => {
    const runtime = createRuntime();
    expect(() => runtime.advanceSolverSteps(-1)).toThrow(/non-negative integer/);
    expect(() => runtime.advanceSolverSteps(1.5)).toThrow(/non-negative integer/);
  });
});
