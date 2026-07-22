import { hasStateClipping, type NumericalDiagnostics } from '../core/numericalDiagnostics';
import type { SolverConfig } from '../core/types';
import { defaultAlievPanfilovParameters } from '../models/AlievPanfilov';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { interpolateUpwardCrossing } from './ActivationTime';
import {
  createBilinearSample,
  interpolateBilinearValues,
  type BilinearSample,
} from './RadialSymmetry';
import { physicalCoordinateToGridIndex } from './PhysicalCoordinates';

export interface PhysicalRectangle {
  readonly xMinimum: number;
  readonly xMaximum: number;
  readonly yMinimum: number;
  readonly yMaximum: number;
}

export interface ObstacleReentryProtocol {
  readonly solverConfig: SolverConfig;
  readonly obstacleCenterX: number;
  readonly obstacleCenterY: number;
  readonly obstacleRadius: number;
  readonly s1Rectangle: PhysicalRectangle;
  readonly s2Rectangle: PhysicalRectangle;
  readonly s2Time: number;
  readonly stimulusAmplitude: number;
  readonly probeRadius: number;
  readonly probeCount: number;
  readonly activationThreshold: number;
  readonly activityThreshold: number;
  readonly maximumModelTime: number;
  readonly minimumCircuitCount: number;
  readonly maximumPeriodRelativeSpread: number;
  readonly maximumEndGapPeriods: number;
}

export type RotationDirection = 'west-south-east-north' | 'west-north-east-south';

export interface ReentryCircuit {
  readonly direction: RotationDirection;
  readonly startTime: number;
  readonly endTime: number;
  readonly period: number;
  readonly orderedProbeTimes: readonly number[];
}

export interface ObstacleReentryAnalysisInput {
  readonly crossingTimesByProbe: readonly (readonly number[])[];
  readonly observationEndTime: number;
  readonly finalActiveCellCount: number;
  readonly minimumCircuitCount: number;
  readonly maximumPeriodRelativeSpread: number;
  readonly maximumEndGapPeriods: number;
}

export interface ObstacleReentryAnalysis {
  readonly outcome: 'persistent-reentry' | 'no-persistent-reentry';
  readonly failureReasons: readonly string[];
  readonly direction: RotationDirection | null;
  readonly circuitCount: number;
  readonly circuits: readonly ReentryCircuit[];
  readonly circuitPeriods: readonly number[];
  readonly meanCircuitPeriod: number | null;
  readonly periodRelativeSpread: number | null;
  readonly timeSinceLastCompletedCircuit: number | null;
}

export interface ObstacleReentryResult extends ObstacleReentryAnalysis {
  readonly protocol: ObstacleReentryProtocol & { readonly scenario: 'obstacle-reentry-verification' };
  readonly units: 'model-time-unit';
  readonly stableDt: number;
  readonly probeAngles: readonly number[];
  readonly probeSamples: readonly BilinearSample[];
  readonly crossingTimesByProbe: readonly (readonly number[])[];
  readonly finalActiveCellCount: number;
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly scientificStatus:
    | 'implementation-characterization'
    | 'implementation-characterization-compromised-by-clipping';
  readonly diagnostics: NumericalDiagnostics;
}

export const defaultObstacleReentryProtocol: ObstacleReentryProtocol = Object.freeze({
  solverConfig: Object.freeze({
    grid: Object.freeze({ width: 128, height: 96, dx: 1 }),
    diffusion: 0.8,
    requestedDt: 0.08,
    stepsPerFrame: 1,
    model: defaultAlievPanfilovParameters,
  }),
  obstacleCenterX: 64,
  obstacleCenterY: 48,
  obstacleRadius: 12,
  s1Rectangle: Object.freeze({ xMinimum: 0, xMaximum: 127, yMinimum: 48, yMaximum: 95 }),
  s2Rectangle: Object.freeze({ xMinimum: 0, xMaximum: 50, yMinimum: 0, yMaximum: 47 }),
  s2Time: 28,
  stimulusAmplitude: 1,
  probeRadius: 16,
  probeCount: 8,
  activationThreshold: 0.5,
  activityThreshold: 0.1,
  maximumModelTime: 220,
  minimumCircuitCount: 2,
  maximumPeriodRelativeSpread: 0.1,
  maximumEndGapPeriods: 1,
});

