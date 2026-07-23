import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../../clientPreview/ClientModuleNav';
import type { AssessmentView } from '../assessmentView';
import {
  TASK_THREE_TARGET_WORD_COUNT,
  taskThreeAhJumpCases,
  taskThreeAtrialTachycardiaCases,
  taskThreeAvnrtCase,
  taskThreeWrittenResponseCases,
} from './catalog';
import type {
  TaskThreeAhJumpCaseId,
  TaskThreeAtrialTachycardiaCaseId,
} from './catalog';
import { taskThreeClinicalRubric } from './clinicalRubric';
import { buildTaskThreeFeedbackPackage } from './feedback';
import { countWords, markTaskThree } from './marking';
import type {
  AhJumpResponse,
  AtrialTachycardiaResponse,
  AvnrtEcgResponse,
  TaskThreeResponses,
  TaskThreeScore,
} from './marking';
import { taskThreeTraceCatalog } from './traceCatalog';
import {
  clearTaskThreeAttempts,
  loadTaskThreeAttempts,
  saveTaskThreeAttempt,
} from './store';
import { TaskThreeTraceStrip } from './TaskThreeTraceStrip';

const atrialTachycardiaDiagnosisOptions = Object.freeze([
  'Atrial tachycardia',
  'Focal atrial tachycardia',
  'Atrial flutter',
  'AVNRT',
]);

const avnrtDiagnosisOptions = Object.freeze([
  'AVNRT',
  'AVRT',
  'Atrial tachycardia',
  'Atrial flutter',
]);

function attemptIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyTaskThreeResponses(): TaskThreeResponses {
  return {
    atrialTachycardia: {
      'at-1': { diagnosis: '', side: '' },
      'at-2': { diagnosis: '', side: '' },
      'at-3': { diagnosis: '', side: '' },
    },
    ahJump: {
      'ah-jump-below-50': { identifiesAhJump: null, thresholdClass: '' },
      'ah-jump-above-50': { identifiesAhJump: null, thresholdClass: '' },
    },
    cannonWave: '',
    adenosine: '',
    avnrtEcg: { diagnosis: '', pathway: '', explanation: '' },
  };
}

function taskHref(task: 'interval' | '1' | '2' | '3' | '4' | '5', instructor: boolean): string {
  const taskQuery = task === 'interval' ? '' : `&task=${task}`;
  const viewQuery = instructor ? '&view=instructor' : '';
  return `/?mode=assessment${taskQuery}${viewQuery}`;
}

function scoreFeedback(result: TaskThreeScore): readonly string[] {
  return Object.freeze([
    ...result.atrialTachycardia.feedback,
    ...result.ahJump.feedback,
    ...result.cannonWave.feedback,
    ...result.adenosine.feedback,
    ...result.avnrtEcg.feedback,
  ]);
}

export function TaskThreeScoreBar({ result }: { readonly result: TaskThreeScore }) {
  return (
    <section className="task-three-scorebar" aria-label="Task 3 score" aria-live="polite">
      <strong>{result.score}/23</strong>
      <span>Atrial tachycardia {result.atrialTachycardia.score}/6</span>
      <span>AH change {result.ahJump.score}/4</span>
      <span>Cannon wave {result.cannonWave.score}/5</span>
      <span>Adenosine {result.adenosine.score}/5</span>
      <span>AVNRT {result.avnrtEcg.score}/3</span>
    </section>
  );
}

