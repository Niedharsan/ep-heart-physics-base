import { configureScenario, type ScenarioController } from '../core/scenarios';
import type { CurrentStimulus, ScenarioId, SignalSample } from '../core/types';
import { engineDefinitionCatalog } from '../definitions/catalog';
import type { MeasurementDefinitionV1 } from '../definitions/types';
import {
  validateCircularRegion,
  validateFinitePositive,
} from '../geometry/SpatialInputValidation';
import {
  writeCircularStimulusCurrent,
} from '../numerics/CircularStimulusCurrent';
import { createStateArray, type FloatingPointState } from '../numerics/FloatingPointState';
import type { MonodomainSolver } from '../numerics/MonodomainSolver';
import { PseudoEcg } from '../signals/PseudoEcg';

interface MeasurementSampler {
  readonly definition: MeasurementDefinitionV1;
  readonly sampler: PseudoEcg;
}

interface ActiveCurrentPulse {
  readonly stimulus: CurrentStimulus;
  readonly onsetStep: number;
  readonly endStepExclusive: number;
}

export class SimulationRuntime {
  private controller: ScenarioController;
  private readonly measurementSamplers: readonly MeasurementSampler[];
  private readonly pendingSignalSamples: SignalSample[] = [];
  private readonly voltageCurrentSource: FloatingPointState;
  private readonly recoveryCurrentSource: FloatingPointState;
  private activeCurrentPulses: ActiveCurrentPulse[] = [];
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
    this.voltageCurrentSource = createStateArray(solver.config.statePrecision, solver.tissue.size);
    this.recoveryCurrentSource = createStateArray(solver.config.statePrecision, solver.tissue.size);
    this.controller = configureScenario(solver, scenario);
  }

  get solverStepIndex(): number {
    return this.currentSolverStepIndex;
  }

  get activeCurrentPulseCount(): number {
    return this.activeCurrentPulses.length;
  }

  scheduleCurrentStimulus(stimulus: CurrentStimulus): void {
    validateCircularRegion(
      stimulus.x,
      stimulus.y,
      stimulus.radius,
      this.solver.tissue.width,
      this.solver.tissue.height,
      'Current stimulus',
    );
    validateFinitePositive(stimulus.amplitude, 'Current-stimulus amplitude');
    validateFinitePositive(stimulus.durationModelTime, 'Current-stimulus duration');

    const durationSteps = Math.max(
      1,
      Math.ceil(stimulus.durationModelTime / this.solver.stableDt),
    );
    this.activeCurrentPulses.push({
      stimulus: Object.freeze({ ...stimulus }),
      onsetStep: this.currentSolverStepIndex,
      endStepExclusive: this.currentSolverStepIndex + durationSteps,
    });
  }

  advanceSolverSteps(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Solver batch size must be a non-negative integer.');
    }

    for (let index = 0; index < count; index += 1) {
      const hasCurrentSource = this.prepareCurrentSource(this.currentSolverStepIndex);
      this.controller.beforeStep(this.solver, this.currentSolverStepIndex);
      this.solver.step(hasCurrentSource ? {
        voltage: this.voltageCurrentSource,
        recovery: this.recoveryCurrentSource,
      } : undefined);
      this.currentSolverStepIndex += 1;
      this.activeCurrentPulses = this.activeCurrentPulses.filter(
        (pulse) => pulse.endStepExclusive > this.currentSolverStepIndex,
      );
      this.sampleDueMeasurements();
    }
  }

  reset(scenario: ScenarioId): void {
    this.controller = configureScenario(this.solver, scenario);
    this.currentSolverStepIndex = 0;
    this.pendingSignalSamples.length = 0;
    this.activeCurrentPulses = [];
    this.voltageCurrentSource.fill(0);
    this.recoveryCurrentSource.fill(0);
    this.measurementSamplers.forEach(({ sampler }) => sampler.reset());
  }

  drainSignalSamples(): readonly SignalSample[] {
    const drained = this.pendingSignalSamples.map((sample) => Object.freeze({ ...sample }));
    this.pendingSignalSamples.length = 0;
    return Object.freeze(drained);
  }

  private prepareCurrentSource(stepIndex: number): boolean {
    this.voltageCurrentSource.fill(0);
    this.recoveryCurrentSource.fill(0);
    let hasCurrentSource = false;

    this.activeCurrentPulses.forEach((pulse) => {
      if (stepIndex < pulse.onsetStep || stepIndex >= pulse.endStepExclusive) return;
      writeCircularStimulusCurrent(
        this.voltageCurrentSource,
        this.solver.tissue.mask,
        this.solver.tissue.width,
        this.solver.tissue.height,
        pulse.stimulus,
        pulse.stimulus.amplitude,
      );
      hasCurrentSource = true;
    });

    return hasCurrentSource;
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
