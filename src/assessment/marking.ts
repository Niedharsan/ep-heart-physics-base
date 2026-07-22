import type {
  EgmBeatLandmarks,
  IntervalClassification,
  IntervalDefinition,
  IntervalMarkingInput,
  IntervalMarkingResult,
  LandmarkKind,
} from './types';

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

export function landmarkTime(
  beat: EgmBeatLandmarks,
  landmark: LandmarkKind,
): number | undefined {
  switch (landmark) {
    case 'p-onset':
      return beat.pOnsetMs;
    case 'atrial-his':
      return beat.atrialHisMs;
    case 'his-onset':
      return beat.hisOnsetMs;
    case 'ventricular-onset':
      return beat.ventricularOnsetMs;
    case 'retrograde-atrial-onset':
      return beat.retrogradeAtrialOnsetMs;
    default: {
      const neverLandmark: never = landmark;
      return neverLandmark;
    }
  }
}

interface CandidatePair {
  readonly beatIndex: number;
  readonly startMs: number;
  readonly endMs: number;
}

function candidatePairs(
  definition: IntervalDefinition,
  beats: readonly EgmBeatLandmarks[],
): readonly CandidatePair[] {
  const pairs: CandidatePair[] = [];
  beats.forEach((beat, index) => {
    const nextBeat = beats[index + 1];
    const startMs = landmarkTime(beat, definition.startLandmark);
    let endMs = landmarkTime(beat, definition.endLandmark);

    if (definition.id === 'RR') {
      endMs = nextBeat?.ventricularOnsetMs;
    }

    if (startMs !== undefined && endMs !== undefined && endMs > startMs) {
      pairs.push({ beatIndex: beat.beatIndex, startMs, endMs });
    }
  });
  return pairs;
}

export function classifyInterval(
  valueMs: number,
  definition: IntervalDefinition,
): IntervalClassification | undefined {
  const range = definition.normalRange;
  if (!range) return undefined;
  return valueMs >= range.minimumMs && valueMs <= range.maximumMs
    ? 'normal'
    : 'abnormal';
}

export function markIntervalMeasurement(input: IntervalMarkingInput): IntervalMarkingResult {
  const startMs = finite(input.calipers.startMs, 'Caliper start');
  const endMs = finite(input.calipers.endMs, 'Caliper end');
  const reportedValueMs = finite(input.reportedValueMs, 'Reported interval');
  const measuredValueMs = Math.abs(endMs - startMs);
  const orderedStartMs = Math.min(startMs, endMs);
  const orderedEndMs = Math.max(startMs, endMs);
  const definition = input.definition;

  const match = candidatePairs(definition, input.beats).find((pair) => (
    Math.abs(orderedStartMs - pair.startMs) <= definition.landmarkToleranceMs
    && Math.abs(orderedEndMs - pair.endMs) <= definition.landmarkToleranceMs
  ));

  const classificationAssessed = definition.normalRange !== undefined;
  const maximumScore = classificationAssessed ? 2 : 1;
  const feedback: string[] = [];

  if (!match) {
    feedback.push('The calipers were not placed on the required anatomical landmarks.');
    feedback.push('An incorrect landmark gives zero marks for the complete interval item.');
    return Object.freeze({
      landmarkStatus: 'incorrect',
      measuredValueMs,
      reportedValueMs,
      expectedValueMs: definition.expectedValueMs,
      measurementCorrect: false,
      classificationAssessed,
      classificationCorrect: classificationAssessed ? false : undefined,
      score: 0,
      maximumScore,
      feedback: Object.freeze(feedback),
    });
  }

  const caliperWithinTolerance = (
    Math.abs(measuredValueMs - definition.expectedValueMs)
    <= definition.measurementToleranceMs
  );
  const reportedWithinTolerance = (
    Math.abs(reportedValueMs - definition.expectedValueMs)
    <= definition.measurementToleranceMs
  );
  const measurementCorrect = caliperWithinTolerance && reportedWithinTolerance;

  if (measurementCorrect) {
    feedback.push(`Measurement accepted within ±${definition.measurementToleranceMs} ms.`);
  } else if (!caliperWithinTolerance) {
    feedback.push('The caliper-derived interval is outside the accepted tolerance.');
  } else {
    feedback.push('The typed interval does not match the accepted value range.');
  }

  let classificationCorrect: boolean | undefined;
  if (classificationAssessed) {
    const expectedClassification = classifyInterval(definition.expectedValueMs, definition);
    classificationCorrect = input.classification === expectedClassification;
    feedback.push(
      classificationCorrect
        ? 'Normal/abnormal interpretation is correct.'
        : 'Normal/abnormal interpretation is incorrect.',
    );
  } else {
    feedback.push('Classification is not scored because an approved normal range is not configured.');
  }

  return Object.freeze({
    landmarkStatus: 'correct',
    matchedBeatIndex: match.beatIndex,
    measuredValueMs,
    reportedValueMs,
    expectedValueMs: definition.expectedValueMs,
    measurementCorrect,
    classificationAssessed,
    classificationCorrect,
    score: (measurementCorrect ? 1 : 0) + (classificationCorrect ? 1 : 0),
    maximumScore,
    feedback: Object.freeze(feedback),
  });
}
