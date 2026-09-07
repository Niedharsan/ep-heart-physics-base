import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { appHref } from '../appHref';
import { ClientModuleNav } from '../clientPreview/ClientModuleNav';
import { AssessmentSessionBoundary } from './AssessmentSessionBoundary';
import { useAssessmentSessionController } from './sessionController';
import type { SharedAssessmentMode } from './sessionController';
import { VtLocalizationLiveTrace } from './VtLocalizationLiveTrace';
import {
  clearAssessmentWorkingState,
  loadAssessmentDraft,
  loadAssessmentResult,
  saveAssessmentDraft,
  saveAssessmentResult,
} from './workingState';
import {
  EMPTY_VT_LOCALIZATION_RESPONSE,
  findVtLocalizationCase,
  markVtLocalizationResponse,
} from './task5/vtLocalizationPractice';
import type {
  VtLocalizationMark,
  VtLocalizationResponse,
  VtLocalizationTaskId,
} from './task5/vtLocalizationPractice';
import './task5/vtLocalizationPractice.css';

const taskLabels = Object.freeze([
  Object.freeze({ id: '1', label: 'Task 1 · Basic EP study' }),
  Object.freeze({ id: '2', label: 'Task 2 · Sinus node, refractoriness & AV block' }),
  Object.freeze({ id: '3', label: 'Task 3 · Tachycardia & AH change' }),
  Object.freeze({ id: '4', label: 'Task 4 · Intracardiac manoeuvres' }),
  Object.freeze({ id: '5', label: 'Task 5 · VT & para-Hisian pacing' }),
  Object.freeze({ id: '6', label: 'Task 6 · VT/PVC localisation 1' }),
  Object.freeze({ id: '7', label: 'Task 7 · VT/PVC localisation 2' }),
  Object.freeze({ id: '8', label: 'Task 8 · VT/PVC localisation 3' }),
] as const);

function responseComplete(response: VtLocalizationResponse): boolean {
  return response.morphology !== ''
    && response.verticalOrigin !== ''
    && response.septalLateral !== ''
    && response.outflowClassification !== '';
}

function fieldStatus(mark: VtLocalizationMark | null, correct: boolean): string | undefined {
  if (mark === null) return undefined;
  return correct ? 'correct' : 'incorrect';
}

function routeHref(
  task: string,
  instructor: boolean,
  assessmentMode: SharedAssessmentMode,
): string {
  const params = new URLSearchParams();
  params.set('mode', 'assessment');
  params.set('task', task);
  if (instructor && assessmentMode === 'practice') params.set('view', 'instructor');
  if (assessmentMode !== 'practice') params.set('assessmentMode', assessmentMode);
  return appHref(params.toString());
}

