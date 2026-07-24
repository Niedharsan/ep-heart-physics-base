import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../clientPreview/ClientModuleNav';
import { clearAttempts, loadAttempts, saveAttempt } from './attemptStore';
import { EgmCaliperCanvas } from './EgmCaliperCanvas';
import { markIntervalMeasurement } from './marking';
import { resolveAssessmentView } from './assessmentView';
import type { AssessmentView } from './assessmentView';
import { TaskOneAssessment } from './task1/TaskOneAssessment';
import { TaskTwoAssessment } from './task2/TaskTwoAssessment';
import { TaskThreeAssessment } from './task3/TaskThreeAssessment';
import { TaskFourAssessment } from './task4/TaskFourAssessment';
import { TaskFiveAssessment } from './task5/TaskFiveAssessment';
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
import './assessmentRedesign.css';

type ScenarioMode = 'sinus' | 'retrograde';

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

function defaultCalipersFor(
  scenario: EgmScenario,
  intervalId: IntervalId,
): CaliperPlacement {
  const firstBeat = scenario.beats[0];
  const secondBeat = scenario.beats[1] ?? firstBeat;
  if (!firstBeat) {
    return {
      start: { timeMs: 0, channelId: scenario.channels[0]?.id ?? 'surface-ii' },
      end: { timeMs: 0, channelId: scenario.channels[0]?.id ?? 'surface-ii' },
    };
  }

  switch (intervalId) {
    case 'PA':
      return {
        start: { timeMs: firstBeat.pOnsetMs ?? firstBeat.ventricularOnsetMs, channelId: 'surface-ii' },
        end: { timeMs: firstBeat.atrialHisMs ?? firstBeat.ventricularOnsetMs, channelId: 'hbe-distal' },
      };
    case 'AH':
      return {
        start: { timeMs: firstBeat.atrialHisMs ?? firstBeat.ventricularOnsetMs, channelId: 'hbe-distal' },
        end: { timeMs: firstBeat.hisOnsetMs ?? firstBeat.ventricularOnsetMs, channelId: 'hbe-distal' },
      };
    case 'HV':
      return {
        start: { timeMs: firstBeat.hisOnsetMs ?? firstBeat.ventricularOnsetMs, channelId: 'hbe-distal' },
        end: { timeMs: firstBeat.ventricularOnsetMs, channelId: 'hbe-distal' },
      };
    case 'PR':
      return {
        start: { timeMs: firstBeat.pOnsetMs ?? firstBeat.ventricularOnsetMs, channelId: 'surface-ii' },
        end: { timeMs: firstBeat.ventricularOnsetMs, channelId: 'surface-ii' },
      };
    case 'RR':
      return {
        start: { timeMs: firstBeat.ventricularOnsetMs, channelId: 'surface-ii' },
        end: { timeMs: secondBeat?.ventricularOnsetMs ?? firstBeat.ventricularOnsetMs, channelId: 'surface-ii' },
      };
    case 'VA':
      return {
        start: { timeMs: firstBeat.ventricularOnsetMs, channelId: 'rva' },
        end: {
          timeMs: firstBeat.retrogradeAtrialOnsetMs ?? firstBeat.ventricularOnsetMs,
          channelId: 'hbe-distal',
        },
      };
  }
}

function taskHref(task: AssessmentTask, instructor: boolean): string {
  const taskQuery = task === 'interval' ? '' : `&task=${task}`;
  const viewQuery = instructor ? '&view=instructor' : '';
  return `/?mode=assessment${taskQuery}${viewQuery}`;
}

const taskLinks: ReadonlyArray<{ readonly id: AssessmentTask; readonly label: string }> = Object.freeze([
  Object.freeze({ id: 'interval', label: 'Interval trainer' }),
  Object.freeze({ id: '1', label: 'Task 1 · Basic EP study' }),
  Object.freeze({ id: '2', label: 'Task 2 · Sinus node & refractoriness' }),
  Object.freeze({ id: '3', label: 'Task 3 · Tachycardia & AH change' }),
  Object.freeze({ id: '4', label: 'Task 4 · Intracardiac manoeuvres' }),
  Object.freeze({ id: '5', label: 'Task 5 · VT & para-Hisian pacing' }),
]);

