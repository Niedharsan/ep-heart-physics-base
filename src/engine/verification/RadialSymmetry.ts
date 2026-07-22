import {
  hasStateClipping,
  type NumericalDiagnostics,
  type NumericalStateExtrema,
} from '../core/numericalDiagnostics';
import type { SolverConfig } from '../core/types';
import { alievPanfilovPresets } from '../models/AlievPanfilov';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { interpolateUpwardCrossing } from './ActivationTime';
import { physicalCoordinateToGridIndex, snapGridCoordinate } from './PhysicalCoordinates';

export interface RadialSymmetryProtocol {
  readonly solverConfig: SolverConfig;
  readonly centerX: number;
  readonly centerY: number;
  readonly stimulusRadius: number;
  readonly sampleRadii: readonly [number, number];
  readonly angleCount: number;
  readonly threshold: number;
  readonly maximumModelTime: number;
  readonly maximumDirectionalSpeedDeviation: number;
  readonly maximumOuterActivationSpread: number;
}

export interface BilinearSample {
  readonly physicalX: number;
  readonly physicalY: number;
  readonly gridX: number;
  readonly gridY: number;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly cornerIndices: readonly [number, number, number, number];
}

export interface RadialSymmetryAnalysisInput {
  readonly sampleRadii: readonly [number, number];
  readonly activationTimesByRadius: readonly [readonly number[], readonly number[]];
  readonly maximumDirectionalSpeedDeviation: number;
  readonly maximumOuterActivationSpread: number;
}

export interface RadialSymmetryAnalysis {
  readonly directionalSpeeds: readonly number[];
  readonly meanDirectionalSpeed: number;
  readonly maximumRelativeSpeedDeviation: number;
  readonly activationSpreads: readonly [number, number];
}

export interface RadialSymmetryResult extends RadialSymmetryAnalysis {
  readonly units: 'model-length-unit/model-time-unit';
  readonly protocol: RadialSymmetryProtocol & { readonly scenario: 'radial-wave-verification' };
  readonly stableDt: number;
  readonly angles: readonly number[];
  readonly samplesByRadius: readonly (readonly BilinearSample[])[];
  readonly activationTimesByRadius: readonly [readonly number[], readonly number[]];
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export const defaultRadialSymmetryProtocol: RadialSymmetryProtocol = Object.freeze({
  solverConfig: Object.freeze({
    grid: Object.freeze({ width: 97, height: 97, dx: 0.5 }),
    diffusion: 0.8,
    requestedDt: 0.02,
    statePrecision: 'float32',
    stepsPerFrame: 1,
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  }),
  centerX: 24,
  centerY: 24,
  stimulusRadius: 2,
  sampleRadii: Object.freeze([8, 14]) as readonly [number, number],
  angleCount: 32,
  threshold: 0.5,
  maximumModelTime: 20,
  maximumDirectionalSpeedDeviation: 0.01,
  maximumOuterActivationSpread: 0.04,
});

export function interpolateBilinearActivationTime(
  corners: readonly [number, number, number, number],
  xFraction: number,
  yFraction: number,
): number {
  if (!corners.every(Number.isFinite)) throw new Error('Bilinear activation-time corners must be finite.');
  if (!(xFraction >= 0 && xFraction <= 1) || !Number.isFinite(xFraction)
    || !(yFraction >= 0 && yFraction <= 1) || !Number.isFinite(yFraction)) {
    throw new Error('Bilinear activation-time fractions must be finite and between zero and one.');
  }
  const [topLeft, topRight, bottomLeft, bottomRight] = corners;
  const top = topLeft * (1 - xFraction) + topRight * xFraction;
  const bottom = bottomLeft * (1 - xFraction) + bottomRight * xFraction;
  return top * (1 - yFraction) + bottom * yFraction;
}

export function createBilinearSample(
  physicalX: number,
  physicalY: number,
  dx: number,
  width: number,
  height: number,
): BilinearSample {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error('Bilinear sample grid dimensions must be integers of at least two.');
  }
  const gridX = snapGridCoordinate(physicalX / dx);
  const gridY = snapGridCoordinate(physicalY / dx);
  if (!(gridX >= 0 && gridX <= width - 1 && gridY >= 0 && gridY <= height - 1)) {
    throw new Error('Bilinear sample lies outside the grid.');
  }
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const xFraction = gridX - x0;
  const yFraction = gridY - y0;
  const x1 = xFraction === 0 ? x0 : x0 + 1;
  const y1 = yFraction === 0 ? y0 : y0 + 1;
  if (x1 >= width || y1 >= height) throw new Error('Bilinear sample requires a corner outside the grid.');
  return Object.freeze({
    physicalX,
    physicalY,
    gridX,
    gridY,
    xFraction,
    yFraction,
    cornerIndices: Object.freeze([
      y0 * width + x0,
      y0 * width + x1,
      y1 * width + x0,
      y1 * width + x1,
    ]) as readonly [number, number, number, number],
  });
}

