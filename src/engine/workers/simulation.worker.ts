/// <reference lib="webworker" />

import type { ScenarioId, SolverConfig, WorkerCommand, WorkerEvent } from '../core/types';
import { configureScenario, type ScenarioController } from '../core/scenarios';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { hasStateClipping } from '../core/numericalDiagnostics';
import { createEngineSnapshot, StepRateMeter } from './SimulationTelemetry';

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let solver: MonodomainSolver | null = null;
let scenario: ScenarioId = 'focal-rhythm';
let controller: ScenarioController | null = null;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;
let stepsPerFrame = 8;
const stepRateMeter = new StepRateMeter(500, performance.now());
let warnedAboutClipping = false;

function emit(event: WorkerEvent, transfer?: Transferable[]): void {
  context.postMessage(event, transfer ?? []);
}

function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer(): void {
  if (timer !== null) return;
  timer = setInterval(tick, 16);
}

function emitSnapshot(ecgSample = 0): void {
  if (!solver) throw new Error('Initialize the engine before requesting a snapshot.');
  const snapshot = createEngineSnapshot(solver, ecgSample, stepRateMeter.measure(performance.now()));
  emit({ type: 'snapshot', snapshot }, [snapshot.voltage.buffer, snapshot.tissueMask.buffer]);
}

function tick(): void {
  if (!running || !solver || !controller) return;
  let ecgSample = 0;

  try {
    for (let step = 0; step < stepsPerFrame; step += 1) {
      controller.beforeStep(solver);
      ecgSample = solver.step();
      stepRateMeter.recordSteps(1);
    }

    if (import.meta.env.DEV && !warnedAboutClipping && hasStateClipping(solver.diagnostics)) {
      warnedAboutClipping = true;
      console.warn('EP engine numerical state clipping occurred.', solver.diagnostics);
    }

    emitSnapshot(ecgSample);
  } catch (error) {
    running = false;
    emit({ type: 'error', message: error instanceof Error ? error.message : 'Unknown simulation error.' });
  }
}

function initialize(config: SolverConfig, requestedScenario: ScenarioId): void {
  stopTimer();
  solver = new MonodomainSolver(config);
  scenario = requestedScenario;
  controller = configureScenario(solver, scenario);
  stepsPerFrame = config.stepsPerFrame;
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
        initialize(command.config, command.scenario);
        break;
      case 'start':
        running = true;
        startTimer();
        break;
      case 'pause':
        running = false;
        break;
      case 'reset':
        if (!solver) throw new Error('Initialize the engine before resetting it.');
        running = false;
        scenario = command.scenario;
        controller = configureScenario(solver, scenario);
        warnedAboutClipping = false;
        stepRateMeter.reset(performance.now());
        emitSnapshot();
        break;
      case 'stimulate':
        if (!solver) throw new Error('Initialize the engine before stimulating tissue.');
        solver.applyStimulus(command.stimulus);
        break;
      case 'ablate':
        if (!solver) throw new Error('Initialize the engine before applying ablation.');
        solver.createLesion(command.lesion.x, command.lesion.y, command.lesion.radius);
        break;
      case 'set-speed':
        if (!(command.stepsPerFrame > 0) || !Number.isFinite(command.stepsPerFrame)) {
          throw new Error('Steps per frame must be finite and positive.');
        }
        stepsPerFrame = Math.max(1, Math.min(100, Math.round(command.stepsPerFrame)));
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
