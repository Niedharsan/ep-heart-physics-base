import type { GeneratedEpSignalSet } from './contracts';

export const EP_ACQUISITION_MODEL_VERSION = 1 as const;
export type EpAcquisitionModelVersion = typeof EP_ACQUISITION_MODEL_VERSION;

export interface EpNoiseProfile {
  readonly whiteNoiseRmsMv: number;
  readonly baselineWanderAmplitudeMv: number;
  readonly baselineWanderHz: number;
  readonly mainsAmplitudeMv: number;
  readonly mainsPhaseRadians?: number;
}

export interface EpRecorderProfile {
  readonly version: EpAcquisitionModelVersion;
  readonly id: string;
  readonly inputRangeMv: number;
  readonly resolutionBits: number | null;
  readonly removeDcOffset: boolean;
  readonly noise: EpNoiseProfile;
}

export interface EpAcquisitionProcessingRequest {
  readonly signalSet: GeneratedEpSignalSet;
  readonly highPassHz: number | null;
  readonly lowPassHz: number;
  readonly notchHz: 50 | 60 | null;
  readonly recorder: EpRecorderProfile;
}

export interface EpAcquisitionProcessingResult {
  readonly signalSet: GeneratedEpSignalSet;
  readonly clippedSampleCount: number;
}
