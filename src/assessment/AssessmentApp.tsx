import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { clearAttempts, loadAttempts, saveAttempt } from './attemptStore';
import { EgmCaliperCanvas } from './EgmCaliperCanvas';
import { markIntervalMeasurement } from './marking';
import type {
  CaliperPlacement,
  EgmScenario,
  IntervalClassification,
  IntervalId,
  StoredAttempt,
} from './types';
import {
  createRetrogradeEgmScenario,
  createSinusEgmScenario,
} from './waveform';
import './assessment.css';

type ScenarioMode = 'sinus' | 'retrograde';

const initialCalipers: CaliperPlacement = Object.freeze({ startMs: 320, endMs: 520 });

function attemptIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AssessmentApp() {
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

  const measuredMs = Math.abs(calipers.endMs - calipers.startMs);

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
      calipers: Object.freeze({ ...calipers }),
      reportedValueMs: parsedReportedValue,
      classification: classification || undefined,
      result,
    });
    setLatestAttempt(attempt);
    setAttempts(saveAttempt(attempt));
    setCopyStatus('');
  }

  async function copyFeedbackPackage(): Promise<void> {
    const packageData = {
      preview: 'EP Heart assessment phase 1',
      createdAtIso: new Date().toISOString(),
      scenario: {
        id: scenario.id,
        title: scenario.title,
        cycleLengthMs: scenario.cycleLengthMs,
      },
      selectedInterval: selectedInterval?.id,
      latestAttempt,
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
      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · LOGIN-FREE ASSESSMENT PREVIEW</p>
          <h1>Running EGM interval trainer</h1>
          <p>
            Place both calipers on the correct anatomical landmarks, enter the measured
            interval and classify it where an approved range is available.
          </p>
        </div>
        <a className="return-link" href="/">Return to tissue simulator</a>
      </header>

      <div className="prototype-warning">
        Synthetic educational traces only. Not validated for patient care, diagnosis or device programming.
      </div>

      <section className="assessment-controls" aria-label="Scenario controls">
        <label>
          Scenario
          <select value={scenarioMode} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateScenarioMode(event.target.value as ScenarioMode)}>
            <option value="sinus">Baseline sinus conduction</option>
            <option value="retrograde">Retrograde VA study</option>
          </select>
        </label>
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
        <button className="assessment-primary" onClick={() => setRunning((value) => !value)}>
          {running ? 'Freeze to measure' : 'Resume running'}
        </button>
      </section>

      <section className="assessment-grid">
        <article className="assessment-panel trace-panel">
          <div className="assessment-panel-heading">
            <div>
              <span>{scenario.mechanismLabel}</span>
              <h2>{scenario.title}</h2>
            </div>
            <p>{running ? 'Running display — freeze before placing calipers.' : 'Frozen — drag either caliper line.'}</p>
          </div>
          <EgmCaliperCanvas
            scenario={scenario}
            calipers={calipers}
            running={running}
            playheadMs={playheadMs}
            onCalipersChange={setCalipers}
          />
          <div className="caliper-readout">
            <span>Start: {Math.round(calipers.startMs)} ms</span>
            <span>End: {Math.round(calipers.endMs)} ms</span>
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
          <p className="prompt-copy">{selectedInterval?.explanatoryPrompt}</p>
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
              <span>Landmarks: {latestAttempt.result.landmarkStatus}</span>
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

        <aside className="assessment-panel">
          <span className="assessment-panel-kicker">CLIENT FEEDBACK</span>
          <h2>What should change?</h2>
          <textarea value={feedbackNotes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)} placeholder="Describe incorrect morphology, labels, workflow, marking or visual changes." />
          <button onClick={() => void copyFeedbackPackage()}>Copy feedback package</button>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
        </aside>
      </section>

      <footer className="assessment-footer">
        <p>
          Source-derived defaults in this phase: AH normal 55–125 ms and HV normal 35–55 ms.
          Other normal ranges remain deliberately unset until approved.
        </p>
        <a href="/?mode=assessment">Shareable assessment URL format</a>
      </footer>
    </main>
  );
}
