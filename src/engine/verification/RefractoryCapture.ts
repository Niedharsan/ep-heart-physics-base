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
import { createStateArray, type FloatingPointState } from '../numerics/FloatingPointState';
import { MonodomainSolver } from '../numerics/MonodomainSolver';
import {
  isCurrentPulseActive,
  writeRectangularStimulusCurrent,
  type RectangularCurrentRegion,
} from '../numerics/RectangularStimulusCurrent';
import { interpolateUpwardCrossing } from './ActivationTime';
import { gridNodeCountForExtent, physicalCoordinateToGridIndex } from './PhysicalCoordinates';
import { evaluateScientificDiagnostics, type VerificationAcceptance } from './VerificationAcceptance';

export interface RefractoryCaptureProtocol {
  readonly domainWidth: number;
  readonly domainHeight: number;
  readonly dx: number;
  readonly dt: number;
  readonly diffusion: number;
  readonly model: ModelParameters;
  readonly stimulusMaximumX: number;
  readonly stimulusSampleX: number;
  readonly stimulusCurrentAmplitude: number;
  readonly stimulusDuration: number;
  readonly conditioningPulseCount: number;
  readonly basicCycleLength: number;
  readonly threshold: number;
  readonly stationX: readonly number[];
  readonly rowY: readonly number[];
  readonly observationTimeAfterS2: number;
  readonly maximumPlanaritySpread: number;
  readonly coarseCouplingIntervals: readonly number[];
  readonly referenceScan: Readonly<{
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

export interface ConditioningBeatEvidence {
  readonly beatNumber: number;
  readonly onsetTime: number;
  readonly stationMeanActivationTimes: readonly (number | null)[];
  readonly transverseSpreads: readonly (number | null)[];
  readonly propagated: boolean;
  readonly failureReasons: readonly string[];
}

export interface RefractoryCaptureTrialResult extends CaptureAnalysis {
  readonly couplingInterval: number;
  readonly units: 'model-time-unit';
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly stableDt: number;
  readonly s2ApplicationTime: number;
  readonly crossingsByStation: readonly (readonly ProbeCrossings[])[];
  readonly finalConditioningBeat: ConditioningBeatEvidence;
  readonly preS2State: PreS2StateEvidence;
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export interface CaptureTransitionAnalysis {
  readonly longestFailingInterval: number | null;
  readonly shortestCapturedInterval: number | null;
  readonly transitionResolution: number;
  readonly monotone: boolean;
  readonly transitionCount: number;
  readonly notes: readonly string[];
}

export interface NoS2ControlResult {
  readonly passed: boolean;
  readonly failureReasons: readonly string[];
  readonly crossingsByStation: readonly (readonly ProbeCrossings[])[];
  readonly finalConditioningBeat: ConditioningBeatEvidence;
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

export interface RefractoryCaptureStudyResult {
  readonly protocol: RefractoryCaptureProtocol;
  readonly stimulus: Readonly<{
    kind: 'rectangular-monophasic-current';
    amplitudeUnits: 'dimensionless-voltage/model-time-unit';
    integratedStrength: number;
  }>;
  readonly conditioningOnsetTimes: readonly number[];
  readonly conditioningBeats: readonly ConditioningBeatEvidence[];
  readonly noS2Control: NoS2ControlResult;
  readonly trials: readonly RefractoryCaptureTrialResult[];
  readonly referenceScanTrials: readonly RefractoryCaptureTrialResult[];
  readonly optimizedSearchIntervals: readonly number[];
  readonly optimizedTransition: CaptureTransitionAnalysis;
  readonly referenceTransition: CaptureTransitionAnalysis;
  readonly transitionAgreement: boolean;
  readonly units: 'model-time-unit';
  readonly safeguardStatus: 'unclipped' | 'clipped';
  readonly scientificStatus: 'implementation-characterization';
  readonly acceptance: VerificationAcceptance;
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

interface PreparedConditioningState {
  readonly voltage: FloatingPointState;
  readonly recovery: FloatingPointState;
  readonly completedBeats: readonly ConditioningBeatEvidence[];
  readonly diagnostics: NumericalDiagnostics;
  readonly stateExtrema: NumericalStateExtrema;
}

interface ProbeLayout {
  readonly stations: readonly (readonly number[])[];
  readonly sampleIndices: readonly number[];
  readonly currentRegion: RectangularCurrentRegion;
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
  stimulusCurrentAmplitude: 5,
  stimulusDuration: 0.2,
  conditioningPulseCount: 3,
  basicCycleLength: 40,
  threshold: 0.5,
  stationX: Object.freeze([6, 12, 18]),
  rowY: Object.freeze([3, 6, 9]),
  observationTimeAfterS2: 20,
  maximumPlanaritySpread: 0.02,
  coarseCouplingIntervals: Object.freeze([18, 24]),
  referenceScan: Object.freeze({ minimum: 20, maximum: 22, resolution: 0.02 }),
});

export function analyzeCaptureCrossings(
  crossingsByStation: readonly (readonly ProbeCrossings[])[],
  maximumPlanaritySpread: number,
): CaptureAnalysis {
  validateCrossingShape(crossingsByStation, maximumPlanaritySpread);
  const failureReasons = analyzeS1Crossings(crossingsByStation, maximumPlanaritySpread).failureReasons.slice();
  const stationMeanS2ActivationTimes: Array<number | null> = [];
  const transverseSpreads: Array<number | null> = [];
  for (let stationIndex = 0; stationIndex < crossingsByStation.length; stationIndex += 1) {
    const s2Times = crossingsByStation[stationIndex]!.map((probe) => probe.s2Rising);
    if (s2Times.some((time) => time === null)) {
      failureReasons.push(`station ${stationIndex} has missing S2 activation`);
      stationMeanS2ActivationTimes.push(null);
      transverseSpreads.push(null);
      continue;
    }
    const completeTimes = s2Times as number[];
    const mean = average(completeTimes);
    const spread = Math.max(...completeTimes) - Math.min(...completeTimes);
    stationMeanS2ActivationTimes.push(mean);
    transverseSpreads.push(spread);
    if (spread > maximumPlanaritySpread) {
      failureReasons.push(`station ${stationIndex} transverse spread ${spread} exceeds ${maximumPlanaritySpread}`);
    }
  }
  appendOrderingFailure(stationMeanS2ActivationTimes, failureReasons, 'S2');
  return Object.freeze({
    outcome: failureReasons.length === 0 ? 'capture' : 'failure',
    failureReasons: Object.freeze(failureReasons),
    stationMeanS2ActivationTimes: Object.freeze(stationMeanS2ActivationTimes),
    transverseSpreads: Object.freeze(transverseSpreads),
  });
}

export function analyzeCaptureTransition(
  trials: readonly RefractoryCaptureTrialResult[],
  resolution: number,
): CaptureTransitionAnalysis {
  if (trials.length < 2 || !(resolution > 0) || !Number.isFinite(resolution)) {
    throw new Error('Capture-transition analysis requires at least two trials and a positive finite resolution.');
  }
  const sorted = [...trials].sort((left, right) => left.couplingInterval - right.couplingInterval);
  if (new Set(sorted.map((trial) => trial.couplingInterval)).size !== sorted.length) {
    throw new Error('Capture-transition trials must have unique coupling intervals.');
  }
  const failures = sorted.filter((trial) => trial.outcome === 'failure');
  const captures = sorted.filter((trial) => trial.outcome === 'capture');
  let transitionCount = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index]!.outcome !== sorted[index - 1]!.outcome) transitionCount += 1;
  }
  const firstCaptureIndex = sorted.findIndex((trial) => trial.outcome === 'capture');
  const monotone = firstCaptureIndex >= 0
    && sorted.slice(0, firstCaptureIndex).every((trial) => trial.outcome === 'failure')
    && sorted.slice(firstCaptureIndex).every((trial) => trial.outcome === 'capture');
  const notes: string[] = [];
  if (failures.length === 0) notes.push('no failing trial was observed');
  if (captures.length === 0) notes.push('no captured trial was observed');
  if (!monotone) notes.push('outcomes are not a monotone failure-to-capture sequence');
  return Object.freeze({
    longestFailingInterval: failures.at(-1)?.couplingInterval ?? null,
    shortestCapturedInterval: captures[0]?.couplingInterval ?? null,
    transitionResolution: resolution,
    monotone,
    transitionCount,
    notes: Object.freeze(notes),
  });
}

export function buildReferenceCouplingIntervals(protocol: RefractoryCaptureProtocol): readonly number[] {
  const { minimum, maximum, resolution } = protocol.referenceScan;
  const stepCount = (maximum - minimum) / resolution;
  if (!(resolution > 0) || !Number.isFinite(resolution) || !(maximum >= minimum)
    || Math.abs(stepCount - Math.round(stepCount)) > 1e-9) {
    throw new Error('Reference capture scan bounds must contain an integer number of positive-resolution steps.');
  }
  return Object.freeze(Array.from({ length: Math.round(stepCount) + 1 }, (_, index) =>
    Number((minimum + index * resolution).toPrecision(14))));
}

export function runRefractoryCaptureStudy(
  protocol: RefractoryCaptureProtocol = defaultRefractoryCaptureProtocol,
): RefractoryCaptureStudyResult {
  validateProtocol(protocol);
  const config = createSolverConfig(protocol);
  const validationSolver = new MonodomainSolver(config);
  if (validationSolver.stableDt !== protocol.dt) {
    throw new Error(`Capture protocol requested dt ${protocol.dt} was capped to ${validationSolver.stableDt}.`);
  }
  const layout = createProbeLayout(protocol, validationSolver);
  const prepared = prepareConditioningPrefix(protocol, config, layout);
  const noS2Control = runNoS2Control(protocol, config, layout, prepared);
  const cache = new Map<number, RefractoryCaptureTrialResult>();
  const run = (interval: number): RefractoryCaptureTrialResult => {
    const step = validateAlignedInterval(interval, protocol.dt);
    const key = step;
    const cached = cache.get(key);
    if (cached) return cached;
    const normalizedInterval = Number((step * protocol.dt).toPrecision(14));
    const result = runTrial(protocol, config, layout, prepared, normalizedInterval);
    cache.set(key, result);
    return result;
  };

  const referenceIntervals = buildReferenceCouplingIntervals(protocol);
  protocol.coarseCouplingIntervals.forEach(run);
  const optimizedSearchSteps = new Set<number>();
  const runOptimized = (step: number): RefractoryCaptureTrialResult => {
    optimizedSearchSteps.add(step);
    return run(step * protocol.dt);
  };
  let failingStep = validateAlignedInterval(protocol.referenceScan.minimum, protocol.dt);
  let capturedStep = validateAlignedInterval(protocol.referenceScan.maximum, protocol.dt);
  if (runOptimized(failingStep).outcome === 'failure'
    && runOptimized(capturedStep).outcome === 'capture') {
    while (capturedStep - failingStep > 1) {
      const candidateStep = Math.floor((failingStep + capturedStep) / 2);
      if (runOptimized(candidateStep).outcome === 'failure') failingStep = candidateStep;
      else capturedStep = candidateStep;
    }
  }
  const optimizedTrials = [runOptimized(failingStep), runOptimized(capturedStep)];
  const referenceScanTrials = referenceIntervals.map(run);
  const optimizedTransition = analyzeCaptureTransition(optimizedTrials, protocol.dt);
  const referenceTransition = analyzeCaptureTransition(referenceScanTrials, protocol.dt);
  const transitionAgreement = optimizedTransition.longestFailingInterval === referenceTransition.longestFailingInterval
    && optimizedTransition.shortestCapturedInterval === referenceTransition.shortestCapturedInterval;
  const trials = [...cache.values()].sort((left, right) => left.couplingInterval - right.couplingInterval);
  const diagnostics = sumDiagnostics([
    prepared.diagnostics,
    subtractDiagnostics(noS2Control.diagnostics, prepared.diagnostics),
    ...trials.map((trial) => subtractDiagnostics(trial.diagnostics, prepared.diagnostics)),
  ]);
  const stateExtrema = combineStateExtrema([
    prepared.stateExtrema, noS2Control.stateExtrema, ...trials.map((trial) => trial.stateExtrema),
  ]);
  const acceptanceFailures = [
    ...(!noS2Control.passed ? noS2Control.failureReasons.map((reason) => `no-S2 control: ${reason}`) : []),
    ...(!referenceTransition.monotone ? referenceTransition.notes : []),
    ...(referenceTransition.transitionCount !== 1
      ? [`reference scan has ${referenceTransition.transitionCount} outcome transitions`] : []),
    ...(!transitionAgreement ? ['optimized transition does not match exhaustive reference scan'] : []),
    ...evaluateScientificDiagnostics(diagnostics).failures,
  ];
  const conditioningBeats = Object.freeze([
    ...prepared.completedBeats,
    noS2Control.finalConditioningBeat,
  ]);
  if (conditioningBeats.some((beat) => !beat.propagated)) {
    acceptanceFailures.push('one or more S1 conditioning beats did not propagate to every station');
  }
  return Object.freeze({
    protocol: copyProtocol(protocol),
    stimulus: Object.freeze({
      kind: 'rectangular-monophasic-current',
      amplitudeUnits: 'dimensionless-voltage/model-time-unit',
      integratedStrength: protocol.stimulusCurrentAmplitude * protocol.stimulusDuration,
    }),
    conditioningOnsetTimes: Object.freeze(Array.from(
      { length: protocol.conditioningPulseCount }, (_, index) => index * protocol.basicCycleLength,
    )),
    conditioningBeats,
    noS2Control,
    trials: Object.freeze(trials),
    referenceScanTrials: Object.freeze(referenceScanTrials),
    optimizedSearchIntervals: Object.freeze([...optimizedSearchSteps]
      .sort((left, right) => left - right).map((step) => Number((step * protocol.dt).toPrecision(14)))),
    optimizedTransition,
    referenceTransition,
    transitionAgreement,
    units: 'model-time-unit',
    safeguardStatus: hasStateClipping(diagnostics) ? 'clipped' : 'unclipped',
    scientificStatus: 'implementation-characterization',
    acceptance: Object.freeze({
      passed: acceptanceFailures.length === 0,
      failures: Object.freeze(acceptanceFailures),
    }),
    diagnostics,
    stateExtrema,
  });
}

function prepareConditioningPrefix(
  protocol: RefractoryCaptureProtocol,
  config: SolverConfig,
  layout: ProbeLayout,
): PreparedConditioningState {
  const solver = new MonodomainSolver(config);
  const sourceU = createStateArray(config.statePrecision, solver.tissue.size);
  const sourceV = createStateArray(config.statePrecision, solver.tissue.size);
  const durationSteps = validateAlignedInterval(protocol.stimulusDuration, protocol.dt);
  const cycleSteps = validateAlignedInterval(protocol.basicCycleLength, protocol.dt);
  const completedBeats: ConditioningBeatEvidence[] = [];
  for (let beat = 0; beat < protocol.conditioningPulseCount - 1; beat += 1) {
    const crossings = createMutableCrossings(layout.stations);
    const previous = probeValues(solver, layout.stations);
    const onsetTime = beat * protocol.basicCycleLength;
    for (let step = 0; step < cycleSteps; step += 1) {
      sourceU.fill(0);
      if (isCurrentPulseActive(step, 0, durationSteps)) {
        writeRectangularStimulusCurrent(
          sourceU, solver.tissue.mask, solver.tissue.width, solver.tissue.height,
          layout.currentRegion, protocol.stimulusCurrentAmplitude,
        );
      }
      solver.step({ voltage: sourceU, recovery: sourceV });
      updateCrossings(crossings, previous, solver, layout.stations, step * protocol.dt,
        (step + 1) * protocol.dt, protocol.threshold, Number.POSITIVE_INFINITY);
    }
    completedBeats.push(analyzeConditioningBeat(crossings, protocol, beat + 1, onsetTime));
  }
  return Object.freeze({
    voltage: solver.voltage.slice(),
    recovery: solver.recovery.slice(),
    completedBeats: Object.freeze(completedBeats),
    diagnostics: solver.diagnostics,
    stateExtrema: solver.stateExtrema,
  });
}

function runTrial(
  protocol: RefractoryCaptureProtocol,
  config: SolverConfig,
  layout: ProbeLayout,
  prepared: PreparedConditioningState,
  couplingInterval: number,
): RefractoryCaptureTrialResult {
  const solver = createPreparedSolver(config, prepared);
  const s2Step = validateAlignedInterval(couplingInterval, protocol.dt);
  const durationSteps = validateAlignedInterval(protocol.stimulusDuration, protocol.dt);
  const observationSteps = validateAlignedInterval(protocol.observationTimeAfterS2, protocol.dt);
  const sourceU = createStateArray(config.statePrecision, solver.tissue.size);
  const sourceV = createStateArray(config.statePrecision, solver.tissue.size);
  const crossings = createMutableCrossings(layout.stations);
  const previous = probeValues(solver, layout.stations);
  let preS2State: PreS2StateEvidence | null = null;
  for (let step = 0; step < s2Step + observationSteps; step += 1) {
    sourceU.fill(0);
    if (isCurrentPulseActive(step, 0, durationSteps)
      || isCurrentPulseActive(step, s2Step, durationSteps)) {
      writeRectangularStimulusCurrent(
        sourceU, solver.tissue.mask, solver.tissue.width, solver.tissue.height,
        layout.currentRegion, protocol.stimulusCurrentAmplitude,
      );
    }
    if (step === s2Step) preS2State = samplePreS2State(protocol, solver, layout.sampleIndices);
    solver.step({ voltage: sourceU, recovery: sourceV });
    updateCrossings(
      crossings, previous, solver, layout.stations, step * protocol.dt, (step + 1) * protocol.dt,
      protocol.threshold, couplingInterval,
    );
  }
  if (preS2State === null) throw new Error('Capture trial did not reach the S2 onset.');
  const frozenCrossings = freezeCrossings(crossings);
  const analysis = analyzeCaptureCrossings(frozenCrossings, protocol.maximumPlanaritySpread);
  const diagnostics = sumDiagnostics([prepared.diagnostics, solver.diagnostics]);
  return Object.freeze({
    ...analysis,
    couplingInterval,
    units: 'model-time-unit',
    safeguardStatus: hasStateClipping(diagnostics) ? 'clipped' : 'unclipped',
    stableDt: solver.stableDt,
    s2ApplicationTime: couplingInterval,
    crossingsByStation: frozenCrossings,
    finalConditioningBeat: analyzeConditioningBeat(
      crossings, protocol, protocol.conditioningPulseCount,
      (protocol.conditioningPulseCount - 1) * protocol.basicCycleLength,
    ),
    preS2State,
    diagnostics,
    stateExtrema: combineStateExtrema([prepared.stateExtrema, solver.stateExtrema]),
  });
}

function runNoS2Control(
  protocol: RefractoryCaptureProtocol,
  config: SolverConfig,
  layout: ProbeLayout,
  prepared: PreparedConditioningState,
): NoS2ControlResult {
  const solver = createPreparedSolver(config, prepared);
  const durationSteps = validateAlignedInterval(protocol.stimulusDuration, protocol.dt);
  const finalStep = validateAlignedInterval(
    protocol.referenceScan.maximum + protocol.observationTimeAfterS2, protocol.dt,
  );
  const sourceU = createStateArray(config.statePrecision, solver.tissue.size);
  const sourceV = createStateArray(config.statePrecision, solver.tissue.size);
  const crossings = createMutableCrossings(layout.stations);
  const previous = probeValues(solver, layout.stations);
  for (let step = 0; step < finalStep; step += 1) {
    sourceU.fill(0);
    if (isCurrentPulseActive(step, 0, durationSteps)) {
      writeRectangularStimulusCurrent(
        sourceU, solver.tissue.mask, solver.tissue.width, solver.tissue.height,
        layout.currentRegion, protocol.stimulusCurrentAmplitude,
      );
    }
    solver.step({ voltage: sourceU, recovery: sourceV });
    updateCrossings(
      crossings, previous, solver, layout.stations, step * protocol.dt, (step + 1) * protocol.dt,
      protocol.threshold, 0,
    );
  }
  const finalBeat = analyzeConditioningBeat(
    crossings, protocol, protocol.conditioningPulseCount,
    (protocol.conditioningPulseCount - 1) * protocol.basicCycleLength,
  );
  const spontaneous = crossings.flat().filter((probe) => probe.s2Rising !== null);
  const failureReasons = [...finalBeat.failureReasons];
  if (spontaneous.length > 0) failureReasons.push(`${spontaneous.length} probes had a post-conditioning rise without S2`);
  const diagnostics = sumDiagnostics([prepared.diagnostics, solver.diagnostics]);
  failureReasons.push(...evaluateScientificDiagnostics(diagnostics).failures);
  return Object.freeze({
    passed: failureReasons.length === 0,
    failureReasons: Object.freeze(failureReasons),
    crossingsByStation: freezeCrossings(crossings),
    finalConditioningBeat: finalBeat,
    diagnostics,
    stateExtrema: combineStateExtrema([prepared.stateExtrema, solver.stateExtrema]),
  });
}

function analyzeConditioningBeat(
  crossings: readonly (readonly ProbeCrossings[])[],
  protocol: RefractoryCaptureProtocol,
  beatNumber: number,
  onsetTime: number,
): ConditioningBeatEvidence {
  const analysis = analyzeS1Crossings(crossings, protocol.maximumPlanaritySpread);
  return Object.freeze({
    beatNumber,
    onsetTime,
    ...analysis,
    stationMeanActivationTimes: Object.freeze(analysis.stationMeanActivationTimes.map(
      (time) => time === null ? null : time + onsetTime,
    )),
  });
}

function analyzeS1Crossings(
  crossings: readonly (readonly ProbeCrossings[])[],
  maximumPlanaritySpread: number,
): Omit<ConditioningBeatEvidence, 'beatNumber' | 'onsetTime'> {
  validateCrossingShape(crossings, maximumPlanaritySpread);
  const failureReasons: string[] = [];
  const means: Array<number | null> = [];
  const spreads: Array<number | null> = [];
  crossings.forEach((station, stationIndex) => {
    if (station.some((probe) => probe.s1Rising === null || probe.s1Falling === null)) {
      failureReasons.push(`station ${stationIndex} did not complete the S1 rise/fall cycle at every row`);
    }
    if (station.some((probe) => probe.s1Rising !== null && probe.s1Falling !== null
      && !(probe.s1Falling > probe.s1Rising))) {
      failureReasons.push(`station ${stationIndex} has a nonsequential S1 rise/fall cycle`);
    }
    const riseTimes = station.map((probe) => probe.s1Rising);
    if (riseTimes.some((time) => time === null)) {
      means.push(null);
      spreads.push(null);
      return;
    }
    const complete = riseTimes as number[];
    const spread = Math.max(...complete) - Math.min(...complete);
    means.push(average(complete));
    spreads.push(spread);
    if (spread > maximumPlanaritySpread) {
      failureReasons.push(`station ${stationIndex} S1 spread ${spread} exceeds ${maximumPlanaritySpread}`);
    }
  });
  appendOrderingFailure(means, failureReasons, 'S1');
  return Object.freeze({
    stationMeanActivationTimes: Object.freeze(means),
    transverseSpreads: Object.freeze(spreads),
    propagated: failureReasons.length === 0,
    failureReasons: Object.freeze(failureReasons),
  });
}

function createPreparedSolver(config: SolverConfig, prepared: PreparedConditioningState): MonodomainSolver {
  const solver = new MonodomainSolver(config);
  solver.voltage.set(prepared.voltage);
  solver.recovery.set(prepared.recovery);
  return solver;
}

function createProbeLayout(protocol: RefractoryCaptureProtocol, solver: MonodomainSolver): ProbeLayout {
  const maximumX = physicalCoordinateToGridIndex(
    protocol.stimulusMaximumX, protocol.dx, solver.tissue.width - 1, 'Capture stimulus maximum x',
  );
  const stations = protocol.stationX.map((x) => {
    const gridX = physicalCoordinateToGridIndex(x, protocol.dx, solver.tissue.width - 1, 'Capture station x');
    return protocol.rowY.map((y) => solver.tissue.index(
      gridX, physicalCoordinateToGridIndex(y, protocol.dx, solver.tissue.height - 1, 'Capture row y'),
    ));
  });
  const sampleX = physicalCoordinateToGridIndex(
    protocol.stimulusSampleX, protocol.dx, solver.tissue.width - 1, 'Capture stimulus sample x',
  );
  return Object.freeze({
    stations: Object.freeze(stations.map((station) => Object.freeze(station))),
    sampleIndices: Object.freeze(protocol.rowY.map((y) => solver.tissue.index(
      sampleX, physicalCoordinateToGridIndex(y, protocol.dx, solver.tissue.height - 1, 'Capture sample row y'),
    ))),
    currentRegion: Object.freeze({
      minimumX: 0,
      maximumX,
      minimumY: 0,
      maximumY: solver.tissue.height - 1,
    }),
  });
}

function samplePreS2State(
  protocol: RefractoryCaptureProtocol,
  solver: MonodomainSolver,
  sampleIndices: readonly number[],
): PreS2StateEvidence {
  return Object.freeze({
    x: protocol.stimulusSampleX,
    yCoordinates: Object.freeze([...protocol.rowY]),
    voltage: summarize(sampleIndices.map((index) => solver.voltage[index]!)),
    recovery: summarize(sampleIndices.map((index) => solver.recovery[index]!)),
  });
}

function createMutableCrossings(stations: readonly (readonly number[])[]): ProbeCrossings[][] {
  return stations.map((station) => station.map(() => ({ s1Rising: null, s1Falling: null, s2Rising: null })));
}

function probeValues(solver: MonodomainSolver, stations: readonly (readonly number[])[]): number[][] {
  return stations.map((station) => station.map((index) => solver.voltage[index]!));
}

function updateCrossings(
  crossings: ProbeCrossings[][],
  previousValues: number[][],
  solver: MonodomainSolver,
  stations: readonly (readonly number[])[],
  previousTime: number,
  currentTime: number,
  threshold: number,
  earliestSecondRise: number,
): void {
  for (let station = 0; station < stations.length; station += 1) {
    for (let row = 0; row < stations[station]!.length; row += 1) {
      const current = solver.voltage[stations[station]![row]!]!;
      const previous = previousValues[station]![row]!;
      const state = crossings[station]![row]!;
      if (state.s1Rising === null) {
        (state as { s1Rising: number | null }).s1Rising = interpolateUpwardCrossing(
          previous, current, previousTime, currentTime, threshold,
        );
      } else if (state.s1Falling === null && previous >= threshold && current < threshold) {
        (state as { s1Falling: number | null }).s1Falling = interpolateCrossing(
          previous, current, previousTime, currentTime, threshold,
        );
      } else if (state.s1Falling !== null && state.s2Rising === null && currentTime > earliestSecondRise) {
        const crossing = interpolateUpwardCrossing(previous, current, previousTime, currentTime, threshold);
        if (crossing !== null && crossing >= earliestSecondRise) {
          (state as { s2Rising: number | null }).s2Rising = crossing;
        }
      }
      previousValues[station]![row] = current;
    }
  }
}

function validateProtocol(protocol: RefractoryCaptureProtocol): void {
  for (const [name, value] of Object.entries({
    domainWidth: protocol.domainWidth,
    domainHeight: protocol.domainHeight,
    dx: protocol.dx,
    dt: protocol.dt,
    diffusion: protocol.diffusion,
    stimulusCurrentAmplitude: protocol.stimulusCurrentAmplitude,
    stimulusDuration: protocol.stimulusDuration,
    basicCycleLength: protocol.basicCycleLength,
    observationTimeAfterS2: protocol.observationTimeAfterS2,
  })) {
    if (!(value > 0) || !Number.isFinite(value)) throw new Error(`Capture ${name} must be finite and positive.`);
  }
  if (!Number.isInteger(protocol.conditioningPulseCount) || protocol.conditioningPulseCount < 2) {
    throw new Error('Capture conditioningPulseCount must be an integer of at least two.');
  }
  if (!(protocol.threshold > 0 && protocol.threshold < 1) || !Number.isFinite(protocol.threshold)) {
    throw new Error('Capture threshold must be finite and lie strictly between zero and one.');
  }
  if (protocol.stationX.length < 2 || protocol.rowY.length < 1) {
    throw new Error('Capture protocol requires at least two stations and one row.');
  }
  if (new Set(protocol.stationX).size !== protocol.stationX.length
    || new Set(protocol.rowY).size !== protocol.rowY.length) {
    throw new Error('Capture station and row coordinates must be distinct.');
  }
  for (let index = 0; index < protocol.stationX.length; index += 1) {
    if (protocol.stationX[index]! <= protocol.stimulusMaximumX
      || (index > 0 && protocol.stationX[index]! <= protocol.stationX[index - 1]!)) {
      throw new Error('Capture stations must be strictly increasing and downstream of the stimulus.');
    }
  }
  if (Math.abs(protocol.referenceScan.resolution - protocol.dt) > 1e-12) {
    throw new Error('Capture reference-scan resolution must equal dt.');
  }
  if (!(protocol.stimulusSampleX >= 0 && protocol.stimulusSampleX <= protocol.stimulusMaximumX)) {
    throw new Error('Capture stimulus sample x must lie inside the stimulus strip.');
  }
  if (!(protocol.stimulusMaximumX > 0 && protocol.stimulusMaximumX < protocol.domainWidth)) {
    throw new Error('Capture stimulus strip must have positive width inside the domain.');
  }
  if (!(protocol.maximumPlanaritySpread >= 0) || !Number.isFinite(protocol.maximumPlanaritySpread)) {
    throw new Error('Capture maximumPlanaritySpread must be finite and non-negative.');
  }
  if (!(protocol.stimulusDuration < protocol.basicCycleLength)
    || !(protocol.stimulusDuration < protocol.referenceScan.minimum)) {
    throw new Error('Capture stimulus duration must be shorter than BCL and every tested coupling interval.');
  }
  validateAlignedInterval(protocol.stimulusDuration, protocol.dt);
  validateAlignedInterval(protocol.basicCycleLength, protocol.dt);
  validateAlignedInterval(protocol.observationTimeAfterS2, protocol.dt);
  buildReferenceCouplingIntervals(protocol).forEach((interval) => validateAlignedInterval(interval, protocol.dt));
  protocol.coarseCouplingIntervals.forEach((interval) => {
    if (!(interval > 0) || !Number.isFinite(interval)) throw new Error('Capture coarse intervals must be positive.');
    validateAlignedInterval(interval, protocol.dt);
  });
}

function validateCrossingShape(
  crossings: readonly (readonly ProbeCrossings[])[],
  maximumPlanaritySpread: number,
): void {
  if (crossings.length < 2 || crossings.some((station) => station.length === 0)) {
    throw new Error('Capture analysis requires at least two non-empty downstream stations.');
  }
  if (!(maximumPlanaritySpread >= 0) || !Number.isFinite(maximumPlanaritySpread)) {
    throw new Error('Capture maximumPlanaritySpread must be finite and non-negative.');
  }
  const rowCount = crossings[0]!.length;
  if (crossings.some((station) => station.length !== rowCount)) {
    throw new Error('Capture stations must contain equal transverse row counts.');
  }
  if (crossings.some((station) => station.some((probe) =>
    [probe.s1Rising, probe.s1Falling, probe.s2Rising].some((time) => time !== null && !Number.isFinite(time))))) {
    throw new Error('Capture crossing times must be finite or null.');
  }
}

function appendOrderingFailure(
  means: readonly (number | null)[],
  failures: string[],
  label: string,
): void {
  if (means.every((time) => time !== null)) {
    for (let index = 1; index < means.length; index += 1) {
      if (!(means[index]! > means[index - 1]!)) {
        failures.push(`${label} station means are not strictly ordered downstream`);
        break;
      }
    }
  }
}

function createSolverConfig(protocol: RefractoryCaptureProtocol): SolverConfig {
  return {
    grid: {
      width: gridNodeCountForExtent(protocol.domainWidth, protocol.dx, 'Capture domain width'),
      height: gridNodeCountForExtent(protocol.domainHeight, protocol.dx, 'Capture domain height'),
      dx: protocol.dx,
    },
    diffusion: protocol.diffusion,
    requestedDt: protocol.dt,
    statePrecision: 'float32',
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
    throw new Error(`Capture interval ${interval} is not aligned to dt ${dt}.`);
  }
  return step;
}

function summarize(values: readonly number[]): Readonly<StateSummary> {
  return Object.freeze({
    values: Object.freeze([...values]),
    minimum: Math.min(...values),
    mean: average(values),
    maximum: Math.max(...values),
  });
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function freezeCrossings(crossings: readonly (readonly ProbeCrossings[])[]): readonly (readonly ProbeCrossings[])[] {
  return Object.freeze(crossings.map((station) => Object.freeze(
    station.map((probe) => Object.freeze({ ...probe })),
  )));
}

function sumDiagnostics(values: readonly NumericalDiagnostics[]): NumericalDiagnostics {
  const sum: MutableNumericalDiagnostics = createNumericalDiagnostics();
  for (const value of values) {
    for (const key of Object.keys(sum) as Array<keyof NumericalDiagnostics>) sum[key] += value[key];
  }
  return copyNumericalDiagnostics(sum);
}

function subtractDiagnostics(
  total: NumericalDiagnostics,
  prefix: NumericalDiagnostics,
): NumericalDiagnostics {
  const difference = createNumericalDiagnostics();
  for (const key of Object.keys(difference) as Array<keyof NumericalDiagnostics>) {
    difference[key] = total[key] - prefix[key];
    if (difference[key] < 0) throw new Error(`Capture diagnostic ${key} cannot decrease after conditioning.`);
  }
  return copyNumericalDiagnostics(difference);
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
    referenceScan: Object.freeze({ ...protocol.referenceScan }),
  });
}
