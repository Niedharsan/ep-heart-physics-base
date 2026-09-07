import type { EngineSnapshot, ScenarioId } from '../engine/core/types';
import type { TissueActivitySummary } from '../ui/TissueActivity';
import type { TutorEvidenceV1, TutorSignalSummaryV1 } from './types';

export interface BuildTutorEvidenceInput {
  readonly scenario: ScenarioId;
  readonly running: boolean;
  readonly stableDt: number | null;
  readonly snapshot: EngineSnapshot | null;
  readonly tissueActivity: TissueActivitySummary;
  readonly pacingSiteCount: number;
  readonly ecgSamples: readonly number[];
}

export function summarizeTutorSignal(samples: readonly number[]): TutorSignalSummaryV1 {
  if (samples.length === 0) {
    return Object.freeze({
      sampleCount: 0,
      minimum: null,
      maximum: null,
      peakToPeak: null,
      lastValue: null,
    });
  }

  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;

  for (const sample of samples) {
    if (!Number.isFinite(sample)) continue;
    minimum = Math.min(minimum, sample);
    maximum = Math.max(maximum, sample);
  }

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return Object.freeze({
      sampleCount: samples.length,
      minimum: null,
      maximum: null,
      peakToPeak: null,
      lastValue: null,
    });
  }

  const lastFinite = [...samples].reverse().find(Number.isFinite) ?? null;

  return Object.freeze({
    sampleCount: samples.length,
    minimum,
    maximum,
    peakToPeak: maximum - minimum,
    lastValue: lastFinite,
  });
}

export function buildTutorEvidence(input: BuildTutorEvidenceInput): TutorEvidenceV1 {
  const snapshot = input.snapshot;

  return Object.freeze({
    schemaVersion: 1,
    scenario: input.scenario,
    running: input.running,
    modelTime: snapshot?.time ?? null,
    stableDt: input.stableDt,
    grid: Object.freeze({
      width: snapshot?.width ?? null,
      height: snapshot?.height ?? null,
      dx: snapshot?.dx ?? null,
    }),
    solverStepsPerSecond: snapshot?.simulationStepsPerSecond ?? null,
    tissue: Object.freeze({
      state: input.tissueActivity.state,
      visibleActiveCellCount: input.tissueActivity.visibleActiveCellCount,
      activationFrontCellCount: input.tissueActivity.activationFrontCellCount,
      depolarizedCellCount: input.tissueActivity.depolarizedCellCount,
      peakVoltage: input.tissueActivity.peakVoltage,
    }),
    pacingSiteCount: input.pacingSiteCount,
    lesionCount: snapshot?.lesions.length ?? 0,
    pseudoEcg: summarizeTutorSignal(input.ecgSamples),
    numericalDiagnostics: snapshot
      ? Object.freeze({ ...snapshot.diagnostics })
      : null,
  });
}
