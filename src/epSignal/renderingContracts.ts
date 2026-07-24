import type {
  EpPhysiologicalEvent,
  EpPhysiologicalEventKind,
  GeneratedEpSignalSet,
} from './contracts';

export const EP_RENDERER_SCHEMA_VERSION = 1 as const;
export type EpRendererSchemaVersion = typeof EP_RENDERER_SCHEMA_VERSION;

export interface EpRenderPointMm {
  readonly x: number;
  readonly y: number;
}

export interface EpRenderRectMm {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface EpRenderMarginsMm {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface EpRenderGridProfile {
  readonly minorSpacingMm: number;
  readonly majorSpacingMm: number;
}

export interface EpCalibrationPulseProfile {
  readonly enabled: boolean;
  readonly amplitudeMv: number;
  readonly leadInMs: number;
  readonly plateauMs: number;
  readonly leadOutMs: number;
  readonly rightGapMm: number;
}

export interface EpRenderChannelProfile {
  readonly channelId: string;
  readonly label: string;
  readonly gainMmPerMv: number;
  readonly heightMm: number;
  readonly strokeWidthMm: number;
  readonly invertPolarity?: boolean;
}

export interface EpSignalStripRenderProfile {
  readonly schemaVersion: EpRendererSchemaVersion;
  readonly id: string;
  readonly paperSpeedMmPerSecond: number;
  readonly startTimeMs: number;
  readonly durationMs: number;
  readonly marginsMm: EpRenderMarginsMm;
  readonly channelGapMm: number;
  readonly grid: EpRenderGridProfile;
  readonly calibration: EpCalibrationPulseProfile;
  readonly minimumHorizontalStepMm: number;
  readonly timeMarkerIntervalMs: number | null;
  readonly showEventMarkers: boolean;
  readonly eventKinds?: readonly EpPhysiologicalEventKind[];
  readonly channels: readonly EpRenderChannelProfile[];
}

export interface EpSignalStripRenderRequest {
  readonly signalSet: GeneratedEpSignalSet;
  readonly profile: EpSignalStripRenderProfile;
}

export type EpGridLineKind = 'minor' | 'major';

export interface EpGridLineGeometry {
  readonly orientation: 'horizontal' | 'vertical';
  readonly kind: EpGridLineKind;
  readonly positionMm: number;
}

export interface EpCalibrationPulseGeometry {
  readonly channelId: string;
  readonly pathData: string;
  readonly points: readonly EpRenderPointMm[];
  readonly amplitudeMm: number;
  readonly plateauWidthMm: number;
}

export interface EpRenderedChannelGeometry {
  readonly channelId: string;
  readonly label: string;
  readonly gainMmPerMv: number;
  readonly baselineY: number;
  readonly clipRect: EpRenderRectMm;
  readonly strokeWidthMm: number;
  readonly pathData: string;
  readonly points: readonly EpRenderPointMm[];
  readonly sourceSampleCount: number;
  readonly renderedPointCount: number;
}

export interface EpRenderedEventMarker {
  readonly event: EpPhysiologicalEvent;
  readonly xMm: number;
}

export interface EpRenderedTimeMarker {
  readonly timeMs: number;
  readonly xMm: number;
  readonly label: string;
}

export interface EpSignalRenderScene {
  readonly schemaVersion: EpRendererSchemaVersion;
  readonly profileId: string;
  readonly scenarioId: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly plotRect: EpRenderRectMm;
  readonly gridLines: readonly EpGridLineGeometry[];
  readonly channels: readonly EpRenderedChannelGeometry[];
  readonly calibrationPulses: readonly EpCalibrationPulseGeometry[];
  readonly eventMarkers: readonly EpRenderedEventMarker[];
  readonly timeMarkers: readonly EpRenderedTimeMarker[];
}

export type EpSvgTheme = 'clinical-light' | 'monochrome';

export interface EpSvgRenderOptions {
  readonly theme: EpSvgTheme;
  readonly includeBackground: boolean;
  readonly ariaLabel: string;
}
