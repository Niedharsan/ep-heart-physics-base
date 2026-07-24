import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../../clientPreview/ClientModuleNav';
import type { AssessmentView } from '../assessmentView';
import { taskFiveCases } from './catalog';
import type { TaskFiveCaseId } from './catalog';
import { taskFiveClinicalRubric } from './clinicalRubric';
import { buildTaskFiveFeedbackPackage } from './feedback';
import { markTaskFive } from './marking';
import type { TaskFiveResponses, TaskFiveScore } from './marking';
import {
  clearTaskFiveAttempts,
  loadTaskFiveAttempts,
  saveTaskFiveAttempt,
} from './store';
import { taskFiveTraceCatalog } from './traceCatalog';
import { TaskFiveTraceStrip } from './TaskFiveTraceStrip';

const caseHeadings: Readonly<Record<TaskFiveCaseId, string>> = Object.freeze({
  'vt-rvot': 'Wide-complex tachycardia · case 1',
  'vt-fascicular': 'Wide-complex tachycardia · case 2',
  'para-hisian': 'Para-Hisian pacing',
});

const studentTraceTitles: Readonly<Record<TaskFiveCaseId, string>> = Object.freeze({
  'vt-rvot': 'Wide-complex tachycardia ECG case 1',
  'vt-fascicular': 'Wide-complex tachycardia ECG case 2',
  'para-hisian': 'Paired pacing EGM case',
});

const studentTraceDescriptions: Readonly<Record<TaskFiveCaseId, string>> = Object.freeze({
  'vt-rvot': 'Schematic six-lead teaching ECG for ventricular-tachycardia morphology interpretation.',
  'vt-fascicular': 'Schematic six-lead teaching ECG for ventricular-tachycardia morphology interpretation.',
  'para-hisian': 'Schematic paired para-Hisian pacing recording with two surface leads, paired His recordings, RVA and five CS bipoles.',
});

const taskLinks = Object.freeze([
  Object.freeze({ id: 'interval', label: 'Interval trainer' }),
  Object.freeze({ id: '1', label: 'Task 1 · Basic EP study' }),
  Object.freeze({ id: '2', label: 'Task 2 · Sinus node, refractoriness & AV block' }),
  Object.freeze({ id: '3', label: 'Task 3 · Tachycardia & AH change' }),
  Object.freeze({ id: '4', label: 'Task 4 · Intracardiac manoeuvres' }),
  Object.freeze({ id: '5', label: 'Task 5 · VT & para-Hisian pacing' }),
] as const);

export function createEmptyTaskFiveResponses(): TaskFiveResponses {
  return {
    'vt-rvot': '',
    'vt-fascicular': '',
    'para-hisian': '',
  };
}

function taskHref(task: 'interval' | '1' | '2' | '3' | '4' | '5', instructor: boolean): string {
  const taskQuery = task === 'interval' ? '' : `&task=${task}`;
  const viewQuery = instructor ? '&view=instructor' : '';
  return `/?mode=assessment${taskQuery}${viewQuery}`;
}

function attemptIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scoreFeedback(result: TaskFiveScore): readonly string[] {
  return Object.freeze(taskFiveCases.flatMap((taskCase) => result.sections[taskCase.id].feedback));
}

export function TaskFiveScoreBar({ result }: { readonly result: TaskFiveScore }) {
  return (
    <section className="task-five-scorebar" aria-label="Task 5 score" aria-live="polite">
      <strong>{result.score}/15</strong>
      <span>VT ECG 1 {result.sections['vt-rvot'].score}/2</span>
      <span>VT ECG 2 {result.sections['vt-fascicular'].score}/3</span>
      <span>Para-Hisian {result.sections['para-hisian'].score}/10</span>
    </section>
  );
}

