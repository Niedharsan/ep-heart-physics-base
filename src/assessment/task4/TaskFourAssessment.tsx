import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ClientModuleNav } from '../../clientPreview/ClientModuleNav';
import { appHref } from '../../appHref';
import type { AssessmentView } from '../assessmentView';
import { AssessmentSessionBoundary } from '../AssessmentSessionBoundary';
import {
  buildAssessmentHref,
  useAssessmentSessionController,
} from '../sessionController';
import type { SharedAssessmentMode } from '../sessionController';
import {
  clearAssessmentWorkingState,
  loadAssessmentDraft,
  loadAssessmentResult,
  saveAssessmentDraft,
  saveAssessmentResult,
} from '../workingState';
import { taskFourCases } from './catalog';
import type { TaskFourCaseId } from './catalog';
import { taskFourClinicalRubric } from './clinicalRubric';
import { buildTaskFourFeedbackPackage } from './feedback';
import {
  createEmptyTaskFourResponses,
  markTaskFour,
} from './marking';
import type { TaskFourResponses, TaskFourScore } from './marking';
import {
  clearTaskFourAttempts,
  loadTaskFourAttempts,
  saveTaskFourAttempt,
} from './store';
import { taskFourTraceCatalog } from './traceCatalog';
import { TaskFourTraceStrip } from './TaskFourTraceStrip';

const caseHeadings: Readonly<Record<TaskFourCaseId, string>> = Object.freeze({
  'avrt-concentric': 'Retrograde activation sequence — case 1',
  'avrt-eccentric': 'Retrograde activation sequence — case 2',
  'vaav-pattern': 'Post-pacing sequence — case 3',
  'vav-pattern': 'Post-pacing differential — case 4',
});

const studentTraceTitles: Readonly<Record<TaskFourCaseId, string>> = Object.freeze({
  'avrt-concentric': 'Tachycardia EGM case 1',
  'avrt-eccentric': 'Tachycardia EGM case 2',
  'vaav-pattern': 'Ventricular pacing EGM case 3',
  'vav-pattern': 'Ventricular pacing EGM case 4',
});

function taskHref(
  task: 'interval' | '1' | '2' | '3' | '4' | '5',
  instructor: boolean,
  assessmentMode: SharedAssessmentMode,
): string {
  return buildAssessmentHref(task, instructor, assessmentMode);
}

function attemptIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scoreFeedback(result: TaskFourScore): readonly string[] {
  return Object.freeze(taskFourCases.flatMap((taskCase) => result.sections[taskCase.id].feedback));
}

export function TaskFourScoreBar({ result }: { readonly result: TaskFourScore }) {
  return (
    <section className="task-four-scorebar" aria-label="Task 4 score" aria-live="polite">
      <strong>{result.score}/25</strong>
      <span>Case 1 {result.sections['avrt-concentric'].score}/5</span>
      <span>Case 2 {result.sections['avrt-eccentric'].score}/5</span>
      <span>VAAV {result.sections['vaav-pattern'].score}/5</span>
      <span>VAV {result.sections['vav-pattern'].score}/10</span>
    </section>
  );
}