export function analyzeObstacleReentry(input: ObstacleReentryAnalysisInput): ObstacleReentryAnalysis {
  validateAnalysisInput(input);
  const anchors = input.crossingTimesByProbe[0]!;
  const circuits: ReentryCircuit[] = [];
  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
    const startTime = anchors[anchorIndex]!;
    const endTime = anchors[anchorIndex + 1]!;
    const forward = extractCircuit(input.crossingTimesByProbe, startTime, endTime, false);
    const reverse = extractCircuit(input.crossingTimesByProbe, startTime, endTime, true);
    const ordered = forward ?? reverse;
    if (ordered !== null) {
      circuits.push(Object.freeze({
        direction: forward !== null ? 'west-south-east-north' : 'west-north-east-south',
        startTime,
        endTime,
        period: endTime - startTime,
        orderedProbeTimes: Object.freeze([startTime, ...ordered, endTime]),
      }));
    }
  }

  const failureReasons: string[] = [];
  if (circuits.length < input.minimumCircuitCount) {
    failureReasons.push(`only ${circuits.length} complete circuits; ${input.minimumCircuitCount} required`);
  }
  const directions = new Set(circuits.map((circuit) => circuit.direction));
  if (directions.size > 1) failureReasons.push('completed circuits do not have one consistent rotation direction');
  const direction = directions.size === 1 ? circuits[0]!.direction : null;
  const circuitPeriods = circuits.map((circuit) => circuit.period);
  const meanCircuitPeriod = circuitPeriods.length > 0
    ? circuitPeriods.reduce((sum, period) => sum + period, 0) / circuitPeriods.length
    : null;
  const periodRelativeSpread = meanCircuitPeriod !== null
    ? (Math.max(...circuitPeriods) - Math.min(...circuitPeriods)) / meanCircuitPeriod
    : null;
  if (periodRelativeSpread !== null && periodRelativeSpread > input.maximumPeriodRelativeSpread) {
    failureReasons.push(
      `circuit-period relative spread ${periodRelativeSpread} exceeds ${input.maximumPeriodRelativeSpread}`,
    );
  }
  const lastCompletedAt = circuits.length > 0 ? Math.max(...circuits.map((circuit) => circuit.endTime)) : null;
  const timeSinceLastCompletedCircuit = lastCompletedAt === null ? null : input.observationEndTime - lastCompletedAt;
  if (timeSinceLastCompletedCircuit !== null && meanCircuitPeriod !== null
    && timeSinceLastCompletedCircuit > input.maximumEndGapPeriods * meanCircuitPeriod) {
    failureReasons.push('last completed circuit is too remote from the end of observation');
  }
  if (input.finalActiveCellCount === 0) failureReasons.push('no active conductive cells remain at observation end');

  return Object.freeze({
    outcome: failureReasons.length === 0 ? 'persistent-reentry' : 'no-persistent-reentry',
    failureReasons: Object.freeze(failureReasons),
    direction,
    circuitCount: circuits.length,
    circuits: Object.freeze(circuits),
    circuitPeriods: Object.freeze(circuitPeriods),
    meanCircuitPeriod,
    periodRelativeSpread,
    timeSinceLastCompletedCircuit,
  });
}

