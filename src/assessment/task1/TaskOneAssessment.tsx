import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../../clientPreview/ClientModuleNav';
import type { AssessmentView } from '../assessmentView';
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

export function TaskOneAssessment({ assessmentView }: TaskOneAssessmentProps) {
  const instructorView = assessmentView === 'instructor';
  const scenario = useMemo(() => createSinusEgmScenario({
    cycleLengthMs: 700,
    ahMs: 80,
    hvMs: 45,
    prMs: 180,
    measurementToleranceMs: 5,
  }), []);

  const [selectedCatheterId, setSelectedCatheterId] = useState<CatheterId>('hra');
  const [placements, setPlacements] = useState<CatheterPlacements>({});
  const [catheterScore, setCatheterScore] = useState<SectionScore | null>(null);
  const [csAnswer, setCsAnswer] = useState<CsOneTwoPosition>('');
  const [csScore, setCsScore] = useState<SectionScore | null>(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<IntervalId>('PA');
  const [calipers, setCalipers] = useState<CaliperPlacement>(initialCalipers);
  const [reportedValue, setReportedValue] = useState('');
  const [measurementResults, setMeasurementResults] = useState<Readonly<Partial<Record<IntervalId, IntervalMarkingResult>>>>({});
  const [measurementCompletion, setMeasurementCompletion] = useState<MeasurementCompletion>({});
  const [measurementMessage, setMeasurementMessage] = useState('');
  const [activationClassification, setActivationClassification] = useState<ActivationClassification>('');
  const [activationExplanation, setActivationExplanation] = useState('');
  const [activationScore, setActivationScore] = useState<SectionScore | null>(null);
  const [savedAttempts, setSavedAttempts] = useState<readonly StoredTaskOneAttempt[]>(() => loadTaskOneAttempts());
  const [saveMessage, setSaveMessage] = useState('');

  const selectedMeasurement = scenario.intervals.find((item) => item.id === selectedMeasurementId);
  const measurementsScore = markNormalMeasurements(measurementCompletion);
  const currentTotal = totalTaskOneScore(
    catheterScore ?? markCatheterPlacements({}),
    csScore ?? markCsLabelling(''),
    measurementsScore,
    activationScore ?? markActivationPattern('', ''),
  );
  const allSectionsMarked = catheterScore !== null
    && csScore !== null
    && taskOneMeasurementIds.every((id) => measurementCompletion[id] !== undefined)
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

  function saveAttempt(): void {
    if (!allSectionsMarked || catheterScore === null || csScore === null || activationScore === null) {
      setSaveMessage('Complete and mark every Task 1 section before saving.');
      return;
    }
    const result = totalTaskOneScore(catheterScore, csScore, measurementsScore, activationScore);
    const attempts = saveTaskOneAttempt({
      id: attemptId(),
      createdAtIso: new Date().toISOString(),
      result,
    });
    setSavedAttempts(attempts);
    setSaveMessage(`Task 1 attempt saved locally: ${result.score}/15.`);
  }

  return (
    <main className="assessment-shell task-one-shell">
      <ClientModuleNav current="assessment" />
      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · TASK 1 · 15 MARKS</p>
          <h1>Basic EP study assessment</h1>
          <p>Position four standard diagnostic catheters, label the coronary-sinus catheter, measure five baseline intervals and interpret the normal activation pattern.</p>
        </div>
        <a className="return-link" href="/">All modules</a>
      </header>

      <div className="assessment-view-switch">
        {instructorView ? <a href="/?mode=assessment&task=1">Student preview</a> : <span className="active">Student preview</span>}
        {instructorView && <span className="active">Instructor preview</span>}
      </div>
      <nav className="assessment-task-nav" aria-label="Assessment sections">
        <a href={instructorView ? '/?mode=assessment&view=instructor' : '/?mode=assessment'}>Interval trainer</a>
        <a className="active" href={instructorView ? '/?mode=assessment&task=1&view=instructor' : '/?mode=assessment&task=1'}>Task 1 · Basic EP study</a>
        <a href={instructorView ? '/?mode=assessment&task=2&view=instructor' : '/?mode=assessment&task=2'}>Task 2 · Sinus node, refractoriness & AV block</a>
        <a href={instructorView ? '/?mode=assessment&task=3&view=instructor' : '/?mode=assessment&task=3'}>Task 3 · Tachycardia & AH change</a>
        <a href={instructorView ? '/?mode=assessment&task=4&view=instructor' : '/?mode=assessment&task=4'}>Task 4 · Intracardiac manoeuvres</a>
      </nav>

      <div className="prototype-warning">Synthetic educational assessment. The heart map is schematic and is not fluoroscopic or patient anatomy.</div>
      {instructorView && <div className="instructor-warning">Instructor preview displays answer references. The login-free static build is not secure examination infrastructure.</div>}

      <section className="task-one-scorebar" aria-label="Task 1 score">
        <div><span>Catheters</span><strong>{catheterScore?.score ?? 0}/4</strong></div>
        <div><span>CS label</span><strong>{csScore?.score ?? 0}/1</strong></div>
        <div><span>Measurements</span><strong>{measurementsScore.score}/5</strong></div>
        <div><span>Activation</span><strong>{activationScore?.score ?? 0}/5</strong></div>
        <div className="task-one-total"><span>Total</span><strong>{currentTotal.score}/15</strong></div>
      </section>

      <section className="task-one-grid">
        <article className="assessment-panel task-one-card">
          <div className="assessment-panel-heading"><div><span>SECTION A · 4 MARKS</span><h2>Position the four catheters</h2></div></div>
          <p className="prompt-copy">Select a catheter, then select its intended recording location on the schematic. The location selectors provide the same keyboard-accessible workflow.</p>
          <div className="catheter-chip-row">
            {catheterDefinitions.map((catheter) => <button key={catheter.id} className={selectedCatheterId === catheter.id ? 'active' : ''} onClick={() => setSelectedCatheterId(catheter.id)}>{catheter.shortLabel}</button>)}
          </div>
          <div className="heart-placement-map" role="group" aria-label="Schematic cardiac catheter target map">
            <div className="heart-outline" aria-hidden="true"><span className="ra-shape"/><span className="rv-shape"/><span className="la-shape"/><span className="lv-shape"/><span className="septum-line"/><span className="cs-track"/></div>
            {catheterTargets.map((target) => <button key={target.id} className="heart-target" style={{ left: `${target.xPercent}%`, top: `${target.yPercent}%` }} onClick={() => placeCatheter(target.id)} title={target.label}>{target.label}</button>)}
            {catheterDefinitions.map((catheter) => {
              const target = catheterTargets.find((item) => item.id === placements[catheter.id]);
              if (!target) return null;
              return <span key={catheter.id} className="placed-catheter" style={{ left: `${target.xPercent}%`, top: `${target.yPercent}%` }}>{catheter.shortLabel}</span>;
            })}
          </div>
          <div className="placement-select-grid">
            {catheterDefinitions.map((catheter) => <label key={catheter.id}>{catheter.shortLabel}<select value={placements[catheter.id] ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => setPlacements((current) => ({ ...current, [catheter.id]: event.target.value as CatheterTargetId }))}><option value="">Not placed</option>{catheterTargets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>)}
          </div>
          {instructorView && <div className="instructor-answer-key"><strong>Reference positions</strong>{catheterDefinitions.map((catheter) => <span key={catheter.id}>{catheter.shortLabel}: {catheterTargets.find((target) => target.id === catheter.correctTargetId)?.label}</span>)}</div>}
          <button className="assessment-primary" onClick={() => setCatheterScore(markCatheterPlacements(placements))}>Mark catheter positions</button>
          {catheterScore && <div className={`marking-result ${scoreClass(catheterScore)}`}><strong>{catheterScore.score}/4 marks</strong>{catheterScore.feedback.map((line) => <p key={line}>{line}</p>)}</div>}
        </article>

        <article className="assessment-panel task-one-card">
          <div className="assessment-panel-heading"><div><span>SECTION B · 1 MARK</span><h2>Label the CS catheter</h2></div></div>
          <div className="cs-electrode-strip" aria-label="Coronary sinus electrode pairs">{['1–2','3–4','5–6','7–8','9–10'].map((pair) => <span key={pair}>CS {pair}</span>)}</div>
          <label>CS 1–2 represents the<select value={csAnswer} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setCsAnswer(event.target.value as CsOneTwoPosition); setCsScore(null); }}><option value="">Choose</option><option value="distal">Distal pair</option><option value="proximal">Proximal pair</option></select></label>
          {instructorView && <div className="instructor-answer-key"><strong>Reference</strong><span>CS 1–2 distal; CS 9–10 proximal at the ostium.</span></div>}
          <button className="assessment-primary" onClick={() => setCsScore(markCsLabelling(csAnswer))}>Mark CS label</button>
          {csScore && <div className={`marking-result ${scoreClass(csScore)}`}><strong>{csScore.score}/1 mark</strong>{csScore.feedback.map((line) => <p key={line}>{line}</p>)}</div>}
        </article>
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
        <div><span className="assessment-panel-kicker">TASK 1 RESULT</span><h2>{currentTotal.score}/15 marks</h2><p className="prompt-copy">The attempt remains on this device only. Client review should confirm the educational workflow and expected terminology before release.</p></div>
        <button className="assessment-primary" disabled={!allSectionsMarked} onClick={saveAttempt}>Save local attempt</button>
        {saveMessage && <p className="copy-status">{saveMessage}</p>}
        {savedAttempts.length > 0 && <div className="attempt-list">{savedAttempts.slice(0, 4).map((attempt) => <div key={attempt.id}><strong>Task 1</strong><span>{attempt.result.score}/15</span><time>{new Date(attempt.createdAtIso).toLocaleString()}</time></div>)}</div>}
      </section>

      <footer className="assessment-footer"><p>Task allocation: catheter positions 4, CS label 1, normal measurements 5, activation classification and explanation 5.</p><a href="/?mode=assessment#feedback">Open client feedback</a></footer>
    </main>
  );
}
