import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../clientPreview/ClientModuleNav';
import { clearAttempts, loadAttempts, saveAttempt } from './attemptStore';
import { EgmCaliperCanvas } from './EgmCaliperCanvas';
import { markIntervalMeasurement } from './marking';
import {
  createIntervalMeasurementQuestion,
  toStudentAssessmentQuestion,
} from './questionSchema';
import type {
  CaliperPlacement,
  EgmScenario,
  IntervalClassification,
  IntervalDefinition,
  IntervalId,
  StoredAttempt,
} from './types';
import {
  createRetrogradeEgmScenario,
  createSinusEgmScenario,
} from './waveform';
import './assessment.css';

type ScenarioMode = 'sinus' | 'retrograde';
export type AssessmentView = 'student' | 'instructor';

const initialCalipers: CaliperPlacement = Object.freeze({
  start: Object.freeze({ timeMs: 300, channelId: 'surface-ii' }),
  end: Object.freeze({ timeMs: 520, channelId: 'surface-ii' }),
});

export function resolveAssessmentView(search: string): AssessmentView {
  return new URLSearchParams(search).get('view') === 'instructor'
    ? 'instructor'
    : 'student';
}

function attemptIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function channelLabel(scenario: EgmScenario, channelId: string): string {
  return scenario.channels.find((channel) => channel.id === channelId)?.label ?? channelId;
}

function allowedChannelLabels(
  scenario: EgmScenario,
  definition: IntervalDefinition,
  endpoint: 'start' | 'end',
): string {
  const reference = endpoint === 'start'
    ? definition.startReference
    : definition.endReference;
  return reference.allowedChannelIds
    .map((channelId) => channelLabel(scenario, channelId))
    .join(', ');
}