export function measureObstacleReentry(
  protocol: ObstacleReentryProtocol = defaultObstacleReentryProtocol,
): ObstacleReentryResult {
  validateProtocol(protocol);
  const solver = new MonodomainSolver(protocol.solverConfig);
  if (solver.stableDt !== protocol.solverConfig.requestedDt) {
    throw new Error(
      `Obstacle re-entry requested dt ${protocol.solverConfig.requestedDt} was capped to ${solver.stableDt}.`,
    );
  }
  const s2Step = alignedStep(protocol.s2Time, solver.stableDt, 'S2 time');
  const finalStep = alignedStep(protocol.maximumModelTime, solver.stableDt, 'maximum model time');
  const centerX = physicalCoordinateToGridIndex(
    protocol.obstacleCenterX, solver.tissue.dx, solver.tissue.width - 1, 'Obstacle center x',
  );
  const centerY = physicalCoordinateToGridIndex(
    protocol.obstacleCenterY, solver.tissue.dx, solver.tissue.height - 1, 'Obstacle center y',
  );
  solver.addObstacle(centerX, centerY, protocol.obstacleRadius / solver.tissue.dx);
  applyPhysicalRectangle(solver, protocol.s1Rectangle, protocol.stimulusAmplitude);

  const probeAngles = Array.from(
    { length: protocol.probeCount },
    (_, index) => Math.PI - index * 2 * Math.PI / protocol.probeCount,
  );
  const probeSamples = probeAngles.map((angle) => createBilinearSample(
    protocol.obstacleCenterX + protocol.probeRadius * Math.cos(angle),
    protocol.obstacleCenterY + protocol.probeRadius * Math.sin(angle),
    solver.tissue.dx,
    solver.tissue.width,
    solver.tissue.height,
  ));
  for (const sample of probeSamples) {
    if (sample.cornerIndices.some((index) => solver.tissue.mask[index] !== 1)) {
      throw new Error('Obstacle re-entry probe interpolation corners must all be conductive.');
    }
    if (sample.cornerIndices.some((index) => indexInsideRectangle(index, solver, protocol.s2Rectangle))) {
      throw new Error('Obstacle re-entry probes must lie outside the S2 assignment rectangle.');
    }
  }

  const crossings = probeSamples.map(() => [] as number[]);
  let previousValues = probeSamples.map((sample) => sampleVoltage(sample, solver.voltage));
  let previousTime = solver.time;
  for (let step = 0; step < finalStep; step += 1) {
    if (step === s2Step) {
      applyPhysicalRectangle(solver, protocol.s2Rectangle, protocol.stimulusAmplitude);
      const afterS2 = probeSamples.map((sample) => sampleVoltage(sample, solver.voltage));
      if (afterS2.some((value, index) => value !== previousValues[index])) {
        throw new Error('S2 directly changed an obstacle re-entry probe.');
      }
      previousValues = afterS2;
      previousTime = solver.time;
    }
    solver.step();
    if (step >= s2Step) {
      for (let probe = 0; probe < probeSamples.length; probe += 1) {
        const currentValue = sampleVoltage(probeSamples[probe]!, solver.voltage);
        const crossing = interpolateUpwardCrossing(
          previousValues[probe]!, currentValue, previousTime, solver.time, protocol.activationThreshold,
        );
        if (crossing !== null) crossings[probe]!.push(crossing);
        previousValues[probe] = currentValue;
      }
      previousTime = solver.time;
    } else {
      previousValues = probeSamples.map((sample) => sampleVoltage(sample, solver.voltage));
      previousTime = solver.time;
    }
    const diagnostics = solver.diagnostics;
    if (diagnostics.denominatorGuardCount > 0 || diagnostics.nonFiniteStateCount > 0) {
      throw new Error('Obstacle re-entry measurement aborted because a denominator guard or non-finite state occurred.');
    }
  }

  let finalActiveCellCount = 0;
  for (let index = 0; index < solver.tissue.size; index += 1) {
    if (solver.tissue.mask[index] === 1 && solver.voltage[index]! >= protocol.activityThreshold) {
      finalActiveCellCount += 1;
    }
  }
  const completedCrossings = Object.freeze(crossings.map((times) => Object.freeze(times)));
  const analysis = analyzeObstacleReentry({
    crossingTimesByProbe: completedCrossings,
    observationEndTime: protocol.maximumModelTime,
    finalActiveCellCount,
    minimumCircuitCount: protocol.minimumCircuitCount,
    maximumPeriodRelativeSpread: protocol.maximumPeriodRelativeSpread,
    maximumEndGapPeriods: protocol.maximumEndGapPeriods,
  });
  const diagnostics = solver.diagnostics;
  const safeguardStatus = hasStateClipping(diagnostics) ? 'clipped' : 'unclipped';
  return Object.freeze({
    ...analysis,
    protocol: copyProtocol(protocol),
    units: 'model-time-unit',
    stableDt: solver.stableDt,
    probeAngles: Object.freeze(probeAngles),
    probeSamples: Object.freeze(probeSamples),
    crossingTimesByProbe: completedCrossings,
    finalActiveCellCount,
    safeguardStatus,
    scientificStatus: safeguardStatus === 'clipped'
      ? 'implementation-characterization-compromised-by-clipping'
      : 'implementation-characterization',
    diagnostics,
  });
}