export function TaskThreeAssessment({ assessmentView }: { readonly assessmentView: AssessmentView }) {
  const instructor = assessmentView === 'instructor';
  const traceView = instructor ? 'instructor' : 'student';
  const [responses, setResponses] = useState<TaskThreeResponses>(createEmptyTaskThreeResponses);
  const [result, setResult] = useState<TaskThreeScore | null>(null);
  const [attempts, setAttempts] = useState(() => loadTaskThreeAttempts());
  const [latestAttemptId, setLatestAttemptId] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const updateAtrialTachycardia = (
    id: TaskThreeAtrialTachycardiaCaseId,
    patch: Partial<AtrialTachycardiaResponse>,
  ): void => {
    setResponses((current) => ({
      ...current,
      atrialTachycardia: {
        ...current.atrialTachycardia,
        [id]: { ...current.atrialTachycardia[id], ...patch },
      },
    }));
    setResult(null);
  };

  const updateAhJump = (
    id: TaskThreeAhJumpCaseId,
    patch: Partial<AhJumpResponse>,
  ): void => {
    setResponses((current) => ({
      ...current,
      ahJump: {
        ...current.ahJump,
        [id]: { ...current.ahJump[id], ...patch },
      },
    }));
    setResult(null);
  };

  const updateAvnrt = (patch: Partial<AvnrtEcgResponse>): void => {
    setResponses((current) => ({
      ...current,
      avnrtEcg: { ...current.avnrtEcg, ...patch },
    }));
    setResult(null);
  };

  const submit = (): void => {
    const nextResult = markTaskThree(responses, taskThreeClinicalRubric);
    const id = attemptIdentifier();
    const createdAtIso = new Date().toISOString();
    setResult(nextResult);
    setLatestAttemptId(id);
    setAttempts(saveTaskThreeAttempt({ id, createdAtIso, result: nextResult }));
    setCopyStatus(`Task 3 attempt saved locally: ${nextResult.score}/23.`);
  };

  const resetAnswers = (): void => {
    setResponses(createEmptyTaskThreeResponses());
    setResult(null);
    setLatestAttemptId(null);
    setFeedbackNotes('');
    setCopyStatus('Task 3 answers reset. Saved attempt history was kept.');
  };

  const copyFeedbackPackage = async (): Promise<void> => {
    if (!result || !latestAttemptId) {
      setCopyStatus('Mark Task 3 before copying a feedback package.');
      return;
    }

    const packageData = buildTaskThreeFeedbackPackage({
      assessmentView,
      attemptId: latestAttemptId,
      createdAtIso: new Date().toISOString(),
      responses,
      result,
      notes: feedbackNotes,
      browser: typeof navigator === 'undefined' ? 'unavailable' : navigator.userAgent,
    });

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(JSON.stringify(packageData, null, 2));
      setCopyStatus('Task 3 feedback package copied. Paste it into email or your project message.');
    } catch {
      setCopyStatus('Clipboard access failed. Select and copy your notes manually.');
    }
  };

  const feedback = result ? scoreFeedback(result) : [];

  return (
    <main className="assessment-shell task-three-shell">
      <ClientModuleNav current="assessment" />

      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · TASK 3 · 23 MARKS</p>
          <h1>Tachycardia and AH-change interpretation</h1>
          <p>
            Interpret six deterministic synthetic ECG/EGM traces, then answer the cannon-wave and
            adenosine questions using the approved educational rubric.
          </p>
        </div>
        <a className="return-link" href="/">All modules</a>
      </header>

      <div className="assessment-view-switch" aria-label="Task 3 preview view">
        {instructor ? (
          <>
            <a href={taskHref('3', false)}>Student preview</a>
            <span className="active" aria-current="page">Instructor preview</span>
          </>
        ) : (
          <>
            <span className="active" aria-current="page">Student preview</span>
            <a href={taskHref('3', true)}>Instructor preview</a>
          </>
        )}
      </div>

      <nav className="assessment-task-nav" aria-label="Assessment sections">
        <a href={taskHref('interval', instructor)}>Interval trainer</a>
        <a href={taskHref('1', instructor)}>Task 1 · Basic EP study</a>
        <a href={taskHref('2', instructor)}>Task 2 · Sinus node, refractoriness & AV block</a>
        <a className="active" href={taskHref('3', instructor)}>Task 3 · Tachycardia & AH change</a>
        <a href={taskHref('4', instructor)}>Task 4 · Intracardiac manoeuvres</a>
        <a href={taskHref('5', instructor)}>Task 5 · VT & para-Hisian pacing</a>
      </nav>

      <div className="prototype-warning">
        Synthetic educational traces only. They are not patient data and are not validated for diagnosis or clinical decision-making.
      </div>
      {instructor && (
        <div className="instructor-warning">
          Instructor preview exposes answer annotations and rubric criteria. This login-free static build is not secure examination infrastructure.
        </div>
      )}

      {result && <TaskThreeScoreBar result={result} />}

      <section className="task-three-grid" aria-label="Tachycardia ECG cases">
        {taskThreeAtrialTachycardiaCases.map((taskCase, index) => {
          const trace = taskThreeTraceCatalog[taskCase.traceId];
          const response = responses.atrialTachycardia[taskCase.id];
          const answer = taskThreeClinicalRubric.atrialTachycardia[taskCase.id];
          return (
            <article className="assessment-panel task-three-card" key={taskCase.id}>
              <div className="assessment-panel-heading">
                <div><span>TACHYCARDIA ECG {index + 1} · 2 MARKS</span><h2>Diagnosis and chamber side</h2></div>
              </div>
              <TaskThreeTraceStrip
                definition={trace}
                view={traceView}
                studentTitle={`Tachycardia ECG ${index + 1}`}
                studentDescription="Synthetic surface ECG for diagnosis and left-versus-right chamber localisation."
              />
              <p className="prompt-copy">Identify the rhythm and whether the likely atrial origin is left- or right-sided.</p>
              <div className="task-three-form-row">
                <label>
                  Diagnosis
                  <select
                    value={response.diagnosis}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAtrialTachycardia(taskCase.id, { diagnosis: event.target.value })}
                  >
                    <option value="">Select…</option>
                    {atrialTachycardiaDiagnosisOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label>
                  Likely chamber side
                  <select
                    value={response.side}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAtrialTachycardia(taskCase.id, { side: event.target.value as AtrialTachycardiaResponse['side'] })}
                  >
                    <option value="">Select…</option>
                    <option value="left">Left-sided</option>
                    <option value="right">Right-sided</option>
                  </select>
                </label>
              </div>
              {instructor && (
                <div className="instructor-answer-key">
                  <strong>Answer key</strong>
                  <span>{answer.acceptedDiagnoses[0]} · {answer.expectedSide}-sided</span>
                  <span>{trace.description}</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="task-three-grid task-three-section" aria-label="AH change EGM cases">
        {taskThreeAhJumpCases.map((taskCase, index) => {
          const trace = taskThreeTraceCatalog[taskCase.traceId];
          const response = responses.ahJump[taskCase.id];
          const answer = taskThreeClinicalRubric.ahJump[taskCase.id];
          return (
            <article className="assessment-panel task-three-card" key={taskCase.id}>
              <div className="assessment-panel-heading">
                <div><span>AH EGM {index + 1} · 2 MARKS</span><h2>Conventional AH-jump decision</h2></div>
              </div>
              <TaskThreeTraceStrip
                definition={trace}
                view={traceView}
                studentTitle={`AH-change EGM ${index + 1}`}
                studentDescription="Synthetic intracardiac EGM pair for assessing AH change after a 10 ms coupling-interval decrement."
              />
              <p className="prompt-copy">{taskCase.prompt}</p>
              <div className="task-three-form-row">
                <label>
                  Meets the conventional AH-jump criterion?
                  <select
                    value={response.identifiesAhJump === null ? '' : response.identifiesAhJump ? 'yes' : 'no'}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAhJump(taskCase.id, {
                      identifiesAhJump: event.target.value === '' ? null : event.target.value === 'yes',
                    })}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label>
                  AH change relative to 50 ms
                  <select
                    value={response.thresholdClass}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAhJump(taskCase.id, {
                      thresholdClass: event.target.value as AhJumpResponse['thresholdClass'],
                    })}
                  >
                    <option value="">Select…</option>
                    <option value="below-50-ms">Below 50 ms</option>
                    <option value="above-50-ms">At least 50 ms</option>
                  </select>
                </label>
              </div>
              {instructor && (
                <div className="instructor-answer-key">
                  <strong>Answer key</strong>
                  <span>{answer.expectedAhJump ? 'Meets' : 'Does not meet'} the conventional criterion.</span>
                  <span>{answer.expectedThresholdClass === 'below-50-ms' ? 'Below 50 ms' : 'At least 50 ms'}.</span>
                  <span>{trace.description}</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="task-three-grid task-three-section" aria-label="Written-response cases">
        {taskThreeWrittenResponseCases.map((taskCase) => {
          const value = taskCase.id === 'cannon-wave' ? responses.cannonWave : responses.adenosine;
          const criteria = taskCase.id === 'cannon-wave'
            ? taskThreeClinicalRubric.cannonWaveCriteria
            : taskThreeClinicalRubric.adenosineCriteria;
          return (
            <article className="assessment-panel task-three-card" key={taskCase.id}>
              <div className="assessment-panel-heading">
                <div><span>WRITTEN RESPONSE · 5 MARKS</span><h2>{taskCase.id === 'cannon-wave' ? 'Cannon wave' : 'Adenosine'}</h2></div>
                <strong className="task-three-word-count">{countWords(value)}/{TASK_THREE_TARGET_WORD_COUNT} words</strong>
              </div>
              <p className="prompt-copy">{taskCase.prompt}</p>
              <label>
                Your response
                <textarea
                  value={value}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                    const nextValue = event.target.value;
                    setResponses((current) => taskCase.id === 'cannon-wave'
                      ? { ...current, cannonWave: nextValue }
                      : { ...current, adenosine: nextValue });
                    setResult(null);
                  }}
                />
              </label>
              {instructor && (
                <div className="instructor-answer-key">
                  <strong>Five one-mark concepts</strong>
                  {criteria.map((item) => <span key={item.id}>{item.label}</span>)}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="assessment-panel task-three-card task-three-section task-three-wide" aria-label="Narrow-complex tachycardia ECG case">
        <div className="assessment-panel-heading">
          <div><span>TACHYCARDIA ECG · 3 MARKS</span><h2>Diagnosis, antegrade pathway and rationale</h2></div>
        </div>
        <TaskThreeTraceStrip
          definition={taskThreeTraceCatalog[taskThreeAvnrtCase.traceId]}
          view={traceView}
          studentTitle="Regular narrow-complex tachycardia ECG"
          studentDescription="Synthetic surface ECG for rhythm diagnosis, pathway selection and explanation."
        />
        <p className="prompt-copy">Interpret the narrow-complex tachycardia and identify the likely antegrade pathway.</p>
        <div className="task-three-form-row">
          <label>
            Diagnosis
            <select value={responses.avnrtEcg.diagnosis} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAvnrt({ diagnosis: event.target.value })}>
              <option value="">Select…</option>
              {avnrtDiagnosisOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Likely antegrade pathway
            <select value={responses.avnrtEcg.pathway} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateAvnrt({ pathway: event.target.value as AvnrtEcgResponse['pathway'] })}>
              <option value="">Select…</option>
              <option value="slow">Slow pathway</option>
              <option value="fast">Fast pathway</option>
            </select>
          </label>
        </div>
        <label>
          Explain the ECG finding supporting your answer
          <textarea value={responses.avnrtEcg.explanation} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateAvnrt({ explanation: event.target.value })} />
        </label>
        {instructor && (
          <div className="instructor-answer-key">
            <strong>Answer key</strong>
            <span>{taskThreeClinicalRubric.avnrtEcg.acceptedDiagnoses[0]} · antegrade {taskThreeClinicalRubric.avnrtEcg.expectedPathway} pathway</span>
            <span>{taskThreeClinicalRubric.avnrtEcg.explanationCriterion.label}</span>
          </div>
        )}
      </section>

      <footer className="assessment-footer task-three-footer">
        <div>
          <button className="assessment-primary" onClick={submit}>Mark and save Task 3</button>
          <button onClick={resetAnswers}>Reset answers</button>
        </div>
        <span>{attempts.length} local Task 3 attempt{attempts.length === 1 ? '' : 's'}</span>
      </footer>

      {result && result.score < result.maximumScore && (
        <section className="assessment-panel task-three-feedback" aria-live="polite">
          <h2>Feedback</h2>
          {feedback.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
        </section>
      )}

      <section className="assessment-grid lower-grid task-three-section">
        <article className="assessment-panel">
          <div className="assessment-panel-heading">
            <div><span>LOCAL DEVICE ONLY</span><h2>Recent Task 3 attempts</h2></div>
            <button onClick={() => { clearTaskThreeAttempts(); setAttempts([]); }}>Clear history</button>
          </div>
          {attempts.length === 0 ? (
            <p className="empty-copy">No marked Task 3 attempts yet.</p>
          ) : (
            <div className="attempt-list">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id}>
                  <strong>Task 3</strong>
                  <span>{attempt.result.score}/23</span>
                  <time>{new Date(attempt.createdAtIso).toLocaleString()}</time>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside id="feedback" className="assessment-panel">
          <span className="assessment-panel-kicker">CLIENT FEEDBACK</span>
          <h2>What should change in Task 3?</h2>
          <textarea
            value={feedbackNotes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)}
            placeholder="Describe incorrect morphology, labels, workflow, marking or visual changes."
          />
          <button onClick={() => void copyFeedbackPackage()}>Copy Task 3 feedback package</button>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
        </aside>
      </section>
    </main>
  );
}