export type AssessmentTask = 'interval' | '1' | '2' | '3' | '4' | '5';

export function resolveAssessmentTask(search: string): AssessmentTask {
  const selectedTask = new URLSearchParams(search).get('task');
  if (
    selectedTask === '1'
    || selectedTask === '2'
    || selectedTask === '3'
    || selectedTask === '4'
    || selectedTask === '5'
  ) {
    return selectedTask;
  }
  return 'interval';
}

export function AssessmentApp() {
  const search = window.location.search;
  const assessmentView = resolveAssessmentView(search);
  const selectedTask = resolveAssessmentTask(search);
  if (selectedTask === '1') return <TaskOneAssessment assessmentView={assessmentView} />;
  if (selectedTask === '2') return <TaskTwoAssessment assessmentView={assessmentView} />;
  if (selectedTask === '3') return <TaskThreeAssessment assessmentView={assessmentView} />;
  if (selectedTask === '4') return <TaskFourAssessment assessmentView={assessmentView} />;
  if (selectedTask === '5') return <TaskFiveAssessment assessmentView={assessmentView} />;
  return <IntervalAssessmentApp assessmentView={assessmentView} />;
}

interface IntervalAssessmentAppProps {
  readonly assessmentView: AssessmentView;
}

function IntervalAssessmentApp({ assessmentView }: IntervalAssessmentAppProps) {
  const instructorView = assessmentView === 'instructor';
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('sinus');
  const [cycleLengthMs, setCycleLengthMs] = useState(700);
  const [ahMs, setAhMs] = useState(80);
  const [hvMs, setHvMs] = useState(45);
  const [prMs, setPrMs] = useState(180);
  const [vaMs, setVaMs] = useState(90);
  const [toleranceMs, setToleranceMs] = useState(5);
  const [selectedIntervalId, setSelectedIntervalId] = useState<IntervalId>('AH');
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

  const activeIntervalId = selectedInterval?.id ?? scenario.intervals[0]?.id ?? 'AH';
  const caliperStateKey = `${scenario.id}:${scenario.cycleLengthMs}:${activeIntervalId}`;
  const [caliperOverride, setCaliperOverride] = useState<{
    readonly key: string;
    readonly placement: CaliperPlacement;
  } | null>(null);

  const calipers = caliperOverride?.key === caliperStateKey
    ? caliperOverride.placement
    : defaultCalipersFor(scenario, activeIntervalId);

  const studentQuestion = useMemo(() => {
    if (!selectedInterval) return undefined;
    return toStudentAssessmentQuestion(
      createIntervalMeasurementQuestion(scenario.id, selectedInterval),
    );
  }, [scenario.id, selectedInterval]);


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

  function resetCurrentResponse(): void {
    setCaliperOverride(null);
    setLatestAttempt(null);
    setReportedValue('');
    setClassification('');
    setCopyStatus('');
  }

  function updateScenarioMode(nextMode: ScenarioMode): void {
    setScenarioMode(nextMode);
    setSelectedIntervalId(nextMode === 'retrograde' ? 'VA' : 'AH');
    resetCurrentResponse();
  }

  function updateNumericScenario(
    update: (value: number) => void,
    value: number,
  ): void {
    update(value);
    resetCurrentResponse();
  }

  function updateSelectedInterval(nextIntervalId: IntervalId): void {
    setSelectedIntervalId(nextIntervalId);
    resetCurrentResponse();
  }

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
      setCopyStatus('Feedback package copied.');
    } catch {
      setCopyStatus('Clipboard access failed. Select and copy the notes manually.');
    }
  }

  return (
    <main className="assessment-shell assessment-shell-redesign">
      <ClientModuleNav current="assessment" />

      <header className="assessment-header assessment-header-compact">
        <div>
          <p className="assessment-eyebrow">INTERVAL TRAINER</p>
          <h1>Measure intracardiac intervals</h1>
          <p>Freeze the recording, position the calipers and submit the measured value.</p>
        </div>
      </header>

      <div className="assessment-workstation">
        <aside className="assessment-sidebar">
          <div className="assessment-sidebar-section">
            <span className="assessment-sidebar-label">ASSESSMENTS</span>
            <nav className="assessment-sidebar-nav" aria-label="Assessment sections">
              {taskLinks.map((item) => (
                <a
                  key={item.id}
                  className={item.id === 'interval' ? 'active' : undefined}
                  href={taskHref(item.id, instructorView)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="assessment-sidebar-section">
            <span className="assessment-sidebar-label">VIEW</span>
            <div className="assessment-view-switch assessment-view-switch-stacked">
              {instructorView ? (
                <>
                  <a href={taskHref('interval', false)}>Student</a>
                  <span className="active">Instructor</span>
                </>
              ) : (
                <>
                  <span className="active">Student</span>
                  <a href={taskHref('interval', true)}>Instructor</a>
                </>
              )}
            </div>
          </div>

          <p className="assessment-sidebar-note">
            Synthetic teaching signals. Not for diagnosis or patient care.
          </p>
        </aside>

        <section className="assessment-main">
          {instructorView && (
            <div className="instructor-warning">
              Instructor view exposes scenario values and answer configuration.
            </div>
          )}

          <section className="assessment-controls assessment-controls-compact" aria-label="Scenario controls">
            <label>
              Scenario
              <select
                value={scenarioMode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                  updateScenarioMode(event.target.value as ScenarioMode)
                )}
              >
                <option value="sinus">Baseline sinus conduction</option>
                <option value="retrograde">Retrograde VA study</option>
              </select>
            </label>

            {instructorView && (
              <details className="assessment-instructor-settings">
                <summary>Scenario settings</summary>
                <div className="assessment-settings-grid">
                  <label>
                    Cycle length
                    <span>{cycleLengthMs} ms</span>
                    <input
                      type="range"
                      min="500"
                      max="1200"
                      step="10"
                      value={cycleLengthMs}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => (
                        updateNumericScenario(setCycleLengthMs, Number(event.target.value))
                      )}
                    />
                  </label>
                  {scenarioMode === 'sinus' && (
                    <>
                      <label>
                        AH
                        <span>{ahMs} ms</span>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          step="1"
                          value={ahMs}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => (
                            updateNumericScenario(setAhMs, Number(event.target.value))
                          )}
                        />
                      </label>
                      <label>
                        HV
                        <span>{hvMs} ms</span>
                        <input
                          type="range"
                          min="25"
                          max="90"
                          step="1"
                          value={hvMs}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => (
                            updateNumericScenario(setHvMs, Number(event.target.value))
                          )}
                        />
                      </label>
                      <label>
                        PR
                        <span>{prMs} ms</span>
                        <input
                          type="range"
                          min={ahMs + hvMs + 20}
                          max="320"
                          step="1"
                          value={Math.max(prMs, ahMs + hvMs + 20)}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => (
                            updateNumericScenario(setPrMs, Number(event.target.value))
                          )}
                        />
                      </label>
                    </>
                  )}
                  {scenarioMode === 'retrograde' && (
                    <label>
                      VA
                      <span>{vaMs} ms</span>
                      <input
                        type="range"
                        min="40"
                        max="220"
                        step="1"
                        value={vaMs}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => (
                          updateNumericScenario(setVaMs, Number(event.target.value))
                        )}
                      />
                    </label>
                  )}
                  <label>
                    Tolerance
                    <span>±{toleranceMs} ms</span>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      step="1"
                      value={toleranceMs}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => (
                        updateNumericScenario(setToleranceMs, Number(event.target.value))
                      )}
                    />
                  </label>
                </div>
              </details>
            )}

            <button className="assessment-primary" onClick={() => setRunning((value) => !value)}>
              {running ? 'Freeze recording' : 'Resume recording'}
            </button>
          </section>

          <section className="assessment-grid assessment-grid-redesign">
            <article className="assessment-panel trace-panel">
              <div className="assessment-panel-heading">
                <div>
                  <span>{instructorView ? scenario.mechanismLabel : 'EGM RECORDING'}</span>
                  <h2>{scenario.title}</h2>
                </div>
                <p>{running ? 'Running' : 'Frozen · drag either caliper handle'}</p>
              </div>

              <EgmCaliperCanvas
                scenario={scenario}
                calipers={calipers}
                running={running}
                playheadMs={playheadMs}
                onCalipersChange={(placement) => setCaliperOverride({
                  key: caliperStateKey,
                  placement,
                })}
              />

              <div className="caliper-readout channel-aware-readout">
                <span>Start · {channelLabel(scenario, calipers.start.channelId)} · {Math.round(calipers.start.timeMs)} ms</span>
                <span>End · {channelLabel(scenario, calipers.end.channelId)} · {Math.round(calipers.end.timeMs)} ms</span>
                <strong>{Math.round(measuredMs)} ms</strong>
              </div>
            </article>

            <aside className="assessment-panel answer-panel">
              <span className="assessment-panel-kicker">MEASUREMENT</span>
              <label>
                Interval
                <select
                  value={selectedInterval?.id ?? ''}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                    updateSelectedInterval(event.target.value as IntervalId)
                  )}
                >
                  {scenario.intervals.map((interval) => (
                    <option key={interval.id} value={interval.id}>{interval.title}</option>
                  ))}
                </select>
              </label>

              <p className="prompt-copy">{studentQuestion?.prompt}</p>

              {instructorView && selectedInterval && (
                <div className="instructor-answer-key">
                  <strong>Answer configuration</strong>
                  <span>Expected: {selectedInterval.expectedValueMs} ms · ±{selectedInterval.measurementToleranceMs} ms</span>
                  <span>Start: {allowedChannelLabels(scenario, selectedInterval, 'start')}</span>
                  <span>End: {allowedChannelLabels(scenario, selectedInterval, 'end')}</span>
                  <span>Landmark window: ±{selectedInterval.landmarkToleranceMs} ms</span>
                </div>
              )}

              <label>
                Recorded value (ms)
                <input
                  type="number"
                  inputMode="decimal"
                  value={reportedValue}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setReportedValue(event.target.value)}
                />
              </label>

              <fieldset disabled={!selectedInterval?.normalRange}>
                <legend>Interpretation</legend>
                <label>
                  <input
                    type="radio"
                    name="classification"
                    checked={classification === 'normal'}
                    onChange={() => setClassification('normal')}
                  />
                  Normal
                </label>
                <label>
                  <input
                    type="radio"
                    name="classification"
                    checked={classification === 'abnormal'}
                    onChange={() => setClassification('abnormal')}
                  />
                  Abnormal
                </label>
              </fieldset>

              <button
                className="assessment-primary"
                disabled={running}
                onClick={markCurrentAttempt}
              >
                Mark attempt
              </button>

              {running && <p className="range-note">Freeze the recording before marking.</p>}

              {latestAttempt && (
                <div className={`marking-result ${latestAttempt.result.score === latestAttempt.result.maximumScore ? 'pass' : 'review'}`}>
                  <strong>{latestAttempt.result.score}/{latestAttempt.result.maximumScore}</strong>
                  <span>Timing: {latestAttempt.result.timingSelectionCorrect ? 'correct' : 'incorrect'}</span>
                  <span>Channels: {latestAttempt.result.channelSelectionCorrect ? 'correct' : 'incorrect'}</span>
                  {latestAttempt.result.feedback.map((line) => <p key={line}>{line}</p>)}
                </div>
              )}
            </aside>
          </section>

          <section className="assessment-grid lower-grid assessment-lower-redesign">
            <article className="assessment-panel">
              <div className="assessment-panel-heading">
                <div><span>ATTEMPTS</span><h2>Recent results</h2></div>
                <button onClick={() => {
                  clearAttempts();
                  setAttempts([]);
                  setLatestAttempt(null);
                }}>
                  Clear
                </button>
              </div>
              {attempts.length === 0 ? (
                <p className="empty-copy">No marked attempts.</p>
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
              <span className="assessment-panel-kicker">FEEDBACK</span>
              <h2>Report an issue</h2>
              <textarea
                value={feedbackNotes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)}
                placeholder="Describe a morphology, label, workflow or marking issue."
              />
              <button onClick={() => void copyFeedbackPackage()}>Copy feedback</button>
              {copyStatus && <p className="copy-status">{copyStatus}</p>}
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}
