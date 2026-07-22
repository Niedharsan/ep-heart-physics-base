import {
  copyNumericalDiagnostics,
  createNumericalDiagnostics,
  hasStateClipping,
  type MutableNumericalDiagnostics,
  type NumericalDiagnostics,
  type NumericalStateExtrema,
} from '../core/numericalDiagnostics';
import type { ModelParameters, SolverConfig } from '../core/types';
import { alievPanfilovPresets } from '../models/AlievPanfilov';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import { interpolateUpwardCrossing } from './ActivationTime';
import { gridNodeCountForExtent, physicalCoordinateToGridIndex } from './PhysicalCoordinates';

export interface RefractoryCaptureProtocol {
  readonly domainWidth: number;
  readonly domainHeight: number;
  readonly dx: number;
  readonly dt: number;
  readonly diffusion: number;
  readonly model: ModelParameters;
  readonly stimulusMaximumX: number;
  readonly stimulusSampleX: number;
  readonly stimulusAmplitude: number;
  readonly threshold: number;
  readonly stationX: readonly number[];
  readonly rowY: readonly number[];
  readonly observationTimeAfterS2: number;
  readonly maximumPlanaritySpread: number;
  readonly coarseCouplingIntervals: readonly number[];
  readonly transitionScan: Readonly<{
    minimum: number;
    maximum: number;
    resolution: number;
  }>;
}

export interface ProbeCrossings {
  readonly s1Rising: number | null;
  readonly s1Falling: number | null;
  readonly s2Rising: number | null;
}

export interface PreS2StateEvidence {
  readonly x: number;
  readonly yCoordinates: readonly number[];
  readonly voltage: Readonly<StateSummary>;
  readonly recovery: Readonly<StateSummary>;
}

export interface StateSummary {
  readonly values: readonly number[];
  readonly minimum: number;
  readonly mean: number;
  readonly maximum: number;
}

export interface CaptureAnalysis {
  readonly outcome: 'capture' | 'failure';
  readonly failureReasons: readonly string[];
  readonly stationMeanS2ActivationTimes: readonly (number | null)[];
  readonly transverseSpreads: readonly (number | null)[];
}

