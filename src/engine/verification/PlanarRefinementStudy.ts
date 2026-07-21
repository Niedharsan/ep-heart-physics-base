import { defaultAlievPanfilovParameters } from '../models/AlievPanfilov';
import type { ModelParameters } from '../core/types';
import { gridNodeCountForExtent, physicalCoordinateToGridIndex } from './PhysicalCoordinates';
import {
  measurePlanarConductionVelocity,
  type PlanarVelocityResult,
} from './PlanarConductionVelocity';
import {
  analyzeRefinementTrend,
  validateRefinementDefinition,
  type RefinementTrendGates,
  type RefinementTrendResult,
} from './ConvergenceTrend';

export interface PlanarRefinementProtocol {
  readonly domainWidth: number;
  readonly domainHeight: number;
  readonly diffusion: number;
  readonly model: ModelParameters;
  readonly stimulusMaximumX: number;
  readonly threshold: number;
  readonly stationX: readonly number[];
  readonly rowY: readonly number[];
  readonly maximumModelTime: number;
  readonly minimumRSquared: number;
  readonly spatialDx: readonly [number, number, number];
  readonly spatialDt: number;
  readonly temporalDx: number;
  readonly temporalDt: readonly [number, number, number];
  readonly gates: RefinementTrendGates;
}

export interface PlanarRefinementStudyResult {
  readonly protocol: PlanarRefinementProtocol;
  readonly spatialRuns: readonly PlanarVelocityResult[];
  readonly temporalRuns: readonly PlanarVelocityResult[];
  readonly spatialTrend: RefinementTrendResult;
  readonly temporalTrend: RefinementTrendResult;
  readonly uniqueRunCount: number;
  readonly safeguardStatus: 'unclipped' | 'clipped';
}

export const defaultPlanarRefinementProtocol: PlanarRefinementProtocol = Object.freeze({
  domainWidth: 48,
  domainHeight: 12,
  diffusion: 0.8,
  model: defaultAlievPanfilovParameters,
  stimulusMaximumX: 2,
  threshold: 0.5,
  stationX: Object.freeze([12, 18, 24, 30, 36]),
  rowY: Object.freeze([3, 6, 9]),
  maximumModelTime: 30,
  minimumRSquared: 0.999,
  spatialDx: Object.freeze([1, 0.5, 0.25]) as readonly [number, number, number],
  spatialDt: 0.005,
  temporalDx: 0.25,
  temporalDt: Object.freeze([0.01, 0.005, 0.0025]) as readonly [number, number, number],
  gates: Object.freeze({
    refinementRatio: 2,
    maximumContraction: 0.75,
    minimumApparentOrder: 0.5,
    maximumFinestPairRelativeChange: 0.02,
  }),
});

export function runPlanarRefinementStudy(
  protocol: PlanarRefinementProtocol = defaultPlanarRefinementProtocol,
): PlanarRefinementStudyResult {
  validateStudyProtocol(protocol);
  const cache = new Map<string, PlanarVelocityResult>();
  const run = (dx: number, requestedDt: number): PlanarVelocityResult => {
    const key = `${dx}:${requestedDt}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const width = gridNodeCountForExtent(protocol.domainWidth, dx, 'Planar domain width');
    const height = gridNodeCountForExtent(protocol.domainHeight, dx, 'Planar domain height');
    const result = measurePlanarConductionVelocity({
      solverConfig: {
        grid: { width, height, dx },
        diffusion: protocol.diffusion,
        requestedDt,
        stepsPerFrame: 1,
        model: protocol.model,
      },
      stimulusMaximumX: protocol.stimulusMaximumX,
      threshold: protocol.threshold,
      xStations: protocol.stationX.map((coordinate) => physicalCoordinateToGridIndex(
        coordinate, dx, width - 1, 'Planar station x',
      )),
      yRows: protocol.rowY.map((coordinate) => physicalCoordinateToGridIndex(
        coordinate, dx, height - 1, 'Planar row y',
      )),
      maximumModelTime: protocol.maximumModelTime,
      minimumRSquared: protocol.minimumRSquared,
      maximumPlanaritySpread: requestedDt,
    });
    if (result.stableDt !== requestedDt) {
      throw new Error(`Planar refinement requested dt ${requestedDt} was capped to ${result.stableDt}.`);
    }
    cache.set(key, result);
    return result;
  };

  const spatialRuns = protocol.spatialDx.map((dx) => run(dx, protocol.spatialDt));
  const temporalRuns = protocol.temporalDt.map((dt) => run(protocol.temporalDx, dt));
  const spatialTrend = analyzeRefinementTrend({
    parameterName: 'dx',
    parameterUnits: 'model-length-unit',
    quantityUnits: 'model-length-unit/model-time-unit',
    parameterValues: protocol.spatialDx,
    quantities: spatialRuns.map((result) => result.speed),
    gates: protocol.gates,
  });
  const temporalTrend = analyzeRefinementTrend({
    parameterName: 'dt',
    parameterUnits: 'model-time-unit',
    quantityUnits: 'model-length-unit/model-time-unit',
    parameterValues: protocol.temporalDt,
    quantities: temporalRuns.map((result) => result.speed),
    gates: protocol.gates,
  });
  const runs = [...spatialRuns, ...temporalRuns];
  return Object.freeze({
    protocol: copyProtocol(protocol),
    spatialRuns: Object.freeze(spatialRuns),
    temporalRuns: Object.freeze(temporalRuns),
    spatialTrend,
    temporalTrend,
    uniqueRunCount: cache.size,
    safeguardStatus: runs.some((result) => result.safeguardStatus === 'clipped') ? 'clipped' : 'unclipped',
  });
}

function validateStudyProtocol(protocol: PlanarRefinementProtocol): void {
  if (!(protocol.diffusion > 0) || !Number.isFinite(protocol.diffusion)) {
    throw new Error('Planar refinement diffusion must be finite and positive.');
  }
  if (protocol.stationX.length < 3 || protocol.rowY.length < 1) {
    throw new Error('Planar refinement requires at least three stations and one row.');
  }
  if (protocol.spatialDx.length !== 3 || protocol.temporalDt.length !== 3) {
    throw new Error('Planar refinement requires exactly three spatial and temporal levels.');
  }
  if (!(protocol.spatialDt > 0) || !Number.isFinite(protocol.spatialDt)
    || !(protocol.temporalDx > 0) || !Number.isFinite(protocol.temporalDx)) {
    throw new Error('Planar refinement fixed spatial dt and temporal dx must be finite and positive.');
  }
  validateRefinementDefinition(protocol.spatialDx, protocol.gates);
  validateRefinementDefinition(protocol.temporalDt, protocol.gates);
}

function copyProtocol(protocol: PlanarRefinementProtocol): PlanarRefinementProtocol {
  return Object.freeze({
    ...protocol,
    model: Object.freeze({ ...protocol.model }),
    stationX: Object.freeze([...protocol.stationX]),
    rowY: Object.freeze([...protocol.rowY]),
    spatialDx: Object.freeze([...protocol.spatialDx]) as unknown as readonly [number, number, number],
    temporalDt: Object.freeze([...protocol.temporalDt]) as unknown as readonly [number, number, number],
    gates: Object.freeze({ ...protocol.gates }),
  });
}
