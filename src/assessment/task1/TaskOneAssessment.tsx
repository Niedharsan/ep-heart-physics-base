import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../../clientPreview/ClientModuleNav';
import { appHref } from '../../appHref';
import type { AssessmentView } from '../assessmentView';
import { AssessmentSessionBoundary } from '../AssessmentSessionBoundary';
import {
  buildAssessmentHref,
  useAssessmentSessionController,
} from '../sessionController';
import type { AssessmentSubmitReason, SharedAssessmentMode } from '../sessionController';
import {
  clearAssessmentWorkingState,
  loadAssessmentDraft,
  saveAssessmentDraft,
} from '../workingState';
import { EgmCaliperCanvas } from '../EgmCaliperCanvas';
import { markIntervalMeasurement } from '../marking';
import type { CaliperPlacement, IntervalId, IntervalMarkingResult } from '../types';
import { createSinusEgmScenario } from '../waveform';
import {
  catheterDefinitions,
  catheterTargets,
  taskOneMeasurementIds,
} from './catalog';
import type { CatheterId, CatheterTargetId } from './catalog';
import {
  markActivationPattern,
  markCatheterPlacements,
  markCsLabelling,
  markNormalMeasurements,
  totalTaskOneScore,
} from './marking';
import type {
  ActivationClassification,
  CatheterPlacements,
  CsOneTwoPosition,
  MeasurementCompletion,
  SectionScore,
} from './marking';
import { loadTaskOneAttempts, saveTaskOneAttempt } from './store';
import type { StoredTaskOneAttempt } from './store';

interface TaskOneAssessmentProps {
  readonly assessmentView: AssessmentView;
  readonly assessmentMode?: SharedAssessmentMode;
}

interface TaskOneDraft {
  readonly placements: CatheterPlacements;
  readonly catheterScore: SectionScore | null;
  readonly csAnswer: CsOneTwoPosition;
  readonly csScore: SectionScore | null;
  readonly selectedMeasurementId: IntervalId;
  readonly calipers: CaliperPlacement;
  readonly reportedValue: string;
  readonly measurementResults: Readonly<Partial<Record<IntervalId, IntervalMarkingResult>>>;
  readonly measurementCompletion: MeasurementCompletion;
  readonly activationClassification: ActivationClassification;
  readonly activationExplanation: string;
  readonly activationScore: SectionScore | null;
}

const initialCalipers: CaliperPlacement = Object.freeze({
  start: Object.freeze({ timeMs: 300, channelId: 'surface-ii' }),
  end: Object.freeze({ timeMs: 520, channelId: 'surface-ii' }),
});

function attemptId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scoreClass(score: SectionScore): string {
  return score.score === score.maximumScore ? 'pass' : 'review';
}

function taskOneMeasurementFeedback(result: IntervalMarkingResult): readonly string[] {
  return result.feedback.filter((line) => (
    !line.startsWith('Normal/abnormal interpretation')
    && !line.startsWith('Classification is not scored')
  ));
}