export function analyzeRadialSymmetry(input: RadialSymmetryAnalysisInput): RadialSymmetryAnalysis {
  const [innerRadius, outerRadius] = input.sampleRadii;
  const [innerTimes, outerTimes] = input.activationTimesByRadius;
  validateRadialDefinition(
    input.sampleRadii, input.maximumDirectionalSpeedDeviation, input.maximumOuterActivationSpread,
  );
  if (innerTimes.length !== outerTimes.length || innerTimes.length < 4) {
    throw new Error('Radial analysis requires equal activation-time arrays with at least four angles.');
  }
  if (!innerTimes.every(Number.isFinite) || !outerTimes.every(Number.isFinite)) {
    throw new Error('Radial activation times must be finite.');
  }
  const radialDistance = outerRadius - innerRadius;
  const directionalSpeeds = outerTimes.map((outerTime, index) => {
    const elapsed = outerTime - innerTimes[index]!;
    if (!(elapsed > 0)) throw new Error('Radial outer activation must occur after inner activation at every angle.');
    const speed = radialDistance / elapsed;
    if (!(speed > 0) || !Number.isFinite(speed)) throw new Error('Radial directional speed must be finite and positive.');
    return speed;
  });
  const meanDirectionalSpeed = directionalSpeeds.reduce((sum, speed) => sum + speed, 0)
    / directionalSpeeds.length;
  const maximumRelativeSpeedDeviation = Math.max(
    ...directionalSpeeds.map((speed) => Math.abs(speed - meanDirectionalSpeed) / meanDirectionalSpeed),
  );
  if (maximumRelativeSpeedDeviation > input.maximumDirectionalSpeedDeviation) {
    throw new Error(
      `Radial directional-speed deviation ${maximumRelativeSpeedDeviation} exceeds ${input.maximumDirectionalSpeedDeviation}.`,
    );
  }
  const activationSpreads = Object.freeze([
    Math.max(...innerTimes) - Math.min(...innerTimes),
    Math.max(...outerTimes) - Math.min(...outerTimes),
  ]) as readonly [number, number];
  if (activationSpreads[1] > input.maximumOuterActivationSpread) {
    throw new Error(
      `Radial outer activation spread ${activationSpreads[1]} exceeds ${input.maximumOuterActivationSpread}.`,
    );
  }
  return Object.freeze({
    directionalSpeeds: Object.freeze(directionalSpeeds),
    meanDirectionalSpeed,
    maximumRelativeSpeedDeviation,
    activationSpreads,
  });
}

export function measureRadialSymmetry(
  protocol: RadialSymmetryProtocol = defaultRadialSymmetryProtocol,
): RadialSymmetryResult {
  validateProtocol(protocol);
  const solver = new MonodomainSolver(protocol.solverConfig);
  if (solver.stableDt !== protocol.solverConfig.requestedDt) {
    throw new Error(`Radial symmetry requested dt ${protocol.solverConfig.requestedDt} was capped to ${solver.stableDt}.`);
  }
  solver.reset();
  const centerGridX = physicalCoordinateToGridIndex(
    protocol.centerX, solver.tissue.dx, solver.tissue.width - 1, 'Radial center x',
  );
  const centerGridY = physicalCoordinateToGridIndex(
    protocol.centerY, solver.tissue.dx, solver.tissue.height - 1, 'Radial center y',
  );
  solver.applyStimulus({
    x: centerGridX,
    y: centerGridY,
    radius: protocol.stimulusRadius / solver.tissue.dx,
    amplitude: 1,
  });

  const angles = Array.from({ length: protocol.angleCount }, (_, index) => 2 * Math.PI * index / protocol.angleCount);
  const samplesByRadius = protocol.sampleRadii.map((radius) => angles.map((angle) => createBilinearSample(
    protocol.centerX + radius * Math.cos(angle),
    protocol.centerY + radius * Math.sin(angle),
    solver.tissue.dx,
    solver.tissue.width,
    solver.tissue.height,
  )));
  const probeIndices = [...new Set(samplesByRadius.flatMap((samples) => samples.flatMap((sample) => sample.cornerIndices)))];
  const probeSlots = new Map(probeIndices.map((index, slot) => [index, slot]));
  const previousValues = probeIndices.map((index) => solver.voltage[index]!);
  if (previousValues.some((value) => value >= protocol.threshold)) {
    throw new Error('Radial symmetry probes must begin below the activation threshold and outside the stimulus.');
  }
  const nodalActivationTimes: Array<number | null> = probeIndices.map(() => null);
  let previousTime = solver.time;
  while (solver.time < protocol.maximumModelTime && nodalActivationTimes.some((time) => time === null)) {
    solver.step();
    const currentTime = solver.time;
    for (let slot = 0; slot < probeIndices.length; slot += 1) {
      const currentValue = solver.voltage[probeIndices[slot]!]!;
      if (nodalActivationTimes[slot] === null) {
        const crossing = interpolateUpwardCrossing(
          previousValues[slot]!, currentValue, previousTime, currentTime, protocol.threshold,
        );
        if (crossing !== null && crossing <= protocol.maximumModelTime) nodalActivationTimes[slot] = crossing;
      }
      previousValues[slot] = currentValue;
    }
    previousTime = currentTime;
    if (solver.diagnostics.denominatorGuardCount > 0 || solver.diagnostics.nonFiniteStateCount > 0) {
      throw new Error('Radial symmetry measurement aborted because a denominator guard or non-finite state occurred.');
    }
  }
  const missing = nodalActivationTimes.reduce<number[]>((indices, time, slot) => {
    if (time === null) indices.push(probeIndices[slot]!);
    return indices;
  }, []);
  if (missing.length > 0) {
    throw new Error(`Radial wave did not activate every interpolation node by model time ${protocol.maximumModelTime}.`);
  }
  const completedTimes = nodalActivationTimes as number[];
  const activationTimesByRadius = samplesByRadius.map((samples) => samples.map((sample) => {
    const corners = sample.cornerIndices.map((index) => completedTimes[probeSlots.get(index)!]!) as unknown as readonly [
      number, number, number, number,
    ];
    return interpolateBilinearActivationTime(corners, sample.xFraction, sample.yFraction);
  })) as [number[], number[]];
  const analysis = analyzeRadialSymmetry({
    sampleRadii: protocol.sampleRadii,
    activationTimesByRadius,
    maximumDirectionalSpeedDeviation: protocol.maximumDirectionalSpeedDeviation,
    maximumOuterActivationSpread: protocol.maximumOuterActivationSpread,
  });
  const diagnostics = solver.diagnostics;
  return Object.freeze({
    ...analysis,
    units: 'model-length-unit/model-time-unit',
    protocol: copyProtocol(protocol),
    stableDt: solver.stableDt,
    angles: Object.freeze(angles),
    samplesByRadius: Object.freeze(samplesByRadius.map((samples) => Object.freeze(samples))),
    activationTimesByRadius: Object.freeze(
      activationTimesByRadius.map((times) => Object.freeze(times)),
    ) as readonly [readonly number[], readonly number[]],
    safeguardStatus: hasStateClipping(diagnostics) ? 'clipped' : 'unclipped',
    diagnostics,
    stateExtrema: solver.stateExtrema,
  });
}