function extractCircuit(
  crossings: readonly (readonly number[])[],
  startTime: number,
  endTime: number,
  reverse: boolean,
): readonly number[] | null {
  const order = Array.from({ length: crossings.length - 1 }, (_, offset) => reverse
    ? crossings.length - 1 - offset
    : offset + 1);
  const times: number[] = [];
  for (const probe of order) {
    const withinCircuit = crossings[probe]!.filter((time) => time > startTime && time < endTime);
    if (withinCircuit.length !== 1) return null;
    times.push(withinCircuit[0]!);
  }
  if (times.some((time, index) => index > 0 && !(time > times[index - 1]!))) return null;
  return times;
}

function validateAnalysisInput(input: ObstacleReentryAnalysisInput): void {
  if (input.crossingTimesByProbe.length < 4) throw new Error('Re-entry analysis requires at least four probes.');
  for (const times of input.crossingTimesByProbe) {
    if (!times.every(Number.isFinite)) throw new Error('Re-entry crossing times must be finite.');
    if (times.some((time) => time < 0 || time > input.observationEndTime)) {
      throw new Error('Re-entry crossing times must lie inside the observation window.');
    }
    if (times.some((time, index) => index > 0 && !(time > times[index - 1]!))) {
      throw new Error('Re-entry crossing times must be strictly increasing at each probe.');
    }
  }
  if (!(input.observationEndTime > 0) || !Number.isFinite(input.observationEndTime)) {
    throw new Error('Re-entry observation end time must be finite and positive.');
  }
  if (!Number.isInteger(input.finalActiveCellCount) || input.finalActiveCellCount < 0) {
    throw new Error('Re-entry final active-cell count must be a non-negative integer.');
  }
  if (!Number.isInteger(input.minimumCircuitCount) || input.minimumCircuitCount < 1) {
    throw new Error('Re-entry minimum circuit count must be a positive integer.');
  }
  if (!(input.maximumPeriodRelativeSpread >= 0) || !Number.isFinite(input.maximumPeriodRelativeSpread)
    || !(input.maximumEndGapPeriods >= 0) || !Number.isFinite(input.maximumEndGapPeriods)) {
    throw new Error('Re-entry persistence gates must be finite and non-negative.');
  }
}

function validateProtocol(protocol: ObstacleReentryProtocol): void {
  const { width, height, dx } = protocol.solverConfig.grid;
  const extentX = (width - 1) * dx;
  const extentY = (height - 1) * dx;
  for (const [name, value] of Object.entries({
    obstacleRadius: protocol.obstacleRadius,
    probeRadius: protocol.probeRadius,
    s2Time: protocol.s2Time,
    stimulusAmplitude: protocol.stimulusAmplitude,
    maximumModelTime: protocol.maximumModelTime,
  })) {
    if (!(value > 0) || !Number.isFinite(value)) throw new Error(`Obstacle re-entry ${name} must be finite and positive.`);
  }
  if (!(protocol.probeRadius > protocol.obstacleRadius)) {
    throw new Error('Obstacle re-entry probe radius must exceed obstacle radius.');
  }
  if (!Number.isInteger(protocol.probeCount) || protocol.probeCount < 4) {
    throw new Error('Obstacle re-entry probe count must be an integer of at least four.');
  }
  if (!(protocol.activationThreshold > 0 && protocol.activationThreshold < protocol.stimulusAmplitude)
    || !(protocol.activityThreshold > 0 && protocol.activityThreshold <= protocol.activationThreshold)) {
    throw new Error('Obstacle re-entry voltage thresholds are invalid.');
  }
  if (!(protocol.maximumModelTime > protocol.s2Time)) {
    throw new Error('Obstacle re-entry observation must extend beyond S2.');
  }
  if (protocol.obstacleCenterX - protocol.probeRadius < 0
    || protocol.obstacleCenterX + protocol.probeRadius > extentX
    || protocol.obstacleCenterY - protocol.probeRadius < 0
    || protocol.obstacleCenterY + protocol.probeRadius > extentY) {
    throw new Error('Obstacle re-entry obstacle and probe circle must lie inside the physical domain.');
  }
  validateRectangle(protocol.s1Rectangle, extentX, extentY, dx, 'S1');
  validateRectangle(protocol.s2Rectangle, extentX, extentY, dx, 'S2');
  validateAnalysisInput({
    crossingTimesByProbe: Array.from({ length: protocol.probeCount }, () => []),
    observationEndTime: protocol.maximumModelTime,
    finalActiveCellCount: 0,
    minimumCircuitCount: protocol.minimumCircuitCount,
    maximumPeriodRelativeSpread: protocol.maximumPeriodRelativeSpread,
    maximumEndGapPeriods: protocol.maximumEndGapPeriods,
  });
}

