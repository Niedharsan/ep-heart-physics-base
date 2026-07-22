import type { NumericalDiagnostics, NumericalStateExtrema } from '../core/numericalDiagnostics';
import { alievPanfilovPresets, AlievPanfilovModel } from '../models/AlievPanfilov';
import { createStateArray } from '../numerics/FloatingPointState';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { calculateErrorNorms, type ErrorNorms } from './ErrorNorms';
import { analyzeObservedOrder, type ObservedOrderReport } from './ObservedOrder';

export interface ManufacturedLevelResult {
  readonly nodeCount: number;
  readonly dx: number;
  readonly dt: number;
  readonly stepCount: number;
  readonly voltageError: ErrorNorms;
  readonly recoveryError: ErrorNorms;
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export interface ManufacturedStudyResult {
  readonly spatialLevels: readonly ManufacturedLevelResult[];
  readonly temporalLevels: readonly ManufacturedLevelResult[];
  readonly spatialOrders: Readonly<{
    voltageRms: ObservedOrderReport;
    voltageMaximum: ObservedOrderReport;
    recoveryRms: ObservedOrderReport;
    recoveryMaximum: ObservedOrderReport;
  }>;
  readonly temporalOrders: Readonly<{
    voltageRms: ObservedOrderReport;
    voltageMaximum: ObservedOrderReport;
    recoveryRms: ObservedOrderReport;
    recoveryMaximum: ObservedOrderReport;
  }>;
  readonly precision: 'float64';
  readonly units: 'normalized-model-units';
}

const manufactured = Object.freeze({
  domainLength: 1,
  diffusion: 0.1,
  lambda: 1,
  voltageOffset: 0.4,
  voltageAmplitude: 0.1,
  recoveryOffset: 0.1,
  recoveryAmplitude: 0.02,
  spatialFinalTime: 0.0625,
  temporalFinalTime: 0.2,
});

export function runManufacturedReactionDiffusionStudy(): ManufacturedStudyResult {
  const spatialLevels = [17, 33, 65].map((nodeCount) => {
    const dx = manufactured.domainLength / (nodeCount - 1);
    const dt = 0.05 * dx * dx / manufactured.diffusion;
    return runLevel(nodeCount, dx, dt, manufactured.spatialFinalTime, false);
  });
  const temporalLevels = [0.02, 0.01, 0.005].map((dt) => runLevel(
    8, manufactured.domainLength / 7, dt, manufactured.temporalFinalTime, true,
  ));
  return Object.freeze({
    spatialLevels: Object.freeze(spatialLevels),
    temporalLevels: Object.freeze(temporalLevels),
    spatialOrders: createOrderSet(spatialLevels),
    temporalOrders: createOrderSet(temporalLevels),
    precision: 'float64',
    units: 'normalized-model-units',
  });
}

function runLevel(
  nodeCount: number,
  dx: number,
  dt: number,
  finalTime: number,
  spatiallyConstant: boolean,
): ManufacturedLevelResult {
  const stepCount = Math.round(finalTime / dt);
  if (Math.abs(stepCount * dt - finalTime) > 1e-12) throw new Error('Manufactured final time must align to dt.');
  const modelParameters = alievPanfilovPresets.goktepeKuhl2009Figure4Generalized;
  const solver = new MonodomainSolver({
    grid: { width: nodeCount, height: nodeCount, dx },
    diffusion: manufactured.diffusion,
    requestedDt: dt,
    stepsPerFrame: 1,
    model: modelParameters,
    statePrecision: 'float64',
  });
  if (solver.stableDt !== dt) throw new Error('Manufactured timestep was capped by the solver.');
  initializeExactState(solver, 0, spatiallyConstant);
  const sourceU = createStateArray('float64', solver.tissue.size);
  const sourceV = createStateArray('float64', solver.tissue.size);
  const sourceModel = new AlievPanfilovModel(modelParameters);
  for (let step = 0; step < stepCount; step += 1) {
    fillSource(sourceU, sourceV, solver, solver.time, spatiallyConstant, sourceModel);
    solver.step({ voltage: sourceU, recovery: sourceV });
  }
  const expectedU = createStateArray('float64', solver.tissue.size);
  const expectedV = createStateArray('float64', solver.tissue.size);
  fillExact(expectedU, expectedV, solver, finalTime, spatiallyConstant);
  return Object.freeze({
    nodeCount,
    dx,
    dt,
    stepCount,
    voltageError: calculateErrorNorms(solver.voltage, expectedU),
    recoveryError: calculateErrorNorms(solver.recovery, expectedV),
    diagnostics: solver.diagnostics,
    stateExtrema: solver.stateExtrema,
  });
}

function initializeExactState(solver: MonodomainSolver, time: number, spatiallyConstant: boolean): void {
  fillExact(solver.voltage, solver.recovery, solver, time, spatiallyConstant);
}

function fillExact(
  voltage: Float32Array | Float64Array,
  recovery: Float32Array | Float64Array,
  solver: MonodomainSolver,
  time: number,
  spatiallyConstant: boolean,
): void {
  for (let y = 0; y < solver.tissue.height; y += 1) {
    for (let x = 0; x < solver.tissue.width; x += 1) {
      const index = solver.tissue.index(x, y);
      const exact = exactState(x * solver.tissue.dx, y * solver.tissue.dx, time, spatiallyConstant);
      voltage[index] = exact.voltage;
      recovery[index] = exact.recovery;
    }
  }
}

function fillSource(
  voltageSource: Float32Array | Float64Array,
  recoverySource: Float32Array | Float64Array,
  solver: MonodomainSolver,
  time: number,
  spatiallyConstant: boolean,
  model: AlievPanfilovModel,
): void {
  const waveNumberSquared = spatiallyConstant ? 0 : 2 * Math.PI * Math.PI;
  for (let y = 0; y < solver.tissue.height; y += 1) {
    for (let x = 0; x < solver.tissue.width; x += 1) {
      const index = solver.tissue.index(x, y);
      const exact = exactState(x * solver.tissue.dx, y * solver.tissue.dx, time, spatiallyConstant);
      const [reactionU, reactionV] = model.derivatives(exact.voltage, exact.recovery);
      voltageSource[index] = (-manufactured.lambda + manufactured.diffusion * waveNumberSquared)
        * (exact.voltage - manufactured.voltageOffset) - reactionU;
      recoverySource[index] = -manufactured.lambda * (exact.recovery - manufactured.recoveryOffset) - reactionV;
    }
  }
}

function exactState(x: number, y: number, time: number, spatiallyConstant: boolean): {
  voltage: number;
  recovery: number;
} {
  const shape = spatiallyConstant ? 1 : Math.cos(Math.PI * x) * Math.cos(Math.PI * y);
  const decay = Math.exp(-manufactured.lambda * time);
  return {
    voltage: manufactured.voltageOffset + manufactured.voltageAmplitude * decay * shape,
    recovery: manufactured.recoveryOffset + manufactured.recoveryAmplitude * decay * shape,
  };
}

function createOrderSet(levels: readonly ManufacturedLevelResult[]) {
  const ratio = 2;
  return Object.freeze({
    voltageRms: analyzeObservedOrder(levels.map((level) => level.voltageError.rootMeanSquare), ratio),
    voltageMaximum: analyzeObservedOrder(levels.map((level) => level.voltageError.maximumAbsolute), ratio),
    recoveryRms: analyzeObservedOrder(levels.map((level) => level.recoveryError.rootMeanSquare), ratio),
    recoveryMaximum: analyzeObservedOrder(levels.map((level) => level.recoveryError.maximumAbsolute), ratio),
  });
}
