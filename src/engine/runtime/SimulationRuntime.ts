import { configureScenario, type ScenarioController } from '../core/scenarios';
import type { ScenarioId, SignalSample } from '../core/types';
import { engineDefinitionCatalog } from '../definitions/catalog';
import type { MeasurementDefinitionV1 } from '../definitions/types';
import type { MonodomainSolver } from '../numerics/MonodomainSolver';
import { PseudoEcg } from '../signals/PseudoEcg';

interface MeasurementSampler {
  readonly definition: MeasurementDefinitionV1;
  readonly sampler: PseudoEcg;
}

export class SimulationRuntime {
  private controller: ScenarioController;
  private readonly measurementSamplers: readonly MeasurementSampler[];
  private readonly pendingSignalSamples: SignalSample[] = [];
  private currentSolverStepIndex = 0;

  constructor(readonly solver: MonodomainSolver, scenario: ScenarioId) {
    this.measurementSamplers = engineDefinitionCatalog.measurements.map((definition) => {
      const electrode = engineDefinitionCatalog.electrodes.find((candidate) => (
        candidate.id === definition.electrode.id
        && candidate.definitionVersion === definition.electrode.definitionVersion
      ));
      if (!electrode) throw new Error(`Missing electrode for measurement ${definition.id}.`);
      return {
        definition,
        sampler: new PseudoEcg(
          solver.tissue.width,
          solver.tissue.height,
          solver.config.statePrecision,
          electrode,
        ),
      };
    });
    this.controller = configureScenario(solver, scenario);
  }

  get solverStepIndex(): number {
    return this.currentSolverStepIndex;
  }

  advanceSolverSteps(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Solver batch size must be a non-negative integer.');
    }
    for (let index = 0; index < count; index += 1) {
      this.controller.beforeStep(this.solver, this.currentSolverStepIndex);
      this.solver.step();
      this.currentSolverStepIndex += 1;
      this.sampleDueMeasurements();
    }
  }

  reset(scenario: ScenarioId): void {
    this.controller = configureScenario(this.solver, scenario);
    this.currentSolverStepIndex = 0;
    this.pendingSignalSamples.length = 0;
    this.measurementSamplers.forEach(({ sampler }) => sampler.reset());
  }

  drainSignalSamples(): readonly SignalSample[] {
    const drained = this.pendingSignalSamples.map((sample) => Object.freeze({ ...sample }));
    this.pendingSignalSamples.length = 0;
    return Object.freeze(drained);
  }

  private sampleDueMeasurements(): void {
    this.measurementSamplers.forEach(({ definition, sampler }) => {
      if (this.currentSolverStepIndex % definition.sampleEverySolverSteps !== 0) return;
      this.pendingSignalSamples.push({
        measurementId: definition.id,
        solverStepIndex: this.currentSolverStepIndex,
        modelTime: this.solver.time,
        value: sampler.sample(this.solver.voltage, this.solver.tissue.mask),
      });
    });
  }
}
