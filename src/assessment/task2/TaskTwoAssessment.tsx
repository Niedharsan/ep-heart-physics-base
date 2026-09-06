import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
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
import { taskTwoEcgCases, taskTwoEcgOptions, taskTwoPatternCases, taskTwoPatternOptions, wenckebachCase } from './catalog';
import { markTaskTwo } from './marking';
import type { PatternResponse, TaskTwoResponses, TaskTwoScore } from './marking';
import { loadTaskTwoAttempts, saveTaskTwoAttempt } from './store';
import { taskTwoTraceCatalog } from './traceCatalog';
import { TraceStrip } from './TraceStrip';
import { CatheterPlacementExercise } from '../CatheterPlacementExercise';

const emptyPattern = (): PatternResponse => ({ diagnosis: '', explanation: '' });
const emptyResponses = (): TaskTwoResponses => ({
  snrtLocation: '',
  snrtPurpose: '',
  patterns: { ARP: emptyPattern(), ERP: emptyPattern(), AVNRT: emptyPattern() },
  wenckebach: emptyPattern(),
  ecgAnswers: ['', '', '', '', ''],
});
const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random()}`;

export function TaskTwoAssessment({
  assessmentView,
  assessmentMode = 'practice',
}: {
  readonly assessmentView: AssessmentView;
  readonly assessmentMode?: SharedAssessmentMode;
}) {
  const instructor = assessmentMode === 'practice' && assessmentView === 'instructor';
  const [responses, setResponses] = useState<TaskTwoResponses>(() => (
    loadAssessmentDraft(assessmentMode, '2', emptyResponses())
  ));
  const [result, setResult] = useState<TaskTwoScore | null>(() => (
    loadAssessmentResult<TaskTwoScore>(assessmentMode, '2')
  ));
  const [attempts, setAttempts] = useState(() => loadTaskTwoAttempts());
  // Keep all diagnostic labels and interval overlays out of learner traces.
  // They remain available in instructor view and in the answer key below.
  const showTraceAnnotations = instructor;
  useEffect(() => {
    saveAssessmentDraft(assessmentMode, '2', responses);
  }, [assessmentMode, responses]);

  useEffect(() => {
    saveAssessmentResult(assessmentMode, '2', result);
  }, [assessmentMode, result]);

  const updatePattern = (id: 'ARP' | 'ERP' | 'AVNRT', patch: Partial<PatternResponse>) => setResponses((current) => ({
    ...current,
    patterns: { ...current.patterns, [id]: { ...current.patterns[id], ...patch } },
  }));
  const submit = () => {
    const next = markTaskTwo(responses);
    setResult(next);
    setAttempts(saveTaskTwoAttempt({ id: uid(), createdAtIso: new Date().toISOString(), result: next }));
  };

  const session = useAssessmentSessionController({
    mode: assessmentMode,
    task: '2',
    onStart: () => {
      clearAssessmentWorkingState(assessmentMode, '2');
      setResponses(emptyResponses());
      setResult(null);
    },
    onSubmit: submit,
  });

  return (
    <AssessmentSessionBoundary controller={session}>
      <main className="assessment-shell">
      <header className="assessment-header">
        <div>
          <span className="assessment-eyebrow">TASK 2 · 22 MARKS</span>
          <h1>Sinus-node recovery, refractoriness and AV block</h1>
          <p>Interpret live deterministic ECG/EGM recordings and explain the defining findings.</p>
        </div>
        <a className="assessment-back-link" href={appHref('mode=assessment')}>Interval trainer</a>
      </header>
      <nav className="assessment-task-nav" aria-label="Assessment sections">
        <a href={buildAssessmentHref('interval', instructor, assessmentMode)}>Interval trainer</a>
        <a href={buildAssessmentHref('1', instructor, assessmentMode)}>Task 1 · Basic EP study</a>
        <a className="active" href={buildAssessmentHref('2', instructor, assessmentMode)}>Task 2 · Sinus node, refractoriness & AV block</a>
        <a href={buildAssessmentHref('3', instructor, assessmentMode)}>Task 3 · Tachycardia & AH change</a>
        <a href={buildAssessmentHref('4', instructor, assessmentMode)}>Task 4 · Intracardiac manoeuvres</a>
        <a href={buildAssessmentHref('5', instructor, assessmentMode)}>Task 5 · VT & para-Hisian pacing</a>
      </nav>
      <CatheterPlacementExercise instructor={instructor} />
      {result && (
        <section className="task-two-scorebar" aria-live="polite">
          <strong>{result.score}/22</strong>
          <span>SNRT {result.snrt.score}/3</span>
          <span>ARP/ERP/AVNRT {result.patternRecognition.score}/9</span>
          <span>Wenckebach {result.wenckebach.score}/5</span>
          <span>ECGs {result.ecg.score}/5</span>
        </section>
      )}
      <section className="task-two-grid">
        <article className="assessment-panel task-two-card">
          <h2>1. SNRT — 3 marks</h2>
          <TraceStrip definition={taskTwoTraceCatalog.snrt} showAnnotations={showTraceAnnotations} />
          <label>
            Where is SNRT measured?
            <textarea value={responses.snrtLocation} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setResponses((current) => ({ ...current, snrtLocation: event.target.value }))} />
          </label>
          <label>
            Why is SNRT measured?
            <textarea value={responses.snrtPurpose} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setResponses((current) => ({ ...current, snrtPurpose: event.target.value }))} />
          </label>
          {instructor && (
            <div className="instructor-answer-key">
              <strong>Answer key</strong>
              <span>HRA atrial electrogram; last paced A to first returning sinus A. Assesses sinus-node recovery/dysfunction after overdrive pacing.</span>
            </div>
          )}
        </article>
        {taskTwoPatternCases.map((taskCase) => (
          <article className="assessment-panel task-two-card" key={taskCase.id}>
            <h2>{taskCase.label} — 3 marks</h2>
            <TraceStrip definition={taskTwoTraceCatalog[taskCase.traceId]} showAnnotations={showTraceAnnotations} />
            <label>
              Diagnosis
              <select value={responses.patterns[taskCase.id].diagnosis} onChange={(event: ChangeEvent<HTMLSelectElement>) => updatePattern(taskCase.id, { diagnosis: event.target.value })}>
                <option value="">Select…</option>
                {taskTwoPatternOptions.slice(0, 3).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Explain the defining finding
              <textarea value={responses.patterns[taskCase.id].explanation} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updatePattern(taskCase.id, { explanation: event.target.value })} />
            </label>
            {instructor && (
              <div className="instructor-answer-key">
                <strong>{taskCase.correctDiagnosis}</strong>
                <span>{taskTwoTraceCatalog[taskCase.traceId].description}</span>
              </div>
            )}
          </article>
        ))}
        <article className="assessment-panel task-two-card">
          <h2>Wenckebach — 5 marks</h2>
          <TraceStrip definition={taskTwoTraceCatalog[wenckebachCase.traceId]} showAnnotations={showTraceAnnotations} />
          <label>
            Diagnosis
            <select value={responses.wenckebach.diagnosis} onChange={(event: ChangeEvent<HTMLSelectElement>) => setResponses((current) => ({
              ...current,
              wenckebach: { ...current.wenckebach, diagnosis: event.target.value },
            }))}>
              <option value="">Select…</option>
              {taskTwoPatternOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Explain the sequence
            <textarea value={responses.wenckebach.explanation} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setResponses((current) => ({
              ...current,
              wenckebach: { ...current.wenckebach, explanation: event.target.value },
            }))} />
          </label>
          {instructor && (
            <div className="instructor-answer-key">
              <strong>Wenckebach/Mobitz I</strong>
              <span>Progressive AH/PR prolongation, dropped conduction, grouped beating, then reset.</span>
            </div>
          )}
        </article>
        <article className="assessment-panel task-two-card task-two-ecg">
          <h2>Five ECG interpretations — 5 marks</h2>
          {taskTwoEcgCases.map((taskCase, index) => (
            <div className="task-two-ecg-row" key={taskCase.id}>
              <TraceStrip definition={taskTwoTraceCatalog[taskCase.traceId]} showAnnotations={showTraceAnnotations} />
              <select value={responses.ecgAnswers[index]} onChange={(event: ChangeEvent<HTMLSelectElement>) => setResponses((current) => ({
                ...current,
                ecgAnswers: current.ecgAnswers.map((value, answerIndex) => answerIndex === index ? event.target.value : value),
              }))} aria-label={`${taskCase.label} diagnosis`}>
                <option value="">Select…</option>
                {taskTwoEcgOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              {instructor && <small>{taskCase.answer}</small>}
            </div>
          ))}
        </article>
      </section>
      <footer className="assessment-footer">
        <button className="assessment-primary" onClick={() => session.submit(Date.now())}>
          {assessmentMode === 'practice' ? 'Mark Task 2' : 'Submit Task 2'}
        </button>
        <span>{attempts.length} local attempt{attempts.length === 1 ? '' : 's'}</span>
      </footer>
      {result && result.score < 22 && (
        <section className="assessment-panel task-two-feedback">
          <h2>Feedback</h2>
          {[...result.snrt.feedback, ...result.patternRecognition.feedback, ...result.wenckebach.feedback, ...result.ecg.feedback]
            .map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
        </section>
      )}
      </main>
    </AssessmentSessionBoundary>
  );
}