export interface RefractoryCaptureTrialResult extends CaptureAnalysis {
  readonly couplingInterval: number;
  readonly units: 'model-time-unit';
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly stableDt: number;
  readonly s2ApplicationTime: number;
  readonly crossingsByStation: readonly (readonly ProbeCrossings[])[];
  readonly preS2State: PreS2StateEvidence;
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export interface RefractoryCaptureStudyResult {
  readonly protocol: RefractoryCaptureProtocol;
  readonly trials: readonly RefractoryCaptureTrialResult[];
  readonly longestFailingInterval: number;
  readonly shortestCapturedInterval: number;
  readonly transitionResolution: number;
  readonly units: 'model-time-unit';
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly scientificStatus:
    | 'implementation-characterization'
    | 'implementation-characterization-compromised-by-clipping';
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export const defaultRefractoryCaptureProtocol: RefractoryCaptureProtocol = Object.freeze({
  domainWidth: 48,
  domainHeight: 12,
  dx: 0.5,
  dt: 0.02,
  diffusion: 0.8,
  model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  stimulusMaximumX: 2,
  stimulusSampleX: 1,
  stimulusAmplitude: 1,
  threshold: 0.5,
  stationX: Object.freeze([6, 12, 18]),
  rowY: Object.freeze([3, 6, 9]),
  observationTimeAfterS2: 20,
  maximumPlanaritySpread: 0.02,
  coarseCouplingIntervals: Object.freeze([30, 33]),
  transitionScan: Object.freeze({ minimum: 31, maximum: 32, resolution: 0.02 }),
});

export function analyzeCaptureCrossings(
  crossingsByStation: readonly (readonly ProbeCrossings[])[],
  maximumPlanaritySpread: number,
): CaptureAnalysis {
  if (crossingsByStation.length < 2 || crossingsByStation.some((station) => station.length === 0)) {
    throw new Error('Capture analysis requires at least two non-empty downstream stations.');
  }
  if (!(maximumPlanaritySpread >= 0) || !Number.isFinite(maximumPlanaritySpread)) {
    throw new Error('Capture maximumPlanaritySpread must be finite and non-negative.');
  }
  const rowCount = crossingsByStation[0]!.length;
  if (crossingsByStation.some((station) => station.length !== rowCount)) {
    throw new Error('Capture stations must contain equal transverse row counts.');
  }
  if (crossingsByStation.some((station) => station.some((probe) =>
    [probe.s1Rising, probe.s1Falling, probe.s2Rising].some((time) => time !== null && !Number.isFinite(time))))) {
    throw new Error('Capture crossing times must be finite or null.');
  }

  const failureReasons: string[] = [];
  const stationMeanS2ActivationTimes: Array<number | null> = [];
  const transverseSpreads: Array<number | null> = [];
  for (let stationIndex = 0; stationIndex < crossingsByStation.length; stationIndex += 1) {
    const station = crossingsByStation[stationIndex]!;
    if (station.some((probe) => probe.s1Rising === null || probe.s1Falling === null)) {
      failureReasons.push(`station ${stationIndex} did not complete the S1 rise/fall cycle at every row`);
    }
    if (station.some((probe) => probe.s1Rising !== null && probe.s1Falling !== null
      && !(probe.s1Falling > probe.s1Rising))) {
      failureReasons.push(`station ${stationIndex} has a nonsequential S1 rise/fall cycle`);
    }
    if (station.some((probe) => probe.s1Falling !== null && probe.s2Rising !== null
      && !(probe.s2Rising > probe.s1Falling))) {
      failureReasons.push(`station ${stationIndex} has S2 activation before S1 recovery crossing`);
    }
    const s2Times = station.map((probe) => probe.s2Rising);
    if (s2Times.some((time) => time === null)) {
      failureReasons.push(`station ${stationIndex} has missing S2 activation`);
      stationMeanS2ActivationTimes.push(null);
      transverseSpreads.push(null);
      continue;
    }
    const completeTimes = s2Times as number[];
    const mean = completeTimes.reduce((sum, time) => sum + time, 0) / completeTimes.length;
    const spread = Math.max(...completeTimes) - Math.min(...completeTimes);
    stationMeanS2ActivationTimes.push(mean);
    transverseSpreads.push(spread);
    if (spread > maximumPlanaritySpread) {
      failureReasons.push(`station ${stationIndex} transverse spread ${spread} exceeds ${maximumPlanaritySpread}`);
    }
  }
  if (stationMeanS2ActivationTimes.every((time) => time !== null)) {
    for (let index = 1; index < stationMeanS2ActivationTimes.length; index += 1) {
      if (!(stationMeanS2ActivationTimes[index]! > stationMeanS2ActivationTimes[index - 1]!)) {
        failureReasons.push('S2 station means are not strictly ordered downstream');
        break;
      }
    }
  }
  return Object.freeze({
    outcome: failureReasons.length === 0 ? 'capture' : 'failure',
    failureReasons: Object.freeze(failureReasons),
    stationMeanS2ActivationTimes: Object.freeze(stationMeanS2ActivationTimes),
    transverseSpreads: Object.freeze(transverseSpreads),
  });
}

export function buildCouplingIntervals(protocol: RefractoryCaptureProtocol): readonly number[] {
  const { minimum, maximum, resolution } = protocol.transitionScan;
  if (!(resolution > 0) || !Number.isFinite(resolution) || !(maximum >= minimum)) {
    throw new Error('Refractory transition scan bounds and resolution are invalid.');
  }
  const stepCount = (maximum - minimum) / resolution;
  if (Math.abs(stepCount - Math.round(stepCount)) > 1e-9) {
    throw new Error('Refractory transition scan range must contain an integer number of resolution steps.');
  }
  const values = [...protocol.coarseCouplingIntervals, minimum, maximum];
  if (values.some((value) => !(value > 0) || !Number.isFinite(value))) {
    throw new Error('Refractory coupling intervals must be finite and positive.');
  }
  return Object.freeze([...new Set(values)].sort((left, right) => left - right));
}

export function runRefractoryCaptureStudy(
  protocol: RefractoryCaptureProtocol = defaultRefractoryCaptureProtocol,
): RefractoryCaptureStudyResult {
  validateProtocol(protocol);
  const config = createSolverConfig(protocol);
  const scheduleSolver = new MonodomainSolver(config);
  if (scheduleSolver.stableDt !== protocol.dt) {
    throw new Error(`Refractory protocol requested dt ${protocol.dt} was capped to ${scheduleSolver.stableDt}.`);
  }
  const initialIntervals = buildCouplingIntervals(protocol);
  for (const interval of initialIntervals) validateAlignedInterval(interval, scheduleSolver.stableDt);
  const cache = new Map<number, RefractoryCaptureTrialResult>();
  const run = (interval: number): RefractoryCaptureTrialResult => {
    const cached = cache.get(interval);
    if (cached) return cached;
    const result = runTrial(protocol, config, interval);
    cache.set(interval, result);
    return result;
  };
  initialIntervals.forEach(run);
  const resolution = protocol.transitionScan.resolution;
  let failingStep = Math.round(protocol.transitionScan.minimum / resolution);
  let capturedStep = Math.round(protocol.transitionScan.maximum / resolution);
  if (run(failingStep * resolution).outcome !== 'failure'
    || run(capturedStep * resolution).outcome !== 'capture') {
    throw new Error('Refractory transition scan endpoints must bracket failure then capture.');
  }
  while (capturedStep - failingStep > 1) {
    const candidateStep = Math.floor((failingStep + capturedStep) / 2);
    const candidate = Number((candidateStep * resolution).toPrecision(14));
    if (run(candidate).outcome === 'failure') failingStep = candidateStep;
    else capturedStep = candidateStep;
  }
  const trials = [...cache.values()].sort((left, right) => left.couplingInterval - right.couplingInterval);
  const firstCaptureIndex = trials.findIndex((trial) => trial.outcome === 'capture');
  if (firstCaptureIndex <= 0) {
    throw new Error('Refractory study requires at least one failure followed by at least one capture.');
  }
  if (trials.slice(firstCaptureIndex).some((trial) => trial.outcome !== 'capture')) {
    throw new Error('Refractory capture outcomes are not monotone with increasing coupling interval.');
  }
  const failures = trials.slice(0, firstCaptureIndex);
  const longestFailingInterval = failures.at(-1)!.couplingInterval;
  const shortestCapturedInterval = trials[firstCaptureIndex]!.couplingInterval;
  const diagnostics = sumDiagnostics(trials.map((trial) => trial.diagnostics));
  const stateExtrema = combineStateExtrema(trials.map((trial) => trial.stateExtrema));
  const safeguardStatus = hasStateClipping(diagnostics) ? 'clipped' : 'unclipped';
  return Object.freeze({
    protocol: copyProtocol(protocol),
    trials: Object.freeze(trials),
    longestFailingInterval,
    shortestCapturedInterval,
    transitionResolution: protocol.transitionScan.resolution,
    units: 'model-time-unit',
    safeguardStatus,
    scientificStatus: safeguardStatus === 'clipped'
      ? 'implementation-characterization-compromised-by-clipping'
      : 'implementation-characterization',
    diagnostics,
    stateExtrema,
  });
}

function runTrial(
  protocol: RefractoryCaptureProtocol,
  config: SolverConfig,
  couplingInterval: number,
): RefractoryCaptureTrialResult {
  const solver = new MonodomainSolver(config);
  if (solver.stableDt !== protocol.dt) {
    throw new Error(`Refractory protocol requested dt ${protocol.dt} was capped to ${solver.stableDt}.`);
  }
  const s2Step = validateAlignedInterval(couplingInterval, solver.stableDt);
  const stimulusMaximumIndex = physicalCoordinateToGridIndex(
    protocol.stimulusMaximumX, protocol.dx, solver.tissue.width - 1, 'Refractory stimulus maximum x',
  );
  const stationIndices = protocol.stationX.map((x) => {
    const gridX = physicalCoordinateToGridIndex(x, protocol.dx, solver.tissue.width - 1, 'Refractory station x');
    return protocol.rowY.map((y) => solver.tissue.index(
      gridX,
      physicalCoordinateToGridIndex(y, protocol.dx, solver.tissue.height - 1, 'Refractory row y'),
    ));
  });
  const sampleX = physicalCoordinateToGridIndex(
    protocol.stimulusSampleX, protocol.dx, solver.tissue.width - 1, 'Refractory stimulus sample x',
  );
  const sampleIndices = protocol.rowY.map((y) => solver.tissue.index(
    sampleX,
    physicalCoordinateToGridIndex(y, protocol.dx, solver.tissue.height - 1, 'Refractory sample row y'),
  ));
  solver.applyRectangularStimulus(0, stimulusMaximumIndex, 0, solver.tissue.height - 1, protocol.stimulusAmplitude);
  const mutableCrossings = stationIndices.map((station) => station.map(() => ({
    s1Rising: null as number | null,
    s1Falling: null as number | null,
    s2Rising: null as number | null,
  })));
  const previousValues = stationIndices.map((station) => station.map((index) => solver.voltage[index]!));
  if (previousValues.some((station) => station.some((value) => value >= protocol.threshold))) {
    throw new Error('Refractory probes must begin below threshold and outside the stimulus strip.');
  }

  let previousTime = solver.time;
  let preS2State: PreS2StateEvidence | null = null;
  const finalStep = s2Step + Math.round(protocol.observationTimeAfterS2 / solver.stableDt);
  for (let step = 0; step < finalStep; step += 1) {
    if (step === s2Step) {
      const voltage = sampleIndices.map((index) => solver.voltage[index]!);
      const recovery = sampleIndices.map((index) => solver.recovery[index]!);
      preS2State = Object.freeze({
        x: protocol.stimulusSampleX,
        yCoordinates: Object.freeze([...protocol.rowY]),
        voltage: summarize(voltage),
        recovery: summarize(recovery),
      });
      solver.applyRectangularStimulus(0, stimulusMaximumIndex, 0, solver.tissue.height - 1, protocol.stimulusAmplitude);
    }
    solver.step();
    const currentTime = solver.time;
    for (let station = 0; station < stationIndices.length; station += 1) {
      for (let row = 0; row < stationIndices[station]!.length; row += 1) {
        const current = solver.voltage[stationIndices[station]![row]!]!;
        const previous = previousValues[station]![row]!;
        const state = mutableCrossings[station]![row]!;
        if (state.s1Rising === null) {
          state.s1Rising = interpolateUpwardCrossing(previous, current, previousTime, currentTime, protocol.threshold);
        } else if (state.s1Falling === null && previous >= protocol.threshold && current < protocol.threshold) {
          state.s1Falling = interpolateCrossing(previous, current, previousTime, currentTime, protocol.threshold);
        } else if (state.s1Falling !== null && state.s2Rising === null && currentTime > couplingInterval) {
          const crossing = interpolateUpwardCrossing(previous, current, previousTime, currentTime, protocol.threshold);
          if (crossing !== null && crossing >= couplingInterval) state.s2Rising = crossing;
        }
        previousValues[station]![row] = current;
      }
    }
    previousTime = currentTime;
    const diagnostics = solver.diagnostics;
    if (diagnostics.denominatorGuardCount > 0 || diagnostics.nonFiniteStateCount > 0) {
      throw new Error('Refractory trial aborted because a denominator guard or non-finite state occurred.');
    }
  }
  if (preS2State === null) throw new Error('Refractory trial did not apply S2.');
  const crossings = Object.freeze(mutableCrossings.map((station) => Object.freeze(
    station.map((probe) => Object.freeze({ ...probe })),
  )));
  const analysis = analyzeCaptureCrossings(crossings, protocol.maximumPlanaritySpread);
  const diagnostics = solver.diagnostics;
  return Object.freeze({
    ...analysis,
    couplingInterval,
    units: 'model-time-unit',
    safeguardStatus: hasStateClipping(diagnostics) ? 'clipped' : 'unclipped',
    stableDt: solver.stableDt,
    s2ApplicationTime: couplingInterval,
    crossingsByStation: crossings,
    preS2State,
    diagnostics,
    stateExtrema: solver.stateExtrema,
  });
}

function validateProtocol(protocol: RefractoryCaptureProtocol): void {
  for (const [name, value] of Object.entries({
    domainWidth: protocol.domainWidth,
    domainHeight: protocol.domainHeight,
    dx: protocol.dx,
    dt: protocol.dt,
    diffusion: protocol.diffusion,
    stimulusAmplitude: protocol.stimulusAmplitude,
    observationTimeAfterS2: protocol.observationTimeAfterS2,
  })) {
    if (!(value > 0) || !Number.isFinite(value)) throw new Error(`Refractory ${name} must be finite and positive.`);
  }
  if (!Number.isFinite(protocol.threshold)) throw new Error('Refractory threshold must be finite.');
  if (!(protocol.threshold > 0 && protocol.threshold < protocol.stimulusAmplitude)) {
    throw new Error('Refractory threshold must lie between resting voltage and stimulus amplitude.');
  }
  if (protocol.stationX.length < 2 || protocol.rowY.length < 1) {
    throw new Error('Refractory protocol requires at least two stations and one row.');
  }
  if (new Set(protocol.stationX).size !== protocol.stationX.length
    || new Set(protocol.rowY).size !== protocol.rowY.length) {
    throw new Error('Refractory station and row coordinates must be distinct.');
  }
  for (let index = 0; index < protocol.stationX.length; index += 1) {
    if (protocol.stationX[index]! <= protocol.stimulusMaximumX
      || (index > 0 && protocol.stationX[index]! <= protocol.stationX[index - 1]!)) {
      throw new Error('Refractory stations must be strictly increasing and downstream of the stimulus.');
    }
  }
  if (Math.abs(protocol.transitionScan.resolution - protocol.dt) > 1e-12) {
    throw new Error('Refractory transition scan resolution must equal dt.');
  }
  if (!(protocol.stimulusSampleX >= 0 && protocol.stimulusSampleX <= protocol.stimulusMaximumX)) {
    throw new Error('Refractory stimulus sample x must lie inside the stimulus strip.');
  }
  validateAlignedInterval(protocol.observationTimeAfterS2, protocol.dt);
  if (protocol.maximumPlanaritySpread < 0 || !Number.isFinite(protocol.maximumPlanaritySpread)) {
    throw new Error('Refractory maximumPlanaritySpread must be finite and non-negative.');
  }
  buildCouplingIntervals(protocol);
}

function createSolverConfig(protocol: RefractoryCaptureProtocol): SolverConfig {
  return {
    grid: {
      width: gridNodeCountForExtent(protocol.domainWidth, protocol.dx, 'Refractory domain width'),
      height: gridNodeCountForExtent(protocol.domainHeight, protocol.dx, 'Refractory domain height'),
      dx: protocol.dx,
    },
    diffusion: protocol.diffusion,
    requestedDt: protocol.dt,
    stepsPerFrame: 1,
    model: protocol.model,
  };
}

function interpolateCrossing(
  previousValue: number,
  currentValue: number,
  previousTime: number,
  currentTime: number,
  threshold: number,
): number {
  return previousTime + (currentTime - previousTime) * (threshold - previousValue) / (currentValue - previousValue);
}

function validateAlignedInterval(interval: number, dt: number): number {
  const step = Math.round(interval / dt);
  if (Math.abs(step * dt - interval) > 1e-9) {
    throw new Error(`Refractory coupling interval ${interval} is not aligned to dt ${dt}.`);
  }
  return step;
}

function summarize(values: readonly number[]): Readonly<StateSummary> {
  return Object.freeze({
    values: Object.freeze([...values]),
    minimum: Math.min(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    maximum: Math.max(...values),
  });
}

function sumDiagnostics(values: readonly NumericalDiagnostics[]): NumericalDiagnostics {
  const sum: MutableNumericalDiagnostics = createNumericalDiagnostics();
  for (const value of values) {
    for (const key of Object.keys(sum) as Array<keyof NumericalDiagnostics>) sum[key] += value[key];
  }
  return copyNumericalDiagnostics(sum);
}

function combineStateExtrema(values: readonly NumericalStateExtrema[]): NumericalStateExtrema {
  return Object.freeze({
    voltageMinimum: Math.min(...values.map((value) => value.voltageMinimum)),
    voltageMaximum: Math.max(...values.map((value) => value.voltageMaximum)),
    recoveryMinimum: Math.min(...values.map((value) => value.recoveryMinimum)),
    recoveryMaximum: Math.max(...values.map((value) => value.recoveryMaximum)),
  });
}

function copyProtocol(protocol: RefractoryCaptureProtocol): RefractoryCaptureProtocol {
  return Object.freeze({
    ...protocol,
    model: Object.freeze({ ...protocol.model }),
    stationX: Object.freeze([...protocol.stationX]),
    rowY: Object.freeze([...protocol.rowY]),
    coarseCouplingIntervals: Object.freeze([...protocol.coarseCouplingIntervals]),
    transitionScan: Object.freeze({ ...protocol.transitionScan }),
  });
}
