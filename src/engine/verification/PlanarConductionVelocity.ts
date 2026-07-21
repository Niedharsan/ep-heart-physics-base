import { hasStateClipping, type NumericalDiagnostics } from '../core/numericalDiagnostics';
import type { SolverConfig } from '../core/types';
import { configureScenario } from '../core/scenarios';
import { MonodomainSolver } from '../numerics/MonodomainSolver';

export interface PlanarVelocityProtocol {
  readonly solverConfig: SolverConfig;
  readonly threshold: number;
  readonly xStations: readonly number[];
  readonly yRows: readonly number[];
  readonly maximumModelTime: number;
  readonly minimumRSquared: number;
  readonly maximumPlanaritySpread: number;
}

export interface PlanarVelocityResult {
  readonly speed: number;
  readonly units: 'model-length-unit/model-time-unit';
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly protocol: PlanarVelocityProtocolSnapshot;
  readonly stableDt: number;
  readonly positions: readonly number[];
  readonly meanActivationTimes: readonly number[];
  readonly activationTimesByStation: readonly (readonly number[])[];
  readonly segmentSpeeds: readonly number[];
  readonly intercept: number;
  readonly slope: number;
  readonly rSquared: number;
  readonly residuals: readonly number[];
  readonly maximumAbsoluteResidual: number;
  readonly maximumTransverseSpread: number;
  readonly diagnostics: NumericalDiagnostics;
}

export interface PlanarVelocityProtocolSnapshot extends PlanarVelocityProtocol {
  readonly scenario: 'planar-wave';
}

export interface PlanarVelocityAnalysisInput {
  readonly positions: readonly number[];
  readonly activationTimesByStation: readonly (readonly number[])[];
  readonly minimumRSquared: number;
  readonly maximumPlanaritySpread: number;
}

export interface PlanarVelocityAnalysis extends LinearFit {
  readonly speed: number;
  readonly meanActivationTimes: readonly number[];
  readonly segmentSpeeds: readonly number[];
  readonly maximumTransverseSpread: number;
}

export interface LinearFit {
  readonly slope: number;
  readonly intercept: number;
  readonly rSquared: number;
  readonly residuals: readonly number[];
  readonly maximumAbsoluteResidual: number;
}

export function interpolateUpwardCrossing(
  previousValue: number,
  currentValue: number,
  previousTime: number,
  currentTime: number,
  threshold: number,
): number | null {
  for (const [name, value] of Object.entries({ previousValue, currentValue, previousTime, currentTime, threshold })) {
    if (!Number.isFinite(value)) throw new Error(`Activation crossing ${name} must be finite.`);
  }
  if (!(currentTime > previousTime)) throw new Error('Activation crossing currentTime must be greater than previousTime.');
  if (!(previousValue < threshold && currentValue >= threshold)) return null;
  const fraction = (threshold - previousValue) / (currentValue - previousValue);
  return previousTime + fraction * (currentTime - previousTime);
}

export function fitActivationTimes(positions: readonly number[], activationTimes: readonly number[]): LinearFit {
  if (positions.length !== activationTimes.length || positions.length < 2) {
    throw new Error('Activation fit requires equal position/time arrays with at least two points.');
  }
  if (!positions.every(Number.isFinite) || !activationTimes.every(Number.isFinite)) {
    throw new Error('Activation fit positions and times must be finite.');
  }
  for (let index = 1; index < positions.length; index += 1) {
    if (!(positions[index]! > positions[index - 1]!)) throw new Error('Activation fit positions must be strictly increasing.');
    if (!(activationTimes[index]! > activationTimes[index - 1]!)) {
      throw new Error('Activation times must be strictly increasing with position.');
    }
  }
  const meanPosition = positions.reduce((sum, value) => sum + value, 0) / positions.length;
  const meanTime = activationTimes.reduce((sum, value) => sum + value, 0) / activationTimes.length;
  let positionVariance = 0;
  let covariance = 0;
  for (let index = 0; index < positions.length; index += 1) {
    const centeredPosition = positions[index]! - meanPosition;
    positionVariance += centeredPosition * centeredPosition;
    covariance += centeredPosition * (activationTimes[index]! - meanTime);
  }
  if (!(positionVariance > 0)) throw new Error('Activation fit positions are degenerate.');
  const slope = covariance / positionVariance;
  if (!(slope > 0) || !Number.isFinite(slope)) throw new Error('Activation fit slope must be finite and positive.');
  const intercept = meanTime - slope * meanPosition;
  const residuals = activationTimes.map((time, index) => time - (intercept + slope * positions[index]!));
  const residualSumSquares = residuals.reduce((sum, value) => sum + value * value, 0);
  const totalSumSquares = activationTimes.reduce((sum, value) => {
    const centered = value - meanTime;
    return sum + centered * centered;
  }, 0);
  if (!(totalSumSquares > 0)) throw new Error('Activation fit times are degenerate.');
  return Object.freeze({
    slope,
    intercept,
    rSquared: 1 - residualSumSquares / totalSumSquares,
    residuals: Object.freeze(residuals),
    maximumAbsoluteResidual: Math.max(...residuals.map(Math.abs)),
  });
}

