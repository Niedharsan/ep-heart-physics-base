import type { ModelParameters } from '../core/types';
import { alievPanfilovPresets } from '../models/AlievPanfilov';
import { analyzeRefinementTrend, type RefinementTrendGates, type RefinementTrendResult } from './ConvergenceTrend';
import { gridNodeCountForExtent } from './PhysicalCoordinates';
import { measureRadialSymmetry, type RadialSymmetryResult } from './RadialSymmetry';
import {
  evaluateRefinementTrend,
  evaluateScientificDiagnostics,
  validateRefinementGates,
  type VerificationAcceptance,
} from './VerificationAcceptance';

export type RadialGridPhase = 'node-centred' | 'half-cell-shifted';

export interface RadialSensitivityProtocol {
  readonly domainExtent: number;
  readonly diffusion: number;
  readonly model: ModelParameters;
  readonly dxLevels: readonly [number, number, number];
  readonly dt: number;
  readonly baseCenterX: number;
  readonly baseCenterY: number;
  readonly stimulusRadius: number;
  readonly sampleRadii: readonly [number, number];
  readonly angleCount: number;
  readonly threshold: number;
  readonly maximumModelTime: number;
  readonly maximumDirectionalSpeedDeviation: number;
  readonly maximumOuterActivationSpread: number;
  readonly refinementGates: RefinementTrendGates;
}

export interface RadialSensitivityCase {
  readonly dx: number;
  readonly phase: RadialGridPhase;
  readonly centerX: number;
  readonly centerY: number;
  readonly result: RadialSymmetryResult;
}

export interface RadialPhaseTrend {
  readonly phase: RadialGridPhase;
  readonly trend: RefinementTrendResult;
  readonly acceptance: VerificationAcceptance;
}

export interface RadialSensitivityStudyResult {
  readonly protocol: RadialSensitivityProtocol;
  readonly cases: readonly RadialSensitivityCase[];
  readonly phaseTrends: readonly RadialPhaseTrend[];
  readonly shiftedCenterRelativeDifferences: readonly number[];
  readonly scientificAcceptance: VerificationAcceptance;
}

export const defaultRadialSensitivityProtocol: RadialSensitivityProtocol = Object.freeze({
  domainExtent: 48,
  diffusion: 0.8,
  model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
  dxLevels: Object.freeze([1, 0.5, 0.25]) as readonly [number, number, number],
  dt: 0.005,
  baseCenterX: 24,
  baseCenterY: 24,
  stimulusRadius: 2,
  sampleRadii: Object.freeze([8, 14]) as readonly [number, number],
  angleCount: 32,
  threshold: 0.5,
  maximumModelTime: 20,
  maximumDirectionalSpeedDeviation: 0.02,
  maximumOuterActivationSpread: 0.08,
  refinementGates: Object.freeze({
    refinementRatio: 2,
    maximumContraction: 0.75,
    minimumApparentOrder: 0.5,
    maximumFinestPairRelativeChange: 0.02,
  }),
});