export function TaskOneAssessment({
  assessmentView,
  assessmentMode = 'practice',
}: TaskOneAssessmentProps) {
  const instructorView = assessmentMode === 'practice' && assessmentView === 'instructor';
  const initialDraft = useMemo(() => (
    loadAssessmentDraft<Partial<TaskOneDraft>>(assessmentMode, '1', {})
  ), [assessmentMode]);
  const scenario = useMemo(() => createSinusEgmScenario({
    cycleLengthMs: 700,
    ahMs: 80,
    hvMs: 45,
    prMs: 180,
    measurementToleranceMs: 5,
  }), []);

  const [selectedCatheterId, setSelectedCatheterId] = useState<CatheterId>('hra');
  const [placements, setPlacements] = useState<CatheterPlacements>(initialDraft.placements ?? {});
  const [catheterScore, setCatheterScore] = useState<SectionScore | null>(initialDraft.catheterScore ?? null);
  const [csAnswer, setCsAnswer] = useState<CsOneTwoPosition>(initialDraft.csAnswer ?? '');
  const [csScore, setCsScore] = useState<SectionScore | null>(initialDraft.csScore ?? null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<IntervalId>(initialDraft.selectedMeasurementId ?? 'PA');
  const [calipers, setCalipers] = useState<CaliperPlacement>(initialDraft.calipers ?? initialCalipers);
  const [reportedValue, setReportedValue] = useState(initialDraft.reportedValue ?? '');
  const [measurementResults, setMeasurementResults] = useState<Readonly<Partial<Record<IntervalId, IntervalMarkingResult>>>>(initialDraft.measurementResults ?? {});
  const [measurementCompletion, setMeasurementCompletion] = useState<MeasurementCompletion>(initialDraft.measurementCompletion ?? {});
  const [measurementMessage, setMeasurementMessage] = useState('');
  const [activationClassification, setActivationClassification] = useState<ActivationClassification>(initialDraft.activationClassification ?? '');
  const [activationExplanation, setActivationExplanation] = useState(initialDraft.activationExplanation ?? '');
  const [activationScore, setActivationScore] = useState<SectionScore | null>(initialDraft.activationScore ?? null);
  const [savedAttempts, setSavedAttempts] = useState<readonly StoredTaskOneAttempt[]>(() => loadTaskOneAttempts());
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const draft: TaskOneDraft = {
      placements,
      catheterScore,
      csAnswer,
      csScore,
      selectedMeasurementId,
      calipers,
      reportedValue,
      measurementResults,
      measurementCompletion,
      activationClassification,
      activationExplanation,
      activationScore,
    };
    saveAssessmentDraft(assessmentMode, '1', draft);
  }, [
    activationClassification,
    activationExplanation,
    activationScore,
    assessmentMode,
    calipers,
    catheterScore,
    csAnswer,
    csScore,
    measurementCompletion,
    measurementResults,
    placements,
    reportedValue,
    selectedMeasurementId,
  ]);

  const selectedMeasurement = scenario.intervals.find((item) => item.id === selectedMeasurementId);
  const measurementsScore = markNormalMeasurements(measurementCompletion);
  const currentTotal = totalTaskOneScore(
    catheterScore ?? markCatheterPlacements({}),
    csScore ?? markCsLabelling(''),
    measurementsScore,
    activationScore ?? markActivationPattern('', ''),
  );
  const allSectionsMarked = taskOneMeasurementIds.every((id) => measurementCompletion[id] !== undefined)
    && activationScore !== null;

  function placeCatheter(targetId: CatheterTargetId): void {
    setPlacements((current) => ({ ...current, [selectedCatheterId]: targetId }));
    setCatheterScore(null);
  }

  function markMeasurement(): void {
    if (!selectedMeasurement) return;
    const value = Number(reportedValue);
    if (!Number.isFinite(value) || reportedValue.trim() === '') {
      setMeasurementMessage('Enter the measured interval before marking.');
      return;
    }
    const result = markIntervalMeasurement({
      definition: selectedMeasurement,
      beats: scenario.beats,
      calipers,
      reportedValueMs: value,
    });
    const accepted = result.landmarkStatus === 'correct' && result.measurementCorrect;
    setMeasurementResults((current) => ({ ...current, [selectedMeasurementId]: result }));
    setMeasurementCompletion((current) => ({ ...current, [selectedMeasurementId]: accepted }));
    setMeasurementMessage(accepted ? `${selectedMeasurementId} accepted.` : `${selectedMeasurementId} requires review.`);
  }

  function finaliseAttempt(force: boolean): void {
    if (!force && (!allSectionsMarked || activationScore === null)) {
      setSaveMessage('Complete and mark every Task 1 section before saving.');
      return;
    }

    const finalCatheterScore = catheterScore ?? markCatheterPlacements(placements);
    const finalCsScore = csScore ?? markCsLabelling(csAnswer);
    const finalCompletion = force
      ? taskOneMeasurementIds.reduce<MeasurementCompletion>(
          (current, id) => ({ ...current, [id]: measurementCompletion[id] ?? false }),
          {},
        )
      : measurementCompletion;
    const finalMeasurementsScore = markNormalMeasurements(finalCompletion);
    const finalActivationScore = activationScore
      ?? markActivationPattern(activationClassification, activationExplanation);
    const result = totalTaskOneScore(
      finalCatheterScore,
      finalCsScore,
      finalMeasurementsScore,
      finalActivationScore,
    );

    setCatheterScore(finalCatheterScore);
    setCsScore(finalCsScore);
    setMeasurementCompletion(finalCompletion);
    setActivationScore(finalActivationScore);
    const attempts = saveTaskOneAttempt({
      id: attemptId(),
      createdAtIso: new Date().toISOString(),
      result,
    });
    setSavedAttempts(attempts);
    setSaveMessage(
      force
        ? `Task 1 submitted: ${result.score}/10. Incomplete answers were marked.`
        : `Task 1 attempt saved locally: ${result.score}/10.`,
    );
  }

  function resetTimedTaskOne(): void {
    clearAssessmentWorkingState(assessmentMode, '1');
    setPlacements({});
    setCatheterScore(null);
    setCsAnswer('');
    setCsScore(null);
    setSelectedMeasurementId('PA');
    setCalipers(initialCalipers);
    setReportedValue('');
    setMeasurementResults({});
    setMeasurementCompletion({});
    setMeasurementMessage('');
    setActivationClassification('');
    setActivationExplanation('');
    setActivationScore(null);
    setSaveMessage('');
  }

  const session = useAssessmentSessionController({
    mode: assessmentMode,
    task: '1',
    onStart: resetTimedTaskOne,
    onSubmit: (reason: AssessmentSubmitReason) => {
      finaliseAttempt(assessmentMode !== 'practice' || reason === 'timeout');
    },
  });

  return (
    <AssessmentSessionBoundary controller={session}>
      <main className="assessment-shell task-one-shell">
      <ClientModuleNav current="assessment" />
      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · TASK 1 · 10 MARKS</p>
          <h1>Basic EP study assessment</h1>
          <p>Measure five baseline intervals and interpret the normal activation pattern.</p>
        </div>
        <a className="return-link" href={appHref()}>All modules</a>
      </header>

      <div className="assessment-view-switch">
        {instructorView ? <a href={buildAssessmentHref('1', false, assessmentMode)}>Student preview</a> : <span className="active">Student preview</span>}
        {instructorView && <span className="active">Instructor preview</span>}
      </div>
      <nav className="assessment-task-nav" aria-label="Assessment sections">
        <a href={buildAssessmentHref('interval', instructorView, assessmentMode)}>Interval trainer</a>
        <a className="active" href={buildAssessmentHref('1', instructorView, assessmentMode)}>Task 1 · Basic EP study</a>
        <a href={buildAssessmentHref('2', instructorView, assessmentMode)}>Task 2 · Sinus node, refractoriness & AV block</a>
        <a href={buildAssessmentHref('3', instructorView, assessmentMode)}>Task 3 · Tachycardia & AH change</a>
        <a href={buildAssessmentHref('4', instructorView, assessmentMode)}>Task 4 · Intracardiac manoeuvres</a>
        <a href={buildAssessmentHref('5', instructorView, assessmentMode)}>Task 5 · VT & para-Hisian pacing</a>
      </nav>

      <div className="prototype-warning">Synthetic educational assessment. The heart map is schematic and is not fluoroscopic or patient anatomy.</div>
      {instructorView && <div className="instructor-warning">Instructor preview displays answer references. The login-free static build is not secure examination infrastructure.</div>}

      <section className="task-one-scorebar" aria-label="Task 1 score">
        <div><span>Measurements</span><strong>{measurementsScore.score}/5</strong></div>
        <div><span>Activation</span><strong>{activationScore?.score ?? 0}/5</strong></div>
        <div className="task-one-total"><span>Total</span><strong>{currentTotal.score - (currentTotal.catheterPlacement?.score ?? 0) - (currentTotal.csLabelling?.score ?? 0)}/10</strong></div>
      </section>

      <section className="assessment-panel task-one-measurements">
        <div className="assessment-panel-heading"><div><span>SECTION C · 5 MARKS</span><h2>Take five normal baseline measurements</h2></div><strong>{measurementsScore.score}/5</strong></div>
        <div className="measurement-tabs">{taskOneMeasurementIds.map((id) => <button key={id} className={selectedMeasurementId === id ? 'active' : ''} onClick={() => { setSelectedMeasurementId(id); setCalipers(initialCalipers); setReportedValue(''); setMeasurementMessage(''); }}>{id}<span>{measurementCompletion[id] === true ? '✓' : measurementCompletion[id] === false ? '×' : '—'}</span></button>)}</div>
        <div className="assessment-grid">
          <div>
            <EgmCaliperCanvas scenario={scenario} calipers={calipers} running={false} playheadMs={0} onCalipersChange={setCalipers}/>
            <div className="caliper-readout channel-aware-readout"><span>Start: {calipers.start.channelId} @ {Math.round(calipers.start.timeMs)} ms</span><span>End: {calipers.end.channelId} @ {Math.round(calipers.end.timeMs)} ms</span><strong>{Math.round(Math.abs(calipers.end.timeMs - calipers.start.timeMs))} ms</strong></div>
          </div>
          <aside className="answer-panel">
            <span className="assessment-panel-kicker">{selectedMeasurementId} MEASUREMENT</span>
            <p className="prompt-copy">{selectedMeasurement?.studentPrompt}</p>
            {instructorView && selectedMeasurement && <div className="instructor-answer-key"><strong>Reference</strong><span>Expected {selectedMeasurement.expectedValueMs} ms ±{selectedMeasurement.measurementToleranceMs} ms.</span><span>{selectedMeasurement.referencePrompt}</span></div>}
            <label>Your value (ms)<input type="number" value={reportedValue} onChange={(event: ChangeEvent<HTMLInputElement>) => setReportedValue(event.target.value)}/></label>
            <button className="assessment-primary" onClick={markMeasurement}>Mark {selectedMeasurementId}</button>
            {measurementMessage && <p className="copy-status">{measurementMessage}</p>}
            {measurementResults[selectedMeasurementId] && <div className={`marking-result ${measurementCompletion[selectedMeasurementId] ? 'pass' : 'review'}`}><strong>{measurementCompletion[selectedMeasurementId] ? '1/1' : '0/1'} mark</strong>{taskOneMeasurementFeedback(measurementResults[selectedMeasurementId]!).map((line) => <p key={line}>{line}</p>)}</div>}
          </aside>
        </div>
      </section>

      <section className="assessment-panel task-one-activation">
        <div className="assessment-panel-heading"><div><span>SECTION D · 5 MARKS</span><h2>Interpret the activation pattern</h2></div></div>
        <fieldset><legend>Does the EGM demonstrate a normal activation pattern?</legend><label><input type="radio" name="activation-classification" checked={activationClassification === 'normal'} onChange={() => setActivationClassification('normal')}/> Normal</label><label><input type="radio" name="activation-classification" checked={activationClassification === 'abnormal'} onChange={() => setActivationClassification('abnormal')}/> Abnormal</label></fieldset>
        <label>Explain your answer<textarea value={activationExplanation} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setActivationExplanation(event.target.value)} placeholder="Describe the sequence using the atrial, His, coronary-sinus and ventricular recordings."/></label>
        {instructorView && <div className="instructor-answer-key"><strong>Four explanation concepts</strong><span>Origin near the sinus node/high right atrium.</span><span>Atrial activation precedes AV-node/His activation.</span><span>Coronary sinus activates proximal to distal in normal sinus rhythm.</span><span>His activation precedes ventricular activation.</span></div>}
        <button className="assessment-primary" onClick={() => setActivationScore(markActivationPattern(activationClassification, activationExplanation))}>Mark activation interpretation</button>
        {activationScore && <div className={`marking-result ${scoreClass(activationScore)}`}><strong>{activationScore.score}/5 marks</strong>{activationScore.feedback.map((line) => <p key={line}>{line}</p>)}</div>}
      </section>

      <section className="task-one-final assessment-panel">
        <div><span className="assessment-panel-kicker">TASK 1 RESULT</span><h2>{currentTotal.score - (currentTotal.catheterPlacement?.score ?? 0) - (currentTotal.csLabelling?.score ?? 0)}/10 marks</h2><p className="prompt-copy">The attempt remains on this device only. Client review should confirm the educational workflow and expected terminology before release.</p></div>
        <button
          className="assessment-primary"
          disabled={assessmentMode === 'practice' && !allSectionsMarked}
          onClick={() => session.submit(Date.now())}
        >
          {assessmentMode === 'practice' ? 'Save local attempt' : 'Submit Task 1'}
        </button>
        {saveMessage && <p className="copy-status">{saveMessage}</p>}
        {savedAttempts.length > 0 && <div className="attempt-list">{savedAttempts.slice(0, 4).map((attempt) => <div key={attempt.id}><strong>Task 1</strong><span>{attempt.result.score - attempt.result.catheterPlacement.score - attempt.result.csLabelling.score}/10</span><time>{new Date(attempt.createdAtIso).toLocaleString()}</time></div>)}</div>}
      </section>

      <footer className="assessment-footer"><p>Task allocation: normal measurements 5, activation classification and explanation 5.</p><a href={appHref('mode=assessment', 'feedback')}>Open client feedback</a></footer>
      </main>
    </AssessmentSessionBoundary>
  );
}
