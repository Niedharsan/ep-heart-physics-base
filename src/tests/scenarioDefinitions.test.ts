import { describe, expect, it } from 'vitest';
import { configureScenario, quantizeModelTimeToStep } from '../engine/core/scenarios';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';

function createSolver(): MonodomainSolver {
  return new MonodomainSolver({
    grid: { width: 160, height: 104, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    statePrecision: 'float32',
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  });
}

describe('compiled scenario definitions', () => {
  it('preserves the planar setup and obstacle scaffold geometry', () => {
    const planar = createSolver();
    configureScenario(planar, 'planar-wave');
    for (let y = 0; y < planar.tissue.height; y += 1) {
      expect(planar.voltage[planar.tissue.index(0, y)]).toBe(1);
      expect(planar.voltage[planar.tissue.index(2, y)]).toBe(1);
      expect(planar.voltage[planar.tissue.index(3, y)]).toBe(0);
    }

    const obstacle = createSolver();
    configureScenario(obstacle, 'obstacle-reentry');
    expect(obstacle.tissue.mask[obstacle.tissue.index(80, 52)]).toBe(0);
    expect(obstacle.voltage[obstacle.tissue.index(35, 52)]).toBe(1);
  });

  it('quantizes the focal schedule to deterministic integer solver steps', () => {
    const solver = createSolver();
    const controller = configureScenario(solver, 'focal-rhythm');
    const focalIndex = solver.tissue.index(32, Math.round(104 * 0.34));
    controller.beforeStep(solver, 0);
    expect(solver.voltage[focalIndex]).toBe(1);
    solver.voltage.fill(0);

    const repeatStep = quantizeModelTimeToStep(65, solver.stableDt);
    expect(repeatStep).toBe(813);
    controller.beforeStep(solver, repeatStep - 1);
    expect(solver.voltage[focalIndex]).toBe(0);
    controller.beforeStep(solver, repeatStep);
    expect(solver.voltage[focalIndex]).toBe(1);
  });
});