export function analyzePlanarActivationTimes(input: PlanarVelocityAnalysisInput): PlanarVelocityAnalysis {
  const { positions, activationTimesByStation, minimumRSquared, maximumPlanaritySpread } = input;
  if (positions.length !== activationTimesByStation.length || positions.length < 2) {
    throw new Error('Planar activation analysis requires one non-empty row collection per position.');
  }
  if (!(minimumRSquared >= 0 && minimumRSquared <= 1)) {
    throw new Error('Planar activation minimumRSquared must be between 0 and 1.');
  }
  if (!(maximumPlanaritySpread >= 0) || !Number.isFinite(maximumPlanaritySpread)) {
    throw new Error('Planar activation maximumPlanaritySpread must be finite and non-negative.');
  }
  if (activationTimesByStation.some((station) => station.length === 0 || !station.every(Number.isFinite))) {
    throw new Error('Planar activation stations must contain finite activation times.');
  }
  const rowCount = activationTimesByStation[0]!.length;
  if (activationTimesByStation.some((station) => station.length !== rowCount)) {
    throw new Error('Planar activation stations must contain equal transverse row counts.');
  }
  for (let stationIndex = 1; stationIndex < activationTimesByStation.length; stationIndex += 1) {
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      if (!(activationTimesByStation[stationIndex]![rowIndex]! > activationTimesByStation[stationIndex - 1]![rowIndex]!)) {
        throw new Error('Each planar activation row must activate strictly later at downstream stations.');
      }
    }
  }

  const meanActivationTimes = activationTimesByStation.map(
    (station) => station.reduce((sum, time) => sum + time, 0) / station.length,
  );
  const fit = fitActivationTimes(positions, meanActivationTimes);
  if (fit.rSquared < minimumRSquared) {
    throw new Error(`Planar activation fit R-squared ${fit.rSquared} is below required ${minimumRSquared}.`);
  }
  const maximumTransverseSpread = Math.max(
    ...activationTimesByStation.map((station) => Math.max(...station) - Math.min(...station)),
  );
  if (maximumTransverseSpread > maximumPlanaritySpread) {
    throw new Error(
      `Planar activation transverse spread ${maximumTransverseSpread} exceeds ${maximumPlanaritySpread}.`,
    );
  }
  const segmentSpeeds = positions.slice(1).map((position, index) => {
    const speed = (position - positions[index]!) / (meanActivationTimes[index + 1]! - meanActivationTimes[index]!);
    if (!(speed > 0) || !Number.isFinite(speed)) throw new Error('Planar segment speed must be finite and positive.');
    return speed;
  });
  return Object.freeze({
    ...fit,
    speed: 1 / fit.slope,
    meanActivationTimes: Object.freeze(meanActivationTimes),
    segmentSpeeds: Object.freeze(segmentSpeeds),
    maximumTransverseSpread,
  });
}

