import type { ScenarioId } from './types';
import type { MonodomainSolver } from '../numerics/MonodomainSolver';
import { engineDefinitionCatalog } from '../definitions/catalog';
import type { ScenarioActionV1, ScenarioDefinitionV1 } from '../definitions/types';

export interface ScenarioController {
  beforeStep(solver: MonodomainSolver, solverStepIndex: number): void;
}

export function configureScenario(solver: MonodomainSolver, scenario: ScenarioId): ScenarioController {
  solver.reset();
  const definition = getScenarioDefinition(scenario);
  definition.setup.forEach((action) => applyScenarioAction(solver, action));
  const scheduled = definition.schedule.map((entry) => ({
    action: entry.action,
    startStep: quantizeModelTimeToStep(entry.startModelTime, solver.stableDt),
    repeatEverySteps: entry.repeatEveryModelTime === undefined
      ? undefined
      : Math.max(1, quantizeModelTimeToStep(entry.repeatEveryModelTime, solver.stableDt)),
  }));

  return {
    beforeStep(currentSolver, solverStepIndex): void {
      scheduled.forEach((entry) => {
        const afterStart = solverStepIndex >= entry.startStep;
        const isDue = entry.repeatEverySteps === undefined
          ? solverStepIndex === entry.startStep
          : afterStart && (solverStepIndex - entry.startStep) % entry.repeatEverySteps === 0;
        if (isDue) applyScenarioAction(currentSolver, entry.action);
      });
    },
  };
}

export function quantizeModelTimeToStep(modelTime: number, stableDt: number): number {
  if (!(modelTime >= 0) || !Number.isFinite(modelTime)) {
    throw new Error('Scenario model time must be finite and non-negative.');
  }
  if (!(stableDt > 0) || !Number.isFinite(stableDt)) {
    throw new Error('Scenario timestep must be finite and positive.');
  }
  return Math.ceil(modelTime / stableDt);
}

function getScenarioDefinition(scenario: ScenarioId): ScenarioDefinitionV1 {
  const definition = engineDefinitionCatalog.scenarios.find((candidate) => candidate.id === scenario);
  if (!definition) throw new Error(`Unknown scenario definition ${scenario}.`);
  return definition;
}

function applyScenarioAction(solver: MonodomainSolver, action: ScenarioActionV1): void {
  if (action.type === 'rectangular-direct-stimulus') {
    solver.applyRectangularStimulus(
      normalizedGridIndex(action.normalizedMinimumX, solver.tissue.width),
      normalizedGridIndex(action.normalizedMaximumX, solver.tissue.width),
      normalizedGridIndex(action.normalizedMinimumY, solver.tissue.height),
      normalizedGridIndex(action.normalizedMaximumY, solver.tissue.height),
      action.amplitude,
    );
    return;
  }

  const x = normalizedGridIndex(action.normalizedX, solver.tissue.width);
  const y = normalizedGridIndex(action.normalizedY, solver.tissue.height);
  const radius = action.radiusFractionOfMinimumExtent
    * Math.min(solver.tissue.width, solver.tissue.height);
  if (action.type === 'circular-obstacle') {
    solver.addObstacle(x, y, radius);
  } else {
    solver.applyStimulus({ x, y, radius, amplitude: action.amplitude });
  }
}

function normalizedGridIndex(value: number, size: number): number {
  return Math.min(size - 1, value * size);
}
