import type { ScenarioId } from './types';
import type { MonodomainSolver } from '../numerics/MonodomainSolver';

export interface ScenarioController {
  beforeStep(solver: MonodomainSolver): void;
}

export function configureScenario(solver: MonodomainSolver, scenario: ScenarioId): ScenarioController {
  solver.reset();

  if (scenario === 'obstacle-reentry') {
    solver.addObstacle(solver.tissue.width * 0.5, solver.tissue.height * 0.5, Math.min(solver.tissue.width, solver.tissue.height) * 0.12);
    solver.applyStimulus({
      x: solver.tissue.width * 0.22,
      y: solver.tissue.height * 0.5,
      radius: 4,
      amplitude: 1,
    });
  }

  if (scenario === 'planar-wave') {
    solver.applyRectangularStimulus(0, 2, 0, solver.tissue.height - 1, 1);
  }

  let lastStimulusTime = -Infinity;
  return {
    beforeStep(currentSolver): void {
      if (scenario === 'focal-rhythm' && currentSolver.time - lastStimulusTime >= 65) {
        currentSolver.applyStimulus({
          x: currentSolver.tissue.width * 0.2,
          y: currentSolver.tissue.height * 0.34,
          radius: 3,
          amplitude: 1,
        });
        lastStimulusTime = currentSolver.time;
      }
    },
  };
}
