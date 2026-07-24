export const EP_SIGNAL_SCHEMA_VERSION = 1 as const;

export type EpSignalSchemaVersion = typeof EP_SIGNAL_SCHEMA_VERSION;
export type SignalUnit = 'mV';
export type EpChannelKind =
  | 'surface-ecg'
  | 'unipolar-egm'
  | 'bipolar-egm'
  | 'stimulus'
  | 'reference';

export interface CartesianPointMm {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface EpElectrodeContact {
  readonly id: string;
  readonly label: string;
  readonly positionMm: CartesianPointMm;
  readonly diameterMm?: number;
}

export type EpChannelGeometry =
  | Readonly<{
      type: 'surface-lead';
      leadName: string;
    }>
  | Readonly<{
      type: 'unipolar';
      contact: EpElectrodeContact;
      referenceLabel: string;
    }>
  | Readonly<{
      type: 'bipolar';
      positive: EpElectrodeContact;
      negative: EpElectrodeContact;
    }>
  | Readonly<{
      type: 'stimulus';
      contact?: EpElectrodeContact;
    }>
  | Readonly<{
      type: 'reference';
      label: string;
    }>;

export interface EpSignalChannelDefinition {
  readonly id: string;
  readonly label: string;
  readonly kind: EpChannelKind;
  readonly unit: SignalUnit;
  readonly geometry: EpChannelGeometry;
  readonly invertPolarity?: boolean;
}

export interface EpDisplayProfile {
  readonly sweepSpeedMmPerSecond: number;
  readonly gainMmPerMv: number;
  readonly minorGridMm: number;
  readonly majorGridMm: number;
}

export interface EpAcquisitionProfile {
  readonly sampleRateHz: number;
  readonly durationMs: number;
  readonly highPassHz: number | null;
  readonly lowPassHz: number;
  readonly notchHz: 50 | 60 | null;
  readonly display: EpDisplayProfile;
}

export type EpPhysiologicalEventKind =
  | 'pacing-stimulus'
  | 'atrial-activation'
  | 'av-node-entry'
  | 'his-activation'
  | 'bundle-branch-activation'
  | 'purkinje-activation'
  | 'accessory-pathway-activation'
  | 'ventricular-activation'
  | 'repolarization'
  | 'capture-transition'
  | 'conduction-block'
  | 'custom';

export interface EpPhysiologicalEvent {
  readonly id: string;
  readonly kind: EpPhysiologicalEventKind;
  readonly timeMs: number;
  readonly beatIndex: number;
  readonly siteId?: string;
  readonly channelIds?: readonly string[];
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface EpMeasurementDefinition {
  readonly id: string;
  readonly title: string;
  readonly startEventId: string;
  readonly endEventId: string;
  readonly expectedValueMs: number;
  readonly toleranceMs: number;
  readonly allowedStartChannelIds: readonly string[];
  readonly allowedEndChannelIds: readonly string[];
}

export interface EpReferenceSource {
  readonly id: string;
  readonly citation: string;
  readonly locator?: string;
  readonly purpose: 'model' | 'morphology' | 'acquisition' | 'validation' | 'clinical-rubric';
}

export type EpReviewStatus = 'draft' | 'technical-validated' | 'clinical-reviewed';

export interface EpScenarioProvenance {
  readonly scenarioVersion: string;
  readonly engineModel: string;
  readonly engineVersion: string;
  readonly reviewStatus: EpReviewStatus;
  readonly sources: readonly EpReferenceSource[];
}

export interface EpSignalScenarioDefinition {
  readonly schemaVersion: EpSignalSchemaVersion;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly deterministicSeed: number;
  readonly acquisition: EpAcquisitionProfile;
  readonly channels: readonly EpSignalChannelDefinition[];
  readonly events: readonly EpPhysiologicalEvent[];
  readonly measurements: readonly EpMeasurementDefinition[];
  readonly parameters?: Readonly<Record<string, string | number | boolean>>;
  readonly provenance: EpScenarioProvenance;
}

export interface GeneratedEpSignalChannel {
  readonly channelId: string;
  readonly unit: SignalUnit;
  readonly samples: Float64Array;
}

export interface GeneratedEpSignalSet {
  readonly schemaVersion: EpSignalSchemaVersion;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly engineVersion: string;
  readonly deterministicSeed: number;
  readonly sampleRateHz: number;
  readonly durationMs: number;
  readonly sampleCount: number;
  readonly channels: readonly GeneratedEpSignalChannel[];
  readonly events: readonly EpPhysiologicalEvent[];
}

export type EpValidationSeverity = 'error' | 'warning';

export interface EpValidationIssue {
  readonly severity: EpValidationSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
