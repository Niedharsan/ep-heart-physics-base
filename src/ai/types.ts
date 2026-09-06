import type { ScenarioId } from '../engine/core/types';
import type { TissueActivityState } from '../ui/TissueActivity';
import type { TutorActionV1 } from './tutorActions';

export interface TutorSignalSummaryV1 {
  readonly sampleCount: number;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly peakToPeak: number | null;
  readonly lastValue: number | null;
}

export interface TutorNumericalDiagnosticsV1 {
  readonly denominatorGuardCount: number;
  readonly voltageClipLowCount: number;
  readonly voltageClipHighCount: number;
  readonly recoveryClipLowCount: number;
  readonly recoveryClipHighCount: number;
  readonly nonFiniteStateCount: number;
}

export interface TutorEvidenceV1 {
  readonly schemaVersion: 1;
  readonly scenario: ScenarioId;
  readonly running: boolean;
  readonly modelTime: number | null;
  readonly stableDt: number | null;
  readonly grid: Readonly<{
    width: number | null;
    height: number | null;
    dx: number | null;
  }>;
  readonly solverStepsPerSecond: number | null;
  readonly tissue: Readonly<{
    state: TissueActivityState;
    visibleActiveCellCount: number;
    activationFrontCellCount: number;
    depolarizedCellCount: number;
    peakVoltage: number;
  }>;
  readonly pacingSiteCount: number;
  readonly lesionCount: number;
  readonly pseudoEcg: TutorSignalSummaryV1;
  readonly numericalDiagnostics: TutorNumericalDiagnosticsV1 | null;
}

export interface TutorRequestV1 {
  readonly question: string;
  readonly evidence: TutorEvidenceV1;
}

export interface TutorResponseV1 {
  readonly answer: string;
  readonly evidenceUsed: readonly string[];
  readonly limitations: readonly string[];
  readonly proposedActions: readonly TutorActionV1[];
}
