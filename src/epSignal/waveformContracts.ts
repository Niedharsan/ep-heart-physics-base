import type {
  CartesianPointMm,
  EpPhysiologicalEventKind,
  EpSignalScenarioDefinition,
  GeneratedEpSignalSet,
} from './contracts';

export const EP_WAVEFORM_SCHEMA_VERSION = 1 as const;
export type EpWaveformSchemaVersion = typeof EP_WAVEFORM_SCHEMA_VERSION;

export interface EpVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type EpWaveformKernel =
  | Readonly<{ kind: 'gaussian'; widthMs: number }>
  | Readonly<{ kind: 'gaussian-derivative'; widthMs: number; order: 1 | 2 }>
  | Readonly<{ kind: 'difference-of-gaussians'; narrowWidthMs: number; broadWidthMs: number; broadScale: number }>;

export interface EpActivationSourceDefinition {
  readonly id: string;
  readonly label: string;
  readonly eventKind: EpPhysiologicalEventKind;
  readonly siteId?: string;
  readonly positionMm: CartesianPointMm;
  readonly dipoleDirection: EpVector3;
  readonly amplitudeMv: number;
  readonly kernel: EpWaveformKernel;
  readonly surfaceLeadWeights?: Readonly<Record<string, number>>;
  readonly farFieldScale?: number;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface EpStimulusArtifactModel {
  readonly amplitudeMv: number;
  readonly decayTimeConstantMs: number;
  readonly oppositeLobeScale: number;
  readonly oppositeLobeDelayMs: number;
}

export interface EpWaveformSynthesisDefinition {
  readonly schemaVersion: EpWaveformSchemaVersion;
  readonly id: string;
  readonly modelVersion: string;
  readonly sources: readonly EpActivationSourceDefinition[];
  readonly conductivityScale: number;
  readonly minimumDistanceMm: number;
  readonly stimulusArtifact: EpStimulusArtifactModel;
}

export interface EpWaveformSynthesisRequest {
  readonly scenario: EpSignalScenarioDefinition;
  readonly model: EpWaveformSynthesisDefinition;
}

export interface EpWaveformSynthesisResult {
  readonly signalSet: GeneratedEpSignalSet;
  readonly matchedEventCount: number;
  readonly unmatchedEventIds: readonly string[];
}
