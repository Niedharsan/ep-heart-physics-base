import type { NumericalDiagnostics } from '../core/numericalDiagnostics';
import { alievPanfilovPresets, AlievPanfilovModel } from '../models/AlievPanfilov';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { calculateErrorNorms, type ErrorNorms } from './ErrorNorms';

export interface AnalyticDiffusionResult {
  readonly nodeCount: number;
  readonly dx: number;
  readonly dt: number;
  readonly finalTime: number;
  readonly voltageError: ErrorNorms;
  readonly recoveryError: ErrorNorms;
  readonly diagnostics: NumericalDiagnostics;
  readonly precision: 'float64';
}

const domainLength = 1;
const diffusion = 0.1;
const voltageOffset = 0.4;
const voltageAmplitude = 0.1;

/**
 * Evolves a cosine Neumann eigenmode under diffusion alone. Model reaction is
 * cancelled at each explicit step by a verification-only source term.
 */
export function runAnalyticDiffusionDecay(): AnalyticDiffusionResult {
  const nodeCount = 33;
  const dx = domainLength / (nodeCount - 1);
  const dt = 0.00025;
  const finalTime = 0.05;
  const solver = new MonodomainSolver({
    grid: { width: nodeCount, height: nodeCount, dx },
    diffusion,
    requestedDt: dt,
    stepsPerFrame: 1,
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
    statePrecision: 'float64',
  });
  if (solver.stableDt !== dt) throw new Error('Analytic diffusion timestep was capped by the solver.');
  const model = new AlievPanfilovModel(alievPanfilovPresets.goktepeKuhl2009Figure4Generalized);
  const voltageSource = new Float64Array(solver.tissue.size);
  const recoverySource = new Float64Array(solver.tissue.size);
  for (let y = 0; y < nodeCount; y += 1) {
    for (let x = 0; x < nodeCount; x += 1) {
      const index = solver.tissue.index(x, y);
      solver.voltage[index] = exactVoltage(x * dx, y * dx, 0);
    }
  }
  const stepCount = Math.round(finalTime / dt);
  for (let step = 0; step < stepCount; step += 1) {
    for (let index = 0; index < solver.tissue.size; index += 1) {
      const [reactionU, reactionV] = model.derivatives(solver.voltage[index]!, solver.recovery[index]!);
      voltageSource[index] = -reactionU;
      recoverySource[index] = -reactionV;
    }
    solver.step({ voltage: voltageSource, recovery: recoverySource });
  }
  const expectedVoltage = new Float64Array(solver.tissue.size);
  const expectedRecovery = new Float64Array(solver.tissue.size);
  for (let y = 0; y < nodeCount; y += 1) {
    for (let x = 0; x < nodeCount; x += 1) {
      expectedVoltage[solver.tissue.index(x, y)] = exactVoltage(x * dx, y * dx, finalTime);
    }
  }
  return Object.freeze({
    nodeCount,
    dx,
    dt,
    finalTime,
    voltageError: calculateErrorNorms(solver.voltage, expectedVoltage),
    recoveryError: calculateErrorNorms(solver.recovery, expectedRecovery),
    diagnostics: solver.diagnostics,
    precision: 'float64',
  });
}

function exactVoltage(x: number, y: number, time: number): number {
  return voltageOffset + voltageAmplitude
    * Math.exp(-2 * Math.PI * Math.PI * diffusion * time)
    * Math.cos(Math.PI * x) * Math.cos(Math.PI * y);
}
