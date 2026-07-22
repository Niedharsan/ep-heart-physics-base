import type {
  CaliperEndpoint,
  EgmBeatLandmarks,
  IntervalClassification,
  IntervalDefinition,
  IntervalMarkingInput,
  IntervalMarkingResult,
  LandmarkKind,
  LandmarkReference,
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
    const startMs = landmarkTime(beat, definition.startReference.landmark);
    let endMs = landmarkTime(beat, definition.endReference.landmark);

    if (definition.id === 'RR') {
      endMs = nextBeat?.ventricularOnsetMs;
    }

    if (startMs !== undefined && endMs !== undefined && endMs > startMs) {
      pairs.push({ beatIndex: beat.beatIndex, startMs, endMs });
    }
  });
  return pairs;
}

function orderedEndpoints(
  start: CaliperEndpoint,
  end: CaliperEndpoint,
): readonly [CaliperEndpoint, CaliperEndpoint] {
  return start.timeMs <= end.timeMs ? [start, end] : [end, start];
}

function channelAllowed(endpoint: CaliperEndpoint, reference: LandmarkReference): boolean {
  return reference.allowedChannelIds.includes(endpoint.channelId);
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
  const rawStart: CaliperEndpoint = {
    timeMs: finite(input.calipers.start.timeMs, 'Caliper start'),
    channelId: input.calipers.start.channelId,
  };
  const rawEnd: CaliperEndpoint = {
    timeMs: finite(input.calipers.end.timeMs, 'Caliper end'),
    channelId: input.calipers.end.channelId,
  };
  if (rawStart.channelId.trim().length === 0 || rawEnd.channelId.trim().length === 0) {
    throw new Error('Caliper channels must not be empty.');
  }

  const reportedValueMs = finite(input.reportedValueMs, 'Reported interval');
  const [orderedStart, orderedEnd] = orderedEndpoints(rawStart, rawEnd);
  const measuredValueMs = orderedEnd.timeMs - orderedStart.timeMs;
  const definition = input.definition;

  const timingMatch = candidatePairs(definition, input.beats).find((pair) => (
    Math.abs(orderedStart.timeMs - pair.startMs) <= definition.landmarkToleranceMs
    && Math.abs(orderedEnd.timeMs - pair.endMs) <= definition.landmarkToleranceMs
  ));
  const timingSelectionCorrect = timingMatch !== undefined;
  const channelSelectionCorrect = (
    channelAllowed(orderedStart, definition.startReference)
    && channelAllowed(orderedEnd, definition.endReference)
  );

  const classificationAssessed = definition.normalRange !== undefined;
  const maximumScore = classificationAssessed ? 2 : 1;
  const feedback: string[] = [];

  if (!timingSelectionCorrect || !channelSelectionCorrect) {
    if (!timingSelectionCorrect) {
      feedback.push('One or both calipers are outside the accepted landmark timing window.');
    }
    if (!channelSelectionCorrect) {
      feedback.push('One or both calipers are on the wrong EGM channel for this interval.');
    }
    feedback.push('An incorrect anatomical landmark or channel gives zero marks for the complete interval item.');
    return Object.freeze({
      landmarkStatus: 'incorrect',
      channelSelectionCorrect,
      timingSelectionCorrect,
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
    feedback.push('Measurement accepted within the configured tolerance.');
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
    channelSelectionCorrect,
    timingSelectionCorrect,
    matchedBeatIndex: timingMatch.beatIndex,
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
