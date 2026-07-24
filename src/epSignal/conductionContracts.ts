import type {
  EpPhysiologicalEvent,
  EpPhysiologicalEventKind,
} from './contracts';

export const EP_CONDUCTION_SCHEMA_VERSION = 1 as const;
export type EpConductionSchemaVersion = typeof EP_CONDUCTION_SCHEMA_VERSION;

export type EpConductionNodeKind =
  | 'sinoatrial-node'
  | 'atrial-myocardium'
  | 'av-node'
  | 'his-bundle'
  | 'bundle-branch'
  | 'fascicle'
  | 'purkinje-network'
  | 'ventricular-myocardium'
  | 'accessory-pathway'
  | 'pacing-electrode'
  | 'custom';

export interface EpNodeRefractoryModel {
  readonly absoluteRefractoryPeriodMs: number;
  readonly relativeRefractoryPeriodMs?: number;
  readonly relativeCaptureThresholdMultiplier?: number;
}

export interface EpConductionNodeDefinition {
  readonly id: string;
  readonly label: string;
  readonly kind: EpConductionNodeKind;
  readonly refractory: EpNodeRefractoryModel;
  readonly eventKind: Exclude<
    EpPhysiologicalEventKind,
    'pacing-stimulus' | 'capture-transition' | 'conduction-block'
  >;
  readonly siteId?: string;
  readonly channelIds?: readonly string[];
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
  readonly initialLastActivationMs?: number;
}

export type EpConductionDelayModel =
  | Readonly<{
      kind: 'fixed';
      delayMs: number;
    }>
  | Readonly<{
      kind: 'recovery';
      minimumDelayMs: number;
      maximumAdditionalDelayMs: number;
      recoveryTimeConstantMs: number;
      maximumDelayMs: number;
    }>
  | Readonly<{
      kind: 'av-nodal-history';
      minimumDelayMs: number;
      maximumRecoveryDelayMs: number;
      recoveryTimeConstantMs: number;
      fatigueIncrementMs: number;
      fatigueDecayTimeConstantMs: number;
      maximumFatigueMs: number;
      facilitationMagnitudeMs: number;
      facilitationWindowMs: number;
      maximumDelayMs: number;
    }>;

export interface EpConductionArcDefinition {
  readonly id: string;
  readonly label: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly pathwayId?: string;
  readonly effectiveRefractoryPeriodMs: number;
  readonly delay: EpConductionDelayModel;
  readonly enabled?: boolean;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
  readonly initialLastDepartureMs?: number;
  readonly initialFatigueMs?: number;
}

export interface EpConductionNetworkDefinition {
  readonly schemaVersion: EpConductionSchemaVersion;
  readonly id: string;
  readonly title: string;
  readonly networkVersion: string;
  readonly nodes: readonly EpConductionNodeDefinition[];
  readonly arcs: readonly EpConductionArcDefinition[];
}

export type EpScheduledActivationOrigin = 'sinus' | 'ectopic' | 'induced' | 'custom';

export interface EpScheduledActivation {
  readonly id: string;
  readonly nodeId: string;
  readonly timeMs: number;
  readonly beatIndex: number;
  readonly origin: EpScheduledActivationOrigin;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface EpStrengthDurationModel {
  readonly rheobaseMa: number;
  readonly chronaxieMs: number;
}

export interface EpPacingCaptureTarget {
  readonly nodeId: string;
  readonly latencyMs: number;
  readonly threshold: EpStrengthDurationModel;
}

export interface EpPacingStimulus {
  readonly id: string;
  readonly siteId: string;
  readonly timeMs: number;
  readonly beatIndex: number;
  readonly amplitudeMa: number;
  readonly pulseWidthMs: number;
  readonly channelIds?: readonly string[];
  readonly targets: readonly EpPacingCaptureTarget[];
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface EpConductionSimulationRequest {
  readonly network: EpConductionNetworkDefinition;
  readonly durationMs: number;
  readonly scheduledActivations: readonly EpScheduledActivation[];
  readonly pacingStimuli: readonly EpPacingStimulus[];
  readonly maxProcessedQueueItems?: number;
}

export type EpActivationSourceKind = 'scheduled' | 'pacing' | 'propagated';

export interface EpActivationRecord {
  readonly id: string;
  readonly nodeId: string;
  readonly timeMs: number;
  readonly beatIndex: number;
  readonly sourceKind: EpActivationSourceKind;
  readonly sourceId: string;
  readonly parentPropagationId?: string;
}

export type EpActivationRejectionReason =
  | 'node-refractory'
  | 'simultaneous-collision'
  | 'relative-refractory-capture-threshold';

export interface EpActivationRejection {
  readonly id: string;
  readonly nodeId: string;
  readonly timeMs: number;
  readonly beatIndex: number;
  readonly sourceKind: EpActivationSourceKind;
  readonly sourceId: string;
  readonly reason: EpActivationRejectionReason;
  readonly parentPropagationId?: string;
}

export type EpPropagationStatus =
  | 'conducted'
  | 'blocked-disabled'
  | 'blocked-pathway-refractory'
  | 'blocked-target-refractory'
  | 'collision'
  | 'outside-recording-window';

export interface EpPropagationRecord {
  readonly id: string;
  readonly arcId: string;
  readonly sourceActivationId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly departureTimeMs: number;
  readonly arrivalTimeMs: number | null;
  readonly delayMs: number | null;
  readonly status: EpPropagationStatus;
}

export type EpCaptureFailureReason =
  | 'subthreshold'
  | 'node-refractory'
  | 'relative-refractory-threshold';

export interface EpPacingCaptureResult {
  readonly stimulusId: string;
  readonly targetNodeId: string;
  readonly captureTimeMs: number;
  readonly nominalThresholdMa: number;
  readonly effectiveThresholdMa: number;
  readonly captured: boolean;
  readonly failureReason?: EpCaptureFailureReason;
}

export interface EpConductionNodeStateSnapshot {
  readonly nodeId: string;
  readonly lastActivationMs: number | null;
  readonly activationCount: number;
}

export interface EpConductionArcStateSnapshot {
  readonly arcId: string;
  readonly lastDepartureMs: number | null;
  readonly propagationCount: number;
  readonly fatigueMs: number;
}

export interface EpConductionTimeline {
  readonly networkId: string;
  readonly networkVersion: string;
  readonly durationMs: number;
  readonly activations: readonly EpActivationRecord[];
  readonly rejectedActivations: readonly EpActivationRejection[];
  readonly propagations: readonly EpPropagationRecord[];
  readonly captures: readonly EpPacingCaptureResult[];
  readonly physiologicalEvents: readonly EpPhysiologicalEvent[];
  readonly finalNodeStates: readonly EpConductionNodeStateSnapshot[];
  readonly finalArcStates: readonly EpConductionArcStateSnapshot[];
  readonly processedQueueItems: number;
}