function validateRectangle(
  rectangle: PhysicalRectangle,
  extentX: number,
  extentY: number,
  dx: number,
  label: string,
): void {
  if (!(rectangle.xMinimum >= 0 && rectangle.xMaximum >= rectangle.xMinimum && rectangle.xMaximum <= extentX)
    || !(rectangle.yMinimum >= 0 && rectangle.yMaximum >= rectangle.yMinimum && rectangle.yMaximum <= extentY)) {
    throw new Error(`Obstacle re-entry ${label} rectangle is invalid or outside the domain.`);
  }
  physicalCoordinateToGridIndex(rectangle.xMinimum, dx, Number.MAX_SAFE_INTEGER, `${label} x minimum`);
  physicalCoordinateToGridIndex(rectangle.xMaximum, dx, Number.MAX_SAFE_INTEGER, `${label} x maximum`);
  physicalCoordinateToGridIndex(rectangle.yMinimum, dx, Number.MAX_SAFE_INTEGER, `${label} y minimum`);
  physicalCoordinateToGridIndex(rectangle.yMaximum, dx, Number.MAX_SAFE_INTEGER, `${label} y maximum`);
}

function applyPhysicalRectangle(solver: MonodomainSolver, rectangle: PhysicalRectangle, amplitude: number): void {
  solver.applyRectangularStimulus(
    physicalCoordinateToGridIndex(rectangle.xMinimum, solver.tissue.dx, solver.tissue.width - 1, 'Stimulus x minimum'),
    physicalCoordinateToGridIndex(rectangle.xMaximum, solver.tissue.dx, solver.tissue.width - 1, 'Stimulus x maximum'),
    physicalCoordinateToGridIndex(rectangle.yMinimum, solver.tissue.dx, solver.tissue.height - 1, 'Stimulus y minimum'),
    physicalCoordinateToGridIndex(rectangle.yMaximum, solver.tissue.dx, solver.tissue.height - 1, 'Stimulus y maximum'),
    amplitude,
  );
}

function indexInsideRectangle(index: number, solver: MonodomainSolver, rectangle: PhysicalRectangle): boolean {
  const x = (index % solver.tissue.width) * solver.tissue.dx;
  const y = Math.floor(index / solver.tissue.width) * solver.tissue.dx;
  return x >= rectangle.xMinimum && x <= rectangle.xMaximum
    && y >= rectangle.yMinimum && y <= rectangle.yMaximum;
}

function sampleVoltage(sample: BilinearSample, voltage: Float32Array): number {
  const corners = sample.cornerIndices.map((index) => voltage[index]!) as unknown as readonly [
    number, number, number, number,
  ];
  return interpolateBilinearValues(corners, sample.xFraction, sample.yFraction, 'Bilinear voltage');
}

function alignedStep(time: number, dt: number, label: string): number {
  const step = Math.round(time / dt);
  if (Math.abs(step * dt - time) > 1e-9) throw new Error(`Obstacle re-entry ${label} must align to dt ${dt}.`);
  return step;
}

function copyProtocol(
  protocol: ObstacleReentryProtocol,
): ObstacleReentryProtocol & { readonly scenario: 'obstacle-reentry-verification' } {
  return Object.freeze({
    ...protocol,
    scenario: 'obstacle-reentry-verification',
    solverConfig: Object.freeze({
      ...protocol.solverConfig,
      grid: Object.freeze({ ...protocol.solverConfig.grid }),
      model: Object.freeze({ ...protocol.solverConfig.model }),
    }),
    s1Rectangle: Object.freeze({ ...protocol.s1Rectangle }),
    s2Rectangle: Object.freeze({ ...protocol.s2Rectangle }),
  });
}