export function runRadialSensitivityStudy(
  protocol: RadialSensitivityProtocol = defaultRadialSensitivityProtocol,
): RadialSensitivityStudyResult {
  validateProtocol(protocol);
  const cases = protocol.dxLevels.flatMap((dx) => ([
    runCase(protocol, dx, 'node-centred'),
    runCase(protocol, dx, 'half-cell-shifted'),
  ]));
  const phaseTrends = (['node-centred', 'half-cell-shifted'] as const).map((phase) => {
    const phaseCases = cases.filter((entry) => entry.phase === phase);
    const trend = analyzeRefinementTrend({
      parameterName: 'dx',
      parameterUnits: 'model-length-unit',
      quantityUnits: 'model-length-unit/model-time-unit',
      parameterValues: protocol.dxLevels,
      quantities: phaseCases.map((entry) => entry.result.meanDirectionalSpeed),
      refinementRatio: protocol.refinementGates.refinementRatio,
    });
    return Object.freeze({
      phase,
      trend,
      acceptance: evaluateRefinementTrend(trend, protocol.refinementGates),
    });
  });
  const shiftedCenterRelativeDifferences = protocol.dxLevels.map((dx) => {
    const nodeSpeed = cases.find((entry) => entry.dx === dx && entry.phase === 'node-centred')!
      .result.meanDirectionalSpeed;
    const shiftedSpeed = cases.find((entry) => entry.dx === dx && entry.phase === 'half-cell-shifted')!
      .result.meanDirectionalSpeed;
    return Math.abs(shiftedSpeed - nodeSpeed) / ((shiftedSpeed + nodeSpeed) / 2);
  });
  const failures = cases.flatMap((entry) => evaluateScientificDiagnostics(entry.result.diagnostics).failures
    .map((failure) => `dx=${entry.dx}, ${entry.phase}: ${failure}`));
  return Object.freeze({
    protocol: copyProtocol(protocol),
    cases: Object.freeze(cases),
    phaseTrends: Object.freeze(phaseTrends),
    shiftedCenterRelativeDifferences: Object.freeze(shiftedCenterRelativeDifferences),
    scientificAcceptance: Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures) }),
  });
}

function runCase(
  protocol: RadialSensitivityProtocol,
  dx: number,
  phase: RadialGridPhase,
): RadialSensitivityCase {
  const nodeCount = gridNodeCountForExtent(protocol.domainExtent, dx, 'Radial domain extent');
  const shift = phase === 'half-cell-shifted' ? dx / 2 : 0;
  const centerX = protocol.baseCenterX + shift;
  const centerY = protocol.baseCenterY + shift;
  const result = measureRadialSymmetry({
    solverConfig: {
      grid: { width: nodeCount, height: nodeCount, dx },
      diffusion: protocol.diffusion,
      requestedDt: protocol.dt,
      statePrecision: 'float32',
      model: protocol.model,
    },
    centerX,
    centerY,
    stimulusRadius: protocol.stimulusRadius,
    sampleRadii: protocol.sampleRadii,
    angleCount: protocol.angleCount,
    threshold: protocol.threshold,
    maximumModelTime: protocol.maximumModelTime,
    maximumDirectionalSpeedDeviation: protocol.maximumDirectionalSpeedDeviation,
    maximumOuterActivationSpread: protocol.maximumOuterActivationSpread,
  });
  return Object.freeze({ dx, phase, centerX, centerY, result });
}

function validateProtocol(protocol: RadialSensitivityProtocol): void {
  validateRefinementGates(protocol.refinementGates);
  if (!(protocol.domainExtent > 0) || !Number.isFinite(protocol.domainExtent)
    || !(protocol.dt > 0) || !Number.isFinite(protocol.dt)) {
    throw new Error('Radial sensitivity extent and timestep must be finite and positive.');
  }
  if (protocol.dxLevels.length !== 3) throw new Error('Radial sensitivity requires three dx levels.');
  const firstRatio = protocol.dxLevels[0] / protocol.dxLevels[1];
  const secondRatio = protocol.dxLevels[1] / protocol.dxLevels[2];
  if (firstRatio !== protocol.refinementGates.refinementRatio
    || secondRatio !== protocol.refinementGates.refinementRatio) {
    throw new Error('Radial dx levels must match the configured refinement ratio.');
  }
}

function copyProtocol(protocol: RadialSensitivityProtocol): RadialSensitivityProtocol {
  return Object.freeze({
    ...protocol,
    model: Object.freeze({ ...protocol.model }),
    dxLevels: Object.freeze([...protocol.dxLevels]) as unknown as readonly [number, number, number],
    sampleRadii: Object.freeze([...protocol.sampleRadii]) as unknown as readonly [number, number],
    refinementGates: Object.freeze({ ...protocol.refinementGates }),
  });
}
