export type ScenarioId = 'planar-wave' | 'focal-rhythm' | 'obstacle-reentry';

export interface GridConfig {
  readonly width: number;
  readonly height: number;
  readonly dx: number;
}

export interface ModelParameters {
  readonly a: number;
  readonly b: number;
  readonly k: number;
  readonly epsilon: number;
  readonly mu1: number;
  readonly mu2: number;
}

export interface SolverConfig {
  readonly grid: GridConfig;
  readonly diffusion: number;
  readonly requestedDt: number;
  readonly stepsPerFrame: number;
  readonly model: ModelParameters;
}

export interface Stimulus {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly amplitude: number;
}

export interface Lesion {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly createdAt: number;
}

export interface EngineSnapshot {
  readonly width: number;
  readonly height: number;
  readonly time: number;
  readonly voltage: Float32Array;
  readonly tissueMask: Uint8Array;
  readonly ecgSample: number;
  readonly lesions: readonly Lesion[];
  readonly simulationStepsPerSecond: number;
  readonly diagnostics: NumericalDiagnostics;
}

export type WorkerCommand =
  | { readonly type: 'initialize'; readonly config: SolverConfig; readonly scenario: ScenarioId }
  | { readonly type: 'start' }
  | { readonly type: 'pause' }
  | { readonly type: 'reset'; readonly scenario: ScenarioId }
  | { readonly type: 'stimulate'; readonly stimulus: Stimulus }
  | { readonly type: 'ablate'; readonly lesion: Omit<Lesion, 'id' | 'createdAt'> }
  | { readonly type: 'set-speed'; readonly stepsPerFrame: number };

export type WorkerEvent =
  | { readonly type: 'ready'; readonly stableDt: number }
  | { readonly type: 'snapshot'; readonly snapshot: EngineSnapshot }
  | { readonly type: 'error'; readonly message: string };
import type { NumericalDiagnostics } from './numericalDiagnostics';