export function measurePlanarConductionVelocity(protocol: PlanarVelocityProtocol): PlanarVelocityResult {
  validateProtocol(protocol);
  const protocolSnapshot = copyPlanarVelocityProtocol(protocol);
  const solver = new MonodomainSolver(protocol.solverConfig);
  const scenario = configureScenario(solver, 'planar-wave');
  const probeIndices = protocol.xStations.map((x) => protocol.yRows.map((y) => solver.tissue.index(x, y)));
  const previousValues = probeIndices.map((station) => station.map((index) => solver.voltage[index]!));
  if (previousValues.some((station) => station.some((value) => value >= protocol.threshold))) {
    throw new Error('Planar velocity probes must begin below the activation threshold and outside the stimulus.');
  }
  const activationTimes: Array<Array<number | null>> = probeIndices.map((station) => station.map(() => null));
  let previousTime = solver.time;

  while (solver.time < protocol.maximumModelTime && activationTimes.some((station) => station.some((time) => time === null))) {
    scenario.beforeStep(solver);
    solver.step();
    const currentTime = solver.time;
    for (let stationIndex = 0; stationIndex < probeIndices.length; stationIndex += 1) {
      for (let rowIndex = 0; rowIndex < protocol.yRows.length; rowIndex += 1) {
        const currentValue = solver.voltage[probeIndices[stationIndex]![rowIndex]!]!;
        if (activationTimes[stationIndex]![rowIndex] === null) {
          const crossing = interpolateUpwardCrossing(
            previousValues[stationIndex]![rowIndex]!, currentValue,
            previousTime, currentTime, protocol.threshold,
          );
          if (crossing !== null && crossing <= protocol.maximumModelTime) {
            activationTimes[stationIndex]![rowIndex] = crossing;
          }
        }
        previousValues[stationIndex]![rowIndex] = currentValue;
      }
    }
    previousTime = currentTime;
    const diagnostics = solver.diagnostics;
    if (diagnostics.denominatorGuardCount > 0 || diagnostics.nonFiniteStateCount > 0) {
      throw new Error('Planar velocity measurement aborted because a denominator guard or non-finite state occurred.');
    }
  }

  const missing: string[] = [];
  for (let stationIndex = 0; stationIndex < activationTimes.length; stationIndex += 1) {
    for (let rowIndex = 0; rowIndex < activationTimes[stationIndex]!.length; rowIndex += 1) {
      if (activationTimes[stationIndex]![rowIndex] === null) {
        missing.push(`x=${protocol.xStations[stationIndex]}, y=${protocol.yRows[rowIndex]}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`Planar wave did not activate every probe by model time ${protocol.maximumModelTime}: ${missing.join('; ')}.`);
  }

  const completedTimes = activationTimes.map((station) => station.map((time) => time as number));
  const positions = protocol.xStations.map((x) => x * protocol.solverConfig.grid.dx);
  const analysis = analyzePlanarActivationTimes({
    positions,
    activationTimesByStation: completedTimes,
    minimumRSquared: protocol.minimumRSquared,
    maximumPlanaritySpread: protocol.maximumPlanaritySpread,
  });
  const diagnostics = solver.diagnostics;
  return Object.freeze({
    speed: analysis.speed,
    units: 'model-length-unit/model-time-unit',
    safeguardStatus: hasStateClipping(diagnostics) ? 'clipped' : 'unclipped',
    protocol: protocolSnapshot,
    stableDt: solver.stableDt,
    positions: Object.freeze(positions),
    meanActivationTimes: analysis.meanActivationTimes,
    activationTimesByStation: Object.freeze(completedTimes.map((station) => Object.freeze(station))),
    segmentSpeeds: analysis.segmentSpeeds,
    intercept: analysis.intercept,
    slope: analysis.slope,
    rSquared: analysis.rSquared,
    residuals: analysis.residuals,
    maximumAbsoluteResidual: analysis.maximumAbsoluteResidual,
    maximumTransverseSpread: analysis.maximumTransverseSpread,
    diagnostics,
  });
}

function validateProtocol(protocol: PlanarVelocityProtocol): void {
  const { width, height, dx } = protocol.solverConfig.grid;
  if (!Number.isFinite(protocol.threshold)) throw new Error('Planar velocity threshold must be finite.');
  if (!(protocol.maximumModelTime > 0) || !Number.isFinite(protocol.maximumModelTime)) {
    throw new Error('Planar velocity maximumModelTime must be finite and positive.');
  }
  if (!(protocol.minimumRSquared >= 0 && protocol.minimumRSquared <= 1)) {
    throw new Error('Planar velocity minimumRSquared must be between 0 and 1.');
  }
  if (!(protocol.maximumPlanaritySpread >= 0) || !Number.isFinite(protocol.maximumPlanaritySpread)) {
    throw new Error('Planar velocity maximumPlanaritySpread must be finite and non-negative.');
  }
  if (!(dx > 0) || !Number.isFinite(dx)) throw new Error('Planar velocity grid spacing must be finite and positive.');
  if (protocol.xStations.length < 3) throw new Error('Planar velocity protocol requires at least three x stations.');
  if (protocol.yRows.length < 1) throw new Error('Planar velocity protocol requires at least one y row.');
  for (let index = 0; index < protocol.xStations.length; index += 1) {
    const x = protocol.xStations[index]!;
    if (!Number.isInteger(x) || x <= 0 || x >= width - 1) {
      throw new Error(`Planar velocity x station ${x} must be an interior cell.`);
    }
    if (index > 0 && !(x > protocol.xStations[index - 1]!)) {
      throw new Error('Planar velocity x stations must be strictly increasing.');
    }
  }
  for (const y of protocol.yRows) {
    if (!Number.isInteger(y) || y <= 0 || y >= height - 1) {
      throw new Error(`Planar velocity y row ${y} must be an interior cell.`);
    }
  }
  if (new Set(protocol.yRows).size !== protocol.yRows.length) {
    throw new Error('Planar velocity y rows must be distinct.');
  }
}

function copyPlanarVelocityProtocol(protocol: PlanarVelocityProtocol): PlanarVelocityProtocolSnapshot {
  const solverConfig = Object.freeze({
    grid: Object.freeze({ ...protocol.solverConfig.grid }),
    diffusion: protocol.solverConfig.diffusion,
    requestedDt: protocol.solverConfig.requestedDt,
    stepsPerFrame: protocol.solverConfig.stepsPerFrame,
    model: Object.freeze({ ...protocol.solverConfig.model }),
  });
  return Object.freeze({
    scenario: 'planar-wave',
    solverConfig,
    threshold: protocol.threshold,
    xStations: Object.freeze([...protocol.xStations]),
    yRows: Object.freeze([...protocol.yRows]),
    maximumModelTime: protocol.maximumModelTime,
    minimumRSquared: protocol.minimumRSquared,
    maximumPlanaritySpread: protocol.maximumPlanaritySpread,
  });
}