export function VtLocalizationTaskAssessment({
  taskId,
  assessmentMode,
  instructor,
}: {
  readonly taskId: VtLocalizationTaskId;
  readonly assessmentMode: SharedAssessmentMode;
  readonly instructor: boolean;
}) {
  const item = findVtLocalizationCase(taskId);
  const [response, setResponse] = useState<VtLocalizationResponse>(() => (
    loadAssessmentDraft(assessmentMode, taskId, { ...EMPTY_VT_LOCALIZATION_RESPONSE })
  ));
  const [result, setResult] = useState<VtLocalizationMark | null>(() => (
    loadAssessmentResult<VtLocalizationMark>(assessmentMode, taskId)
  ));
  const [status, setStatus] = useState('');

  useEffect(() => {
    saveAssessmentDraft(assessmentMode, taskId, response);
  }, [assessmentMode, response, taskId]);

  useEffect(() => {
    saveAssessmentResult(assessmentMode, taskId, result);
  }, [assessmentMode, result, taskId]);

  const reset = (): void => {
    clearAssessmentWorkingState(assessmentMode, taskId);
    setResponse({ ...EMPTY_VT_LOCALIZATION_RESPONSE });
    setResult(null);
    setStatus('');
  };

  const grade = (allowIncomplete: boolean): void => {
    if (!allowIncomplete && !responseComplete(response)) {
      setStatus('Answer all four localisation questions before submitting.');
      return;
    }
    const nextResult = markVtLocalizationResponse(response, item.answer);
    setResult(nextResult);
    setStatus(`Task ${taskId} scored ${nextResult.score}/4.`);
  };

  const session = useAssessmentSessionController({
    mode: assessmentMode,
    task: taskId,
    onStart: reset,
    onSubmit: (reason) => grade(assessmentMode !== 'practice' || reason === 'timeout'),
  });

  const update = <K extends keyof VtLocalizationResponse>(
    key: K,
    value: VtLocalizationResponse[K],
  ): void => {
    setResponse((current) => ({ ...current, [key]: value }));
    if (assessmentMode === 'practice') setResult(null);
    setStatus('');
  };

  const showWorkedAnswer = instructor || (assessmentMode === 'practice' && result !== null);

  return (
    <AssessmentSessionBoundary controller={session}>
      <main className="assessment-shell vt-localization-task-shell">
        <ClientModuleNav current="assessment" />

        <header className="assessment-header">
          <div>
            <p className="assessment-eyebrow">EP HEART · TASK {taskId} · 4 MARKS</p>
            <h1>{item.title}</h1>
            <p>Localise the ventricular ectopic/tachycardia origin using the four Class 6 ECG decisions.</p>
          </div>
          <a className="return-link" href={appHref()}>All modules</a>
        </header>

        <div className="assessment-view-switch" aria-label={`Task ${taskId} preview view`}>
          {assessmentMode !== 'practice' ? (
            <span className="active" aria-current="page">Student preview</span>
          ) : instructor ? (
            <>
              <a href={routeHref(taskId, false, assessmentMode)}>Student preview</a>
              <span className="active" aria-current="page">Instructor preview</span>
            </>
          ) : (
            <>
              <span className="active" aria-current="page">Student preview</span>
              <a href={routeHref(taskId, true, assessmentMode)}>Instructor preview</a>
            </>
          )}
        </div>

        <nav className="assessment-task-nav" aria-label="Assessment sections">
          <a href={appHref('mode=assessment')}>Interval trainer</a>
          {taskLabels.map((task) => (
            <a
              key={task.id}
              className={task.id === taskId ? 'active' : undefined}
              href={routeHref(task.id, instructor, assessmentMode)}
            >
              {task.label}
            </a>
          ))}
        </nav>

        <div className="prototype-warning">
          This task follows the supplied Class 6 teaching framework. It is an educational ECG-localisation exercise, not a complete clinical VT/PVC diagnostic algorithm.
        </div>

        {result !== null && (
          <section className="task-five-scorebar" aria-label={`Task ${taskId} score`} aria-live="polite">
            <strong>{result.score}/4</strong>
            <span>Morphology {result.fields.morphology ? '1/1' : '0/1'}</span>
            <span>Superior/inferior {result.fields.verticalOrigin ? '1/1' : '0/1'}</span>
            <span>Septal/lateral {result.fields.septalLateral ? '1/1' : '0/1'}</span>
            <span>RVOT/LVOT/other {result.fields.outflowClassification ? '1/1' : '0/1'}</span>
          </section>
        )}

        <section className="assessment-panel vt-localization-card">
          <div className="assessment-panel-heading">
            <div>
              <span>CLASS 6 · PAGE {item.slidePage} · 4 MARKS</span>
              <h2>Localise the ECG</h2>
            </div>
          </div>

          <VtLocalizationLiveTrace taskId={taskId} instructor={instructor} />

          <div className="vt-localization-fields">
            <label data-status={fieldStatus(result, result?.fields.morphology ?? false)}>
              1. RBBB or LBBB morphology · 1 mark
              <select
                disabled={session.answerDisabled}
                value={response.morphology}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                  update('morphology', event.target.value as VtLocalizationResponse['morphology'])
                )}
              >
                <option value="">Choose…</option>
                <option value="RBBB">RBBB</option>
                <option value="LBBB">LBBB</option>
              </select>
            </label>

            <label data-status={fieldStatus(result, result?.fields.verticalOrigin ?? false)}>
              2. Superior or inferior origin · 1 mark
              <select
                disabled={session.answerDisabled}
                value={response.verticalOrigin}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                  update('verticalOrigin', event.target.value as VtLocalizationResponse['verticalOrigin'])
                )}
              >
                <option value="">Choose…</option>
                <option value="Superior">Superior</option>
                <option value="Inferior">Inferior</option>
              </select>
            </label>

            <label data-status={fieldStatus(result, result?.fields.septalLateral ?? false)}>
              3. Septal or lateral · 1 mark
              <select
                disabled={session.answerDisabled}
                value={response.septalLateral}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                  update('septalLateral', event.target.value as VtLocalizationResponse['septalLateral'])
                )}
              >
                <option value="">Choose…</option>
                <option value="Septal">Septal</option>
                <option value="Lateral">Lateral</option>
              </select>
            </label>

            <label data-status={fieldStatus(result, result?.fields.outflowClassification ?? false)}>
              4. RVOT, LVOT or other · 1 mark
              <select
                disabled={session.answerDisabled}
                value={response.outflowClassification}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => (
                  update('outflowClassification', event.target.value as VtLocalizationResponse['outflowClassification'])
                )}
              >
                <option value="">Choose…</option>
                <option value="RVOT">RVOT</option>
                <option value="LVOT">LVOT</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          <div className="vt-localization-footer">
            <button
              className="assessment-primary"
              type="button"
              disabled={session.answerDisabled || (assessmentMode === 'practice' && !responseComplete(response))}
              onClick={() => session.submit(Date.now())}
            >
              {assessmentMode === 'practice' ? `Mark Task ${taskId}` : `Submit Task ${taskId}`}
            </button>
            <button type="button" disabled={session.answerDisabled} onClick={reset}>Reset answers</button>
            {status && <span className="copy-status">{status}</span>}
          </div>

          {showWorkedAnswer && (
            <div className="vt-localization-answer" aria-live="polite">
              <strong>{item.finalInterpretation}</strong>
              {item.rationale.map((reason) => <p key={reason}>{reason}</p>)}
              {instructor && <small>{item.sourceBoundary}</small>}
            </div>
          )}
        </section>
      </main>
    </AssessmentSessionBoundary>
  );
}
