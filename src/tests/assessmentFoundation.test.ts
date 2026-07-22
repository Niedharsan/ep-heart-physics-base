import { describe, expect, it } from 'vitest';
import { resolveAssessmentView } from '../assessment/AssessmentApp';
import { markIntervalMeasurement } from '../assessment/marking';
import {
  createIntervalMeasurementQuestion,
  toStudentAssessmentQuestion,
  validateAssessmentQuestion,
} from '../assessment/questionSchema';
import type {
  CatheterPlacementQuestionV1,
  DiagnosisQuestionV1,
} from '../assessment/questionSchema';
import { createSinusEgmScenario } from '../assessment/waveform';

function scenario() {
  return createSinusEgmScenario({
    cycleLengthMs: 700,
    ahMs: 80,
    hvMs: 45,
    prMs: 180,
    measurementToleranceMs: 5,
  });
}

describe('channel-aware assessment foundation', () => {
  it('awards zero when timing is correct but the start channel is wrong', () => {
    const current = scenario();
    const definition = current.intervals.find((interval) => interval.id === 'AH')!;
    const beat = current.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: current.beats,
      calipers: {
        start: { timeMs: beat.atrialHisMs!, channelId: 'hra' },
        end: { timeMs: beat.hisOnsetMs!, channelId: 'hbe' },
      },
      reportedValueMs: 80,
      classification: 'normal',
    });

    expect(result.timingSelectionCorrect).toBe(true);
    expect(result.channelSelectionCorrect).toBe(false);
    expect(result.landmarkStatus).toBe('incorrect');
    expect(result.score).toBe(0);
  });

  it('awards zero when channels are correct but landmark timing is wrong', () => {
    const current = scenario();
    const definition = current.intervals.find((interval) => interval.id === 'HV')!;
    const beat = current.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: current.beats,
      calipers: {
        start: { timeMs: beat.hisOnsetMs! + 30, channelId: 'hbe' },
        end: { timeMs: beat.ventricularOnsetMs + 30, channelId: 'hbe' },
      },
      reportedValueMs: 45,
      classification: 'normal',
    });

    expect(result.timingSelectionCorrect).toBe(false);
    expect(result.channelSelectionCorrect).toBe(true);
    expect(result.score).toBe(0);
  });

  it('preserves landmark-channel meaning when the two handles cross', () => {
    const current = scenario();
    const definition = current.intervals.find((interval) => interval.id === 'AH')!;
    const beat = current.beats[0]!;
    const result = markIntervalMeasurement({
      definition,
      beats: current.beats,
      calipers: {
        start: { timeMs: beat.hisOnsetMs!, channelId: 'hbe' },
        end: { timeMs: beat.atrialHisMs!, channelId: 'hbe' },
      },
      reportedValueMs: 80,
      classification: 'normal',
    });

    expect(result.landmarkStatus).toBe('correct');
    expect(result.score).toBe(2);
  });

  it('projects an interval question without its answer key for student UI use', () => {
    const current = scenario();
    const definition = current.intervals.find((interval) => interval.id === 'AH')!;
    const authored = createIntervalMeasurementQuestion(current.id, definition);
    const student = toStudentAssessmentQuestion(authored);

    expect(authored.answerKey.expectedValueMs).toBe(80);
    expect('answerKey' in student).toBe(false);
    expect(student.kind).toBe('interval-measurement');
    expect(student.questionId).toBe('baseline-sinus-intervals:AH:v1');
  });

  it('validates future diagnosis and catheter-placement question shapes', () => {
    const diagnosis: DiagnosisQuestionV1 = {
      schemaVersion: 1,
      questionId: 'future-diagnosis-v1',
      questionVersion: 1,
      taskId: 'task-2',
      kind: 'diagnosis',
      prompt: 'Identify the rhythm.',
      maximumScore: 1,
      sourceReferences: [],
      scenarioId: 'future-egm',
      answerKey: {
        correctDiagnosis: 'atrial tachycardia',
        acceptedSynonyms: ['AT'],
      },
    };
    const placement: CatheterPlacementQuestionV1 = {
      schemaVersion: 1,
      questionId: 'future-placement-v1',
      questionVersion: 1,
      taskId: 'task-1',
      kind: 'catheter-placement',
      prompt: 'Place the catheters.',
      maximumScore: 4,
      sourceReferences: [],
      availableCatheterIds: ['hra', 'hbe', 'rva', 'cs'],
      answerKey: {
        requiredPlacements: { hra: 'right-atrium', hbe: 'his-region' },
      },
    };

    expect(validateAssessmentQuestion(diagnosis)).toBe(diagnosis);
    expect(validateAssessmentQuestion(placement)).toBe(placement);
  });

  it('defaults to student view and exposes instructor controls only through the explicit preview query', () => {
    expect(resolveAssessmentView('')).toBe('student');
    expect(resolveAssessmentView('?mode=assessment')).toBe('student');
    expect(resolveAssessmentView('?mode=assessment&view=instructor')).toBe('instructor');
    expect(resolveAssessmentView('?view=other')).toBe('student');
  });
});