export function AssessmentApp() {
  const assessmentView = resolveAssessmentView(window.location.search);
  const instructorView = assessmentView === 'instructor';
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('sinus');
  const [cycleLengthMs, setCycleLengthMs] = useState(700);
  const [ahMs, setAhMs] = useState(80);
  const [hvMs, setHvMs] = useState(45);
  const [prMs, setPrMs] = useState(180);
  const [vaMs, setVaMs] = useState(90);
  const [toleranceMs, setToleranceMs] = useState(5);
  const [selectedIntervalId, setSelectedIntervalId] = useState<IntervalId>('AH');
  const [calipers, setCalipers] = useState<CaliperPlacement>(initialCalipers);
  const [reportedValue, setReportedValue] = useState('');
  const [classification, setClassification] = useState<IntervalClassification | ''>('');
  const [running, setRunning] = useState(true);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [attempts, setAttempts] = useState<readonly StoredAttempt[]>(() => loadAttempts());
  const [latestAttempt, setLatestAttempt] = useState<StoredAttempt | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const animationStartRef = useRef<number | null>(null);

  const scenario = useMemo<EgmScenario>(() => {
    if (scenarioMode === 'retrograde') {
      return createRetrogradeEgmScenario({
        cycleLengthMs,
        vaMs,
        measurementToleranceMs: toleranceMs,
      });
    }
    return createSinusEgmScenario({
      cycleLengthMs,
      ahMs,
      hvMs,
      prMs: Math.max(prMs, ahMs + hvMs + 20),
      measurementToleranceMs: toleranceMs,
    });
  }, [ahMs, cycleLengthMs, hvMs, prMs, scenarioMode, toleranceMs, vaMs]);

  const selectedInterval = useMemo(() => (
    scenario.intervals.find((interval) => interval.id === selectedIntervalId)
    ?? scenario.intervals[0]
  ), [scenario, selectedIntervalId]);

  const studentQuestion = useMemo(() => {
    if (!selectedInterval) return undefined;
    return toStudentAssessmentQuestion(
      createIntervalMeasurementQuestion(scenario.id, selectedInterval),
    );
  }, [scenario.id, selectedInterval]);

  function resetCurrentItem(): void {
    setLatestAttempt(null);
    setReportedValue('');
    setClassification('');
    setCalipers(initialCalipers);
    setCopyStatus('');
  }

  function updateScenarioMode(nextMode: ScenarioMode): void {
    setScenarioMode(nextMode);
    setSelectedIntervalId(nextMode === 'retrograde' ? 'VA' : 'AH');
    resetCurrentItem();
  }

  function updateNumericScenario(
    update: (value: number) => void,
    value: number,
  ): void {
    update(value);
    resetCurrentItem();
  }

  function updateSelectedInterval(nextIntervalId: IntervalId): void {
    setSelectedIntervalId(nextIntervalId);
    resetCurrentItem();
  }

  useEffect(() => {
    if (!running) {
      animationStartRef.current = null;
      return;
    }
    let frame = 0;
    function animate(timestamp: number): void {
      if (animationStartRef.current === null) animationStartRef.current = timestamp;
      const elapsed = timestamp - animationStartRef.current;
      setPlayheadMs(elapsed % scenario.durationMs);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [running, scenario.durationMs]);

  const measuredMs = Math.abs(calipers.end.timeMs - calipers.start.timeMs);

  function markCurrentAttempt(): void {
    if (!selectedInterval) return;
    const parsedReportedValue = Number(reportedValue);
    if (!Number.isFinite(parsedReportedValue) || reportedValue.trim() === '') {
      setCopyStatus('Enter the interval value you measured before marking.');
      return;
    }
    const result = markIntervalMeasurement({
      definition: selectedInterval,
      beats: scenario.beats,
      calipers,
      reportedValueMs: parsedReportedValue,
      classification: classification || undefined,
    });
    const attempt: StoredAttempt = Object.freeze({
      id: attemptIdentifier(),
      createdAtIso: new Date().toISOString(),
      scenarioId: scenario.id,
      intervalId: selectedInterval.id,
      calipers: Object.freeze({
        start: Object.freeze({ ...calipers.start }),
        end: Object.freeze({ ...calipers.end }),
      }),
      reportedValueMs: parsedReportedValue,
      classification: classification || undefined,
      result,
    });
    setLatestAttempt(attempt);
    setAttempts(saveAttempt(attempt));
    setCopyStatus('');
  }

  async function copyFeedbackPackage(): Promise<void> {
    const feedbackAttempt = latestAttempt && !instructorView
      ? {
        id: latestAttempt.id,
        createdAtIso: latestAttempt.createdAtIso,
        scenarioId: latestAttempt.scenarioId,
        intervalId: latestAttempt.intervalId,
        calipers: latestAttempt.calipers,
        reportedValueMs: latestAttempt.reportedValueMs,
        classification: latestAttempt.classification,
        result: {
          landmarkStatus: latestAttempt.result.landmarkStatus,
          channelSelectionCorrect: latestAttempt.result.channelSelectionCorrect,
          timingSelectionCorrect: latestAttempt.result.timingSelectionCorrect,
          measuredValueMs: latestAttempt.result.measuredValueMs,
          measurementCorrect: latestAttempt.result.measurementCorrect,
          classificationAssessed: latestAttempt.result.classificationAssessed,
          classificationCorrect: latestAttempt.result.classificationCorrect,
          score: latestAttempt.result.score,
          maximumScore: latestAttempt.result.maximumScore,
          feedback: latestAttempt.result.feedback,
        },
      }
      : latestAttempt;
    const packageData = {
      preview: 'EP Heart channel-aware assessment foundation',
      assessmentView,
      createdAtIso: new Date().toISOString(),
      scenario: {
        id: scenario.id,
        title: scenario.title,
        cycleLengthMs: instructorView ? scenario.cycleLengthMs : undefined,
      },
      selectedQuestionId: studentQuestion?.questionId,
      selectedInterval: selectedInterval?.id,
      latestAttempt: feedbackAttempt,
      notes: feedbackNotes,
      browser: navigator.userAgent,
      disclaimer: 'Synthetic educational prototype; not for clinical decision-making.',
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(packageData, null, 2));
      setCopyStatus('Feedback package copied. Paste it into email or your project message.');
    } catch {
      setCopyStatus('Clipboard access failed. Select and copy the notes manually.');
    }
  }

  return (
    <main className="assessment-shell">
      <ClientModuleNav current="assessment" />

      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · LOGIN-FREE ASSESSMENT PREVIEW</p>
          <h1>Running EGM interval trainer</h1>
          <p>
            Freeze the trace, place each caliper handle on the correct channel and anatomical
            landmark, enter the measured interval and classify it where an approved range exists.
          </p>
        </div>
        <a className="return-link" href="/">All modules</a>
      </header>

      <div className="assessment-view-switch" aria-label="Assessment preview view">
        {instructorView ? (
          <>
            <a href="/?mode=assessment">Return to student preview</a>
            <span className="active" aria-current="page">Instructor preview</span>
          </>
        ) : (
          <span className="active" aria-current="page">Student preview</span>
        )}
      </div>

      <div className="prototype-warning">
        Synthetic educational traces only. Not validated for patient care, diagnosis or device programming.
      </div>

      {instructorView && (
        <div className="instructor-warning">
          Instructor preview exposes scenario values and answer configuration. This login-free static
          site is not a secure examination platform and does not keep browser-delivered answer data secret.
        </div>
      )}

      <section className="assessment-controls" aria-label="Scenario controls">
        <label>
          Scenario
          <select value={scenarioMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateScenarioMode(event.target.value as ScenarioMode)}>
            <option value="sinus">Baseline sinus conduction</option>
            <option value="retrograde">Retrograde VA study</option>
          </select>
        </label>
        {instructorView && (
          <>
            <label>
              Cycle length
              <span>{cycleLengthMs} ms</span>
              <input type="range" min="500" max="1200" step="10" value={cycleLengthMs} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setCycleLengthMs, Number(event.target.value))} />
            </label>
            {scenarioMode === 'sinus' && (
              <>
                <label>
                  AH
                  <span>{ahMs} ms</span>
                  <input type="range" min="40" max="160" step="1" value={ahMs} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setAhMs, Number(event.target.value))} />
                </label>
                <label>
                  HV
                  <span>{hvMs} ms</span>
                  <input type="range" min="25" max="90" step="1" value={hvMs} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setHvMs, Number(event.target.value))} />
                </label>
                <label>
                  PR
                  <span>{prMs} ms</span>
                  <input type="range" min={ahMs + hvMs + 20} max="320" step="1" value={Math.max(prMs, ahMs + hvMs + 20)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setPrMs, Number(event.target.value))} />
                </label>
              </>
            )}
            {scenarioMode === 'retrograde' && (
              <label>
                VA
                <span>{vaMs} ms</span>
                <input type="range" min="40" max="220" step="1" value={vaMs} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setVaMs, Number(event.target.value))} />
              </label>
            )}
            <label>
              Marking tolerance
              <span>±{toleranceMs} ms</span>
              <input type="range" min="2" max="15" step="1" value={toleranceMs} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumericScenario(setToleranceMs, Number(event.target.value))} />
            </label>
          </>
        )}
        <button className="assessment-primary" onClick={() => setRunning((value) => !value)}>
          {running ? 'Freeze to measure' : 'Resume running'}
        </button>
      </section>

      <section className="assessment-grid">
        <article className="assessment-panel trace-panel">
          <div className="assessment-panel-heading">
            <div>
              <span>{instructorView ? scenario.mechanismLabel : 'SYNTHETIC EGM SCENARIO'}</span>
              <h2>{scenario.title}</h2>
            </div>
            <p>{running ? 'Running display — freeze before placing calipers.' : 'Frozen — drag each handle in time and between channels.'}</p>
          </div>
          <EgmCaliperCanvas
            scenario={scenario}
            calipers={calipers}
            running={running}
            playheadMs={playheadMs}
            onCalipersChange={setCalipers}
          />
          <div className="caliper-readout channel-aware-readout">
            <span>Start: {channelLabel(scenario, calipers.start.channelId)} @ {Math.round(calipers.start.timeMs)} ms</span>
            <span>End: {channelLabel(scenario, calipers.end.channelId)} @ {Math.round(calipers.end.timeMs)} ms</span>
            <strong>Caliper interval: {Math.round(measuredMs)} ms</strong>
          </div>
        </article>

        <aside className="assessment-panel answer-panel">
          <span className="assessment-panel-kicker">CURRENT ITEM</span>
          <label>
            Interval to measure
            <select value={selectedInterval?.id ?? ''} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateSelectedInterval(event.target.value as IntervalId)}>
              {scenario.intervals.map((interval) => (
                <option key={interval.id} value={interval.id}>{interval.title}</option>
              ))}
            </select>
          </label>
          <p className="prompt-copy">{studentQuestion?.prompt}</p>

          {instructorView && selectedInterval && (
            <div className="instructor-answer-key">
              <strong>Instructor answer configuration</strong>
              <span>Expected: {selectedInterval.expectedValueMs} ms · tolerance ±{selectedInterval.measurementToleranceMs} ms</span>
              <span>Start channel: {allowedChannelLabels(scenario, selectedInterval, 'start')}</span>
              <span>End channel: {allowedChannelLabels(scenario, selectedInterval, 'end')}</span>
              <span>Landmark window: ±{selectedInterval.landmarkToleranceMs} ms</span>
              <span>Reference: {selectedInterval.referencePrompt}</span>
            </div>
          )}

          <label>
            Your recorded value (ms)
            <input type="number" inputMode="decimal" value={reportedValue} onChange={(event: ChangeEvent<HTMLInputElement>) => setReportedValue(event.target.value)} />
          </label>
          <fieldset disabled={!selectedInterval?.normalRange}>
            <legend>Interpretation</legend>
            <label><input type="radio" name="classification" checked={classification === 'normal'} onChange={() => setClassification('normal')} /> Normal</label>
            <label><input type="radio" name="classification" checked={classification === 'abnormal'} onChange={() => setClassification('abnormal')} /> Abnormal</label>
          </fieldset>
          {!selectedInterval?.normalRange && (
            <p className="range-note">Normal/abnormal is not scored until an instructor-approved range is configured.</p>
          )}
          <button className="assessment-primary" disabled={running} onClick={markCurrentAttempt}>Mark attempt</button>
          {running && <p className="range-note">Freeze the display before marking.</p>}

          {latestAttempt && (
            <div className={`marking-result ${latestAttempt.result.score === latestAttempt.result.maximumScore ? 'pass' : 'review'}`}>
              <strong>{latestAttempt.result.score}/{latestAttempt.result.maximumScore} marks</strong>
              <span>Landmark timing: {latestAttempt.result.timingSelectionCorrect ? 'correct' : 'incorrect'}</span>
              <span>Landmark channels: {latestAttempt.result.channelSelectionCorrect ? 'correct' : 'incorrect'}</span>
              <span>Measured: {Math.round(latestAttempt.result.measuredValueMs)} ms</span>
              {latestAttempt.result.feedback.map((line) => <p key={line}>{line}</p>)}
            </div>
          )}
        </aside>
      </section>

      <section className="assessment-grid lower-grid">
        <article className="assessment-panel">
          <div className="assessment-panel-heading">
            <div><span>LOCAL DEVICE ONLY</span><h2>Recent attempts</h2></div>
            <button onClick={() => { clearAttempts(); setAttempts([]); setLatestAttempt(null); }}>Clear history</button>
          </div>
          {attempts.length === 0 ? (
            <p className="empty-copy">No marked attempts yet.</p>
          ) : (
            <div className="attempt-list">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id}>
                  <strong>{attempt.intervalId}</strong>
                  <span>{attempt.result.score}/{attempt.result.maximumScore}</span>
                  <time>{new Date(attempt.createdAtIso).toLocaleString()}</time>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside id="feedback" className="assessment-panel">
          <span className="assessment-panel-kicker">CLIENT FEEDBACK</span>
          <h2>What should change?</h2>
          <textarea value={feedbackNotes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)} placeholder="Describe incorrect morphology, labels, workflow, marking or visual changes." />
          <button onClick={() => void copyFeedbackPackage()}>Copy feedback package</button>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
        </aside>
      </section>

      <footer className="assessment-footer">
        {instructorView ? (
          <p>
            Source-derived defaults: AH normal 55–125 ms and HV normal 35–55 ms.
            Other normal ranges remain deliberately unset until approved.
          </p>
        ) : (
          <p>
            Approved ranges are applied automatically where configured. Scenario answer values and
            tolerance controls are hidden from the normal student preview.
          </p>
        )}
        <a href="/?mode=assessment">Student assessment URL</a>
      </footer>
    </main>
  );
}