export function TaskFiveAssessment({ assessmentView }: { readonly assessmentView: AssessmentView }) {
  const instructor = assessmentView === 'instructor';
  const assessmentMode = typeof window === 'undefined'
    ? 'practice'
    : new URLSearchParams(window.location.search).get('assessmentMode') ?? 'practice';
  const [responses, setResponses] = useState<TaskFiveResponses>(createEmptyTaskFiveResponses);
  const [result, setResult] = useState<TaskFiveScore | null>(null);
  const traceView = instructor || (assessmentMode === 'practice' && result !== null)
    ? 'instructor'
    : 'student';
  const [attempts, setAttempts] = useState(() => loadTaskFiveAttempts());
  const [latestAttemptId, setLatestAttemptId] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const updateResponse = (id: TaskFiveCaseId, value: string): void => {
    setResponses((current) => ({ ...current, [id]: value }));
    setResult(null);
  };

  const submit = (): void => {
    const nextResult = markTaskFive(responses, taskFiveClinicalRubric);
    const id = attemptIdentifier();
    const createdAtIso = new Date().toISOString();
    setResult(nextResult);
    setLatestAttemptId(id);
    setAttempts(saveTaskFiveAttempt({ id, createdAtIso, result: nextResult }));
    setCopyStatus(`Task 5 attempt saved: ${nextResult.score}/15.`);
  };

  const resetAnswers = (): void => {
    setResponses(createEmptyTaskFiveResponses());
    setResult(null);
    setLatestAttemptId(null);
    setFeedbackNotes('');
    setCopyStatus('Answers reset. Attempt history was kept.');
  };

  const copyFeedbackPackage = async (): Promise<void> => {
    if (!result || !latestAttemptId) {
      setCopyStatus('Mark Task 5 before copying feedback.');
      return;
    }

    const packageData = buildTaskFiveFeedbackPackage({
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
      setCopyStatus('Feedback copied.');
    } catch {
      setCopyStatus('Clipboard access failed. Select and copy your notes manually.');
    }
  };

  const feedback = result ? scoreFeedback(result) : [];

  return (
    <main className="assessment-shell task-five-shell">
      <ClientModuleNav current="assessment" />

      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · TASK 5 · 15 MARKS</p>
          <h1>Ventricular tachycardia and para-Hisian pacing</h1>
          <p>Interpret two VT ECG patterns and compare paired para-Hisian pacing states.</p>
        </div>
        <a className="return-link" href="/">All modules</a>
      </header>

      <div className="assessment-view-switch" aria-label="Task 5 preview view">
        {instructor ? (
          <>
            <a href={taskHref('5', false)}>Student preview</a>
            <span className="active" aria-current="page">Instructor preview</span>
          </>
        ) : (
          <>
            <span className="active" aria-current="page">Student preview</span>
            <a href={taskHref('5', true)}>Instructor preview</a>
          </>
        )}
      </div>

      <nav className="assessment-task-nav" aria-label="Assessment sections">
        {taskLinks.map((item) => (
          <a
            key={item.id}
            className={item.id === '5' ? 'active' : undefined}
            href={taskHref(item.id, instructor)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="prototype-warning">
        Synthetic educational traces only. Morphology and para-Hisian pacing criteria have recognised exceptions and must not be used for patient diagnosis.
      </div>
      {instructor && (
        <div className="instructor-warning">
          Instructor preview exposes morphology labels, pacing annotations and rubric concepts. This login-free static build is not secure examination infrastructure.
        </div>
      )}

      {result && <TaskFiveScoreBar result={result} />}

      <section className="task-five-grid" aria-label="Task 5 cases">
        {taskFiveCases.map((taskCase, index) => {
          const trace = taskFiveTraceCatalog[taskCase.traceId];
          const criteria = taskFiveClinicalRubric.sections[taskCase.id];
          const wideClass = taskCase.id === 'para-hisian' ? ' task-five-wide' : '';
          return (
            <article className={`assessment-panel task-five-card${wideClass}`} key={taskCase.id}>
              <div className="assessment-panel-heading">
                <div>
                  <span>
                    {taskCase.id === 'para-hisian' ? 'EGM' : 'ECG'} CASE {index + 1} · {taskCase.maximumScore} MARKS
                  </span>
                  <h2>{caseHeadings[taskCase.id]}</h2>
                </div>
              </div>

              <TaskFiveTraceStrip
                definition={trace}
                view={traceView}
                studentTitle={studentTraceTitles[taskCase.id]}
                studentDescription={studentTraceDescriptions[taskCase.id]}
              />

              <p className="prompt-copy">{taskCase.prompt}</p>
              <label>
                Your interpretation
                <textarea
                  value={responses[taskCase.id]}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => (
                    updateResponse(taskCase.id, event.target.value)
                  )}
                  placeholder={taskCase.id === 'para-hisian'
                    ? 'Describe capture, QRS change, S-A timing and retrograde sequence.'
                    : 'State the likely VT origin or subtype and supporting morphology.'}
                />
              </label>

              {instructor && (
                <div className="instructor-answer-key">
                  <strong>{taskCase.maximumScore} one-mark concepts</strong>
                  {criteria.map((item) => <span key={item.id}>{item.label}</span>)}
                  <span>{trace.description}</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <footer className="assessment-footer task-five-footer">
        <div>
          <button className="assessment-primary" onClick={submit}>Mark and save Task 5</button>
          <button onClick={resetAnswers}>Reset answers</button>
        </div>
        <span>{attempts.length} local Task 5 attempt{attempts.length === 1 ? '' : 's'}</span>
      </footer>

      {result && result.score < result.maximumScore && (
        <section className="assessment-panel task-five-feedback" aria-live="polite">
          <h2>Feedback</h2>
          {feedback.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
        </section>
      )}

      <section className="assessment-grid lower-grid task-five-section">
        <article className="assessment-panel">
          <div className="assessment-panel-heading">
            <div><span>LOCAL DEVICE ONLY</span><h2>Recent Task 5 attempts</h2></div>
            <button onClick={() => {
              clearTaskFiveAttempts();
              setAttempts([]);
            }}>
              Clear history
            </button>
          </div>
          {attempts.length === 0 ? (
            <p className="empty-copy">No marked Task 5 attempts yet.</p>
          ) : (
            <div className="attempt-list">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id}>
                  <strong>Task 5</strong>
                  <span>{attempt.result.score}/15</span>
                  <time>{new Date(attempt.createdAtIso).toLocaleString()}</time>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside id="feedback" className="assessment-panel">
          <span className="assessment-panel-kicker">CLIENT FEEDBACK</span>
          <h2>What should change in Task 5?</h2>
          <textarea
            value={feedbackNotes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)}
            placeholder="Describe a morphology, timing, label or marking issue."
          />
          <button onClick={() => void copyFeedbackPackage()}>Copy Task 5 feedback package</button>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
        </aside>
      </section>
    </main>
  );
}