export function TaskFourAssessment({
  assessmentView,
  assessmentMode = 'practice',
}: {
  readonly assessmentView: AssessmentView;
  readonly assessmentMode?: SharedAssessmentMode;
}) {
  const instructor = assessmentMode === 'practice' && assessmentView === 'instructor';
  const [responses, setResponses] = useState<TaskFourResponses>(() => (
    loadAssessmentDraft(assessmentMode, '4', createEmptyTaskFourResponses())
  ));
  const [result, setResult] = useState<TaskFourScore | null>(() => (
    loadAssessmentResult<TaskFourScore>(assessmentMode, '4')
  ));
  useEffect(() => {
    saveAssessmentDraft(assessmentMode, '4', responses);
  }, [assessmentMode, responses]);

  useEffect(() => {
    saveAssessmentResult(assessmentMode, '4', result);
  }, [assessmentMode, result]);

  const traceView = instructor || (assessmentMode === 'practice' && result !== null)
    ? 'instructor'
    : 'student';
  const [attempts, setAttempts] = useState(() => loadTaskFourAttempts());
  const [latestAttemptId, setLatestAttemptId] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const updateResponse = (id: TaskFourCaseId, value: string): void => {
    setResponses((current) => ({ ...current, [id]: value }));
    setResult(null);
  };

  const submit = (): void => {
    const nextResult = markTaskFour(responses, taskFourClinicalRubric);
    const id = attemptIdentifier();
    const createdAtIso = new Date().toISOString();
    setResult(nextResult);
    setLatestAttemptId(id);
    setAttempts(saveTaskFourAttempt({ id, createdAtIso, result: nextResult }));
    setCopyStatus(`Task 4 attempt saved locally: ${nextResult.score}/25.`);
  };

  const resetAnswers = (): void => {
    clearAssessmentWorkingState(assessmentMode, '4');
    setResponses(createEmptyTaskFourResponses());
    setResult(null);
    setLatestAttemptId(null);
    setFeedbackNotes('');
    setCopyStatus('Task 4 answers reset. Saved attempt history was kept.');
  };

  const session = useAssessmentSessionController({
    mode: assessmentMode,
    task: '4',
    onStart: () => {
      clearAssessmentWorkingState(assessmentMode, '4');
      setResponses(createEmptyTaskFourResponses());
      setResult(null);
      setLatestAttemptId(null);
      setFeedbackNotes('');
      setCopyStatus('');
    },
    onSubmit: submit,
  });

  const copyFeedbackPackage = async (): Promise<void> => {
    if (!result || !latestAttemptId) {
      setCopyStatus('Mark Task 4 before copying a feedback package.');
      return;
    }

    const packageData = buildTaskFourFeedbackPackage({
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
      setCopyStatus('Task 4 feedback package copied. Paste it into email or your project message.');
    } catch {
      setCopyStatus('Clipboard access failed. Select and copy your notes manually.');
    }
  };

  const feedback = result ? scoreFeedback(result) : [];

  return (
    <AssessmentSessionBoundary controller={session}>
      <main className="assessment-shell task-four-shell">
      <ClientModuleNav current="assessment" />

      <header className="assessment-header">
        <div>
          <p className="assessment-eyebrow">EP HEART · TASK 4 · 25 MARKS</p>
          <h1>Intracardiac tachycardia manoeuvres</h1>
          <p>
            Interpret four deterministic synthetic intracardiac tracing cases covering retrograde
            activation sequence and post-pacing responses in narrow-complex tachycardia.
          </p>
        </div>
        <a className="return-link" href={appHref()}>All modules</a>
      </header>

      <div className="assessment-view-switch" aria-label="Task 4 preview view">
        {assessmentMode !== 'practice' ? (
          <span className="active" aria-current="page">Student preview</span>
        ) : instructor ? (
          <>
            <a href={taskHref('4', false, assessmentMode)}>Student preview</a>
            <span className="active" aria-current="page">Instructor preview</span>
          </>
        ) : (
          <>
            <span className="active" aria-current="page">Student preview</span>
            <a href={taskHref('4', true, assessmentMode)}>Instructor preview</a>
          </>
        )}
      </div>

      <nav className="assessment-task-nav" aria-label="Assessment sections">
        <a href={taskHref('interval', instructor, assessmentMode)}>Interval trainer</a>
        <a href={taskHref('1', instructor, assessmentMode)}>Task 1 · Basic EP study</a>
        <a href={taskHref('2', instructor, assessmentMode)}>Task 2 · Sinus node, refractoriness & AV block</a>
        <a href={taskHref('3', instructor, assessmentMode)}>Task 3 · Tachycardia & AH change</a>
        <a className="active" href={taskHref('4', instructor, assessmentMode)}>Task 4 · Intracardiac manoeuvres</a>
        <a href={taskHref('5', instructor, assessmentMode)}>Task 5 · VT & para-Hisian pacing</a>
      </nav>

      <div className="prototype-warning">
        Synthetic educational traces only. Activation sequence and pacing criteria have recognised exceptions and must not be used for patient diagnosis.
      </div>
      {instructor && (
        <div className="instructor-warning">
          Instructor preview exposes trace annotations and rubric concepts. This login-free static build is not secure examination infrastructure.
        </div>
      )}

      {result && <TaskFourScoreBar result={result} />}

      <section className="task-four-grid" aria-label="Task 4 EGM cases">
        {taskFourCases.map((taskCase, index) => {
          const trace = taskFourTraceCatalog[taskCase.traceId];
          const criteria = taskFourClinicalRubric.sections[taskCase.id];
          return (
            <article className={`assessment-panel task-four-card ${taskCase.id === 'vav-pattern' ? 'task-four-wide' : ''}`} key={taskCase.id}>
              <div className="assessment-panel-heading">
                <div>
                  <span>EGM CASE {index + 1} · {taskCase.maximumScore} MARKS</span>
                  <h2>{caseHeadings[taskCase.id]}</h2>
                </div>
              </div>
              <TaskFourTraceStrip
                definition={trace}
                view={traceView}
                studentTitle={studentTraceTitles[taskCase.id]}
                studentDescription="Synthetic intracardiac tracing for mechanism and pacing-manoeuvre interpretation."
              />
              <p className="prompt-copy">{taskCase.prompt}</p>
              <label>
                Your interpretation
                <textarea
                  value={responses[taskCase.id]}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateResponse(taskCase.id, event.target.value)}
                  placeholder="State the sequence, mechanism and supporting measurements or next manoeuvres."
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

      <footer className="assessment-footer task-four-footer">
        <div>
          <button className="assessment-primary" onClick={() => session.submit(Date.now())}>
            {assessmentMode === 'practice' ? 'Mark and save Task 4' : 'Submit Task 4'}
          </button>
          <button onClick={resetAnswers}>Reset answers</button>
        </div>
        <span>{attempts.length} local Task 4 attempt{attempts.length === 1 ? '' : 's'}</span>
      </footer>

      {result && result.score < result.maximumScore && (
        <section className="assessment-panel task-four-feedback" aria-live="polite">
          <h2>Feedback</h2>
          {feedback.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
        </section>
      )}

      <section className="assessment-grid lower-grid task-four-section">
        <article className="assessment-panel">
          <div className="assessment-panel-heading">
            <div><span>LOCAL DEVICE ONLY</span><h2>Recent Task 4 attempts</h2></div>
            <button onClick={() => { clearTaskFourAttempts(); setAttempts([]); }}>Clear history</button>
          </div>
          {attempts.length === 0 ? (
            <p className="empty-copy">No marked Task 4 attempts yet.</p>
          ) : (
            <div className="attempt-list">
              {attempts.slice(0, 8).map((attempt) => (
                <div key={attempt.id}>
                  <strong>Task 4</strong>
                  <span>{attempt.result.score}/25</span>
                  <time>{new Date(attempt.createdAtIso).toLocaleString()}</time>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside id="feedback" className="assessment-panel">
          <span className="assessment-panel-kicker">CLIENT FEEDBACK</span>
          <h2>What should change in Task 4?</h2>
          <textarea
            value={feedbackNotes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackNotes(event.target.value)}
            placeholder="Describe incorrect morphology, timing, labels, workflow or marking concepts."
          />
          <button onClick={() => void copyFeedbackPackage()}>Copy Task 4 feedback package</button>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
        </aside>
      </section>
      </main>
    </AssessmentSessionBoundary>
  );
}
