export type IntervalId = 'AH' | 'HV' | 'PR' | 'RR' | 'VA';

export type LandmarkKind =
  | 'p-onset'
  | 'atrial-his'
  | 'his-onset'
  | 'ventricular-onset'
  | 'retrograde-atrial-onset';

export type IntervalClassification = 'normal' | 'abnormal';

export interface NormalRange {
  readonly minimumMs: number;
  readonly maximumMs: number;
  readonly sourceLabel: string;
}

export interface IntervalDefinition {
  readonly id: IntervalId;
  readonly title: string;
  readonly startLandmark: LandmarkKind;
  readonly endLandmark: LandmarkKind;
  readonly expectedValueMs: number;
  readonly measurementToleranceMs: number;
  readonly landmarkToleranceMs: number;
  readonly normalRange?: NormalRange;
  readonly explanatoryPrompt: string;
}

export interface EgmBeatLandmarks {
  readonly beatIndex: number;
  readonly pOnsetMs?: number;
  readonly atrialHisMs?: number;
  readonly hisOnsetMs?: number;
  readonly ventricularOnsetMs: number;
  readonly retrogradeAtrialOnsetMs?: number;
}

export interface EgmChannelDefinition {
  readonly id: string;
  readonly label: string;
  readonly kind: 'surface' | 'intracardiac';
}

export interface EgmScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly mechanismLabel: string;
  readonly cycleLengthMs: number;
  readonly durationMs: number;
  readonly channels: readonly EgmChannelDefinition[];
  readonly beats: readonly EgmBeatLandmarks[];
  readonly intervals: readonly IntervalDefinition[];
  readonly waveformByChannel: Readonly<Record<string, Float64Array>>;
}

export interface CaliperPlacement {
  readonly startMs: number;
  readonly endMs: number;
}

export type LandmarkStatus = 'correct' | 'incorrect';

export interface IntervalMarkingInput {
  readonly definition: IntervalDefinition;
  readonly beats: readonly EgmBeatLandmarks[];
  readonly calipers: CaliperPlacement;
  readonly reportedValueMs: number;
  readonly classification?: IntervalClassification;
}

export interface IntervalMarkingResult {
  readonly landmarkStatus: LandmarkStatus;
  readonly matchedBeatIndex?: number;
  readonly measuredValueMs: number;
  readonly reportedValueMs: number;
  readonly expectedValueMs: number;
  readonly measurementCorrect: boolean;
  readonly classificationAssessed: boolean;
  readonly classificationCorrect?: boolean;
  readonly score: number;
  readonly maximumScore: number;
  readonly feedback: readonly string[];
}

export interface StoredAttempt {
  readonly id: string;
  readonly createdAtIso: string;
  readonly scenarioId: string;
  readonly intervalId: IntervalId;
  readonly calipers: CaliperPlacement;
  readonly reportedValueMs: number;
  readonly classification?: IntervalClassification;
  readonly result: IntervalMarkingResult;
}