function validateProtocol(protocol: RadialSymmetryProtocol): void {
  validateRadialDefinition(
    protocol.sampleRadii, protocol.maximumDirectionalSpeedDeviation, protocol.maximumOuterActivationSpread,
  );
  if (!Number.isInteger(protocol.angleCount) || protocol.angleCount < 8) {
    throw new Error('Radial symmetry angleCount must be an integer of at least eight.');
  }
  if (!(protocol.stimulusRadius > 0) || !Number.isFinite(protocol.stimulusRadius)) {
    throw new Error('Radial stimulus radius must be finite and positive.');
  }
  if (!(protocol.stimulusRadius < protocol.sampleRadii[0])) {
    throw new Error('Radial stimulus radius must be smaller than the inner sample radius.');
  }
  if (!Number.isFinite(protocol.centerX) || !Number.isFinite(protocol.centerY)) {
    throw new Error('Radial center coordinates must be finite.');
  }
  if (!Number.isFinite(protocol.threshold)) throw new Error('Radial threshold must be finite.');
  if (!(protocol.maximumModelTime > 0) || !Number.isFinite(protocol.maximumModelTime)) {
    throw new Error('Radial maximumModelTime must be finite and positive.');
  }
  const extentX = (protocol.solverConfig.grid.width - 1) * protocol.solverConfig.grid.dx;
  const extentY = (protocol.solverConfig.grid.height - 1) * protocol.solverConfig.grid.dx;
  const outerRadius = protocol.sampleRadii[1];
  if (protocol.centerX - outerRadius < 0 || protocol.centerX + outerRadius > extentX
    || protocol.centerY - outerRadius < 0 || protocol.centerY + outerRadius > extentY) {
    throw new Error('Radial outer sample circle must lie inside the physical domain.');
  }
}

function validateRadialDefinition(
  sampleRadii: readonly [number, number],
  maximumDirectionalSpeedDeviation: number,
  maximumOuterActivationSpread: number,
): void {
  const [innerRadius, outerRadius] = sampleRadii;
  if (!(innerRadius > 0 && outerRadius > innerRadius)
    || !Number.isFinite(innerRadius) || !Number.isFinite(outerRadius)) {
    throw new Error('Radial sample radii must be finite, positive and strictly increasing.');
  }
  if (!(maximumDirectionalSpeedDeviation >= 0) || !Number.isFinite(maximumDirectionalSpeedDeviation)
    || !(maximumOuterActivationSpread >= 0) || !Number.isFinite(maximumOuterActivationSpread)) {
    throw new Error('Radial symmetry gates must be finite and non-negative.');
  }
}

function copyProtocol(
  protocol: RadialSymmetryProtocol,
): RadialSymmetryProtocol & { readonly scenario: 'radial-wave-verification' } {
  return Object.freeze({
    ...protocol,
    scenario: 'radial-wave-verification',
    solverConfig: Object.freeze({
      ...protocol.solverConfig,
      grid: Object.freeze({ ...protocol.solverConfig.grid }),
      model: Object.freeze({ ...protocol.solverConfig.model }),
    }),
    sampleRadii: Object.freeze([...protocol.sampleRadii]) as unknown as readonly [number, number],
  });
}
