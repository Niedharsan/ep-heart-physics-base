/// <reference lib="webworker" />

import type {
  RuntimeClockConfig,
  ScenarioId,
  SolverConfig,
  WorkerCommand,
  WorkerEvent,
} from '../core/types';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { hasStateClipping } from '../core/numericalDiagnostics';
import { SimulationRuntime } from '../runtime/SimulationRuntime';
import { createEngineSnapshot, StepRateMeter } from './SimulationTelemetry';

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let solver: MonodomainSolver | null = null;
let runtime: SimulationRuntime | null = null;
let running = false;
let solverTimer: ReturnType<typeof setInterval> | null = null;
let renderTimer: ReturnType<typeof setInterval> | null = null;
let clocks: RuntimeClockConfig = {
  solverIntervalMs: 4,
  solverStepsPerBatch: 2,
  renderIntervalMs: 16,
};
const stepRateMeter = new StepRateMeter(500, performance.now());
let warnedAboutClipping = false;

function emit(event: WorkerEvent, transfer?: Transferable[]): void {
  context.postMessage(event, transfer ?? []);
}

function stopTimer(): void {
  if (solverTimer !== null) clearInterval(solverTimer);
  if (renderTimer !== null) clearInterval(renderTimer);
  solverTimer = null;
  renderTimer = null;
}

function startTimer(): void {
  if (solverTimer === null) solverTimer = setInterval(advanceSolverClock, clocks.solverIntervalMs);
  if (renderTimer === null) renderTimer = setInterval(publishRenderClock, clocks.renderIntervalMs);
}

function emitSnapshot(): void {
  if (!solver || !runtime) throw new Error('Initialize the engine before requesting a snapshot.');
  const snapshot = createEngineSnapshot(
    solver,
    runtime.solverStepIndex,
    stepRateMeter.measure(performance.now()),
  );
  emit({ type: 'snapshot', snapshot }, [snapshot.voltage.buffer, snapshot.tissueMask.buffer]);
}

function advanceSolverClock(): void {
  if (!running || !solver || !runtime) return;
  try {
    runtime.advanceSolverSteps(clocks.solverStepsPerBatch);
    stepRateMeter.recordSteps(clocks.solverStepsPerBatch);

    if (import.meta.env.DEV && !warnedAboutClipping && hasStateClipping(solver.diagnostics)) {
      warnedAboutClipping = true;
      console.warn('EP engine numerical state clipping occurred.', solver.diagnostics);
    }
  } catch (error) {
    running = false;
    emit({ type: 'error', message: error instanceof Error ? error.message : 'Unknown simulation error.' });
  }
}

function publishRenderClock(): void {
  if (!running || !runtime) return;
  const samples = runtime.drainSignalSamples();
  if (samples.length > 0) emit({ type: 'signal-samples', samples });
  emitSnapshot();
}

function initialize(
  config: SolverConfig,
  requestedClocks: RuntimeClockConfig,
  requestedScenario: ScenarioId,
): void {
  stopTimer();
  validateRuntimeClocks(requestedClocks);
  solver = new MonodomainSolver(config);
  runtime = new SimulationRuntime(solver, requestedScenario);
  clocks = requestedClocks;
  running = false;
  warnedAboutClipping = false;
  stepRateMeter.reset(performance.now());
  emit({ type: 'ready', stableDt: solver.stableDt });
  emitSnapshot();
  startTimer();
}

context.onmessage = (message: MessageEvent<WorkerCommand>): void => {
  const command = message.data;
  try {
    switch (command.type) {
      case 'initialize':
        initialize(command.config, command.clocks, command.scenario);
        break;
      case 'start':
        running = true;
        startTimer();
        break;
      case 'pause':
        running = false;
        break;
      case 'reset':
        if (!solver || !runtime) throw new Error('Initialize the engine before resetting it.');
        running = false;
        runtime.reset(command.scenario);
        warnedAboutClipping = false;
        stepRateMeter.reset(performance.now());
        emitSnapshot();
        break;
      case 'stimulate':
        if (!runtime) throw new Error('Initialize the engine before stimulating tissue.');
        runtime.scheduleCurrentStimulus(command.stimulus);
        emitSnapshot();
        break;
      case 'ablate':
        if (!solver) throw new Error('Initialize the engine before applying ablation.');
        solver.createLesion(command.lesion.x, command.lesion.y, command.lesion.radius);
        emitSnapshot();
        break;
      case 'set-solver-steps-per-batch':
        if (!Number.isInteger(command.solverStepsPerBatch) || command.solverStepsPerBatch < 1) {
          throw new Error('Solver steps per batch must be a positive integer.');
        }
        clocks = { ...clocks, solverStepsPerBatch: Math.min(100, command.solverStepsPerBatch) };
        break;
      default: {
        const neverCommand: never = command;
        throw new Error(`Unsupported worker command: ${String(neverCommand)}`);
      }
    }
  } catch (error) {
    emit({ type: 'error', message: error instanceof Error ? error.message : 'Unknown worker command error.' });
  }
};

function validateRuntimeClocks(value: RuntimeClockConfig): void {
  if (!(value.solverIntervalMs > 0) || !Number.isFinite(value.solverIntervalMs)
    || !(value.renderIntervalMs > 0) || !Number.isFinite(value.renderIntervalMs)
    || !Number.isInteger(value.solverStepsPerBatch) || value.solverStepsPerBatch < 1) {
    throw new Error('Runtime clocks require positive finite intervals and a positive integer solver batch size.');
  }
}
