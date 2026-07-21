/// <reference lib="webworker" />

import type { ScenarioId, SolverConfig, WorkerCommand, WorkerEvent } from '../core/types';
import { configureScenario, type ScenarioController } from '../core/scenarios';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { hasStateClipping } from '../core/numericalDiagnostics';

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let solver: MonodomainSolver | null = null;
let scenario: ScenarioId = 'focal-rhythm';
let controller: ScenarioController | null = null;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;
let stepsPerFrame = 8;
let lastFrameAt = performance.now();
let stepsSinceMeasurement = 0;
let measuredStepsPerSecond = 0;
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

function tick(): void {
  if (!running || !solver || !controller) return;
  let ecgSample = 0;

  try {
    for (let step = 0; step < stepsPerFrame; step += 1) {
      controller.beforeStep(solver);
      ecgSample = solver.step();
      stepsSinceMeasurement += 1;
    }

    if (import.meta.env.DEV && !warnedAboutClipping && hasStateClipping(solver.diagnostics)) {
      warnedAboutClipping = true;
      console.warn('EP engine numerical state clipping occurred.', solver.diagnostics);
    }

    const now = performance.now();
    const elapsed = now - lastFrameAt;
    if (elapsed >= 500) {
      measuredStepsPerSecond = (stepsSinceMeasurement * 1000) / elapsed;
      stepsSinceMeasurement = 0;
      lastFrameAt = now;
    }

    const voltageCopy = new Float32Array(solver.voltage);
    const maskCopy = new Uint8Array(solver.tissue.mask);
    emit(
      {
        type: 'snapshot',
        snapshot: {
          width: solver.tissue.width,
          height: solver.tissue.height,
          time: solver.time,
          voltage: voltageCopy,
          tissueMask: maskCopy,
          ecgSample,
          lesions: [...solver.lesions],
          simulationStepsPerSecond: measuredStepsPerSecond,
          diagnostics: solver.diagnostics,
        },
      },
      [voltageCopy.buffer, maskCopy.buffer],
    );
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
  emit({ type: 'ready', stableDt: solver.stableDt });
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
        scenario = command.scenario;
        controller = configureScenario(solver, scenario);
        warnedAboutClipping = false;
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
