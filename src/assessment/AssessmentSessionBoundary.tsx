import type { ReactNode } from 'react';
import type { AssessmentSessionController } from './sessionController';
import { formatAssessmentRemainingTime } from './sessionController';

interface AssessmentSessionBoundaryProps {
  readonly controller: AssessmentSessionController;
  readonly children: ReactNode;
}

function modeTitle(controller: AssessmentSessionController): string {
  if (controller.mode === 'mock') return 'Timed mock assessment';
  if (controller.mode === 'exam') return 'Real exam';
  return 'Practice';
}

function statusCopy(controller: AssessmentSessionController): string {
  if (controller.status === 'not-started') return 'Press Start when ready. The 20-minute timer begins immediately.';
  if (controller.status === 'active') return 'Answers remain editable until submission or timeout.';
  if (controller.status === 'submitted') return 'Submitted. Answers are locked.';
  if (controller.status === 'expired') return 'Time expired. The available answers were marked automatically.';
  return 'Untimed, repeatable practice with immediate marking.';
}

export function AssessmentSessionPanel({
  controller,
}: {
  readonly controller: AssessmentSessionController;
}) {
  return (
    <section
      className="assessment-panel shared-assessment-session-panel"
      data-assessment-session-state={controller.status}
      aria-label="Assessment session"
    >
      <div>
        <span className="assessment-panel-kicker">MODE</span>
        <h2>{modeTitle(controller)}</h2>
        <p>{statusCopy(controller)}</p>
      </div>
      <div className={`shared-assessment-session-timer ${controller.remainingMs <= 120000 ? 'urgent' : ''}`}>
        <strong>
          {controller.timed
            ? formatAssessmentRemainingTime(controller.remainingMs)
            : 'Untimed'}
        </strong>
        {controller.status === 'not-started' && (
          <button className="assessment-primary" type="button" onClick={() => controller.start(Date.now())}>
            Start assessment
          </button>
        )}
        {controller.status === 'active' && <span>In progress</span>}
        {controller.status === 'submitted' && <span>Submitted</span>}
        {controller.status === 'expired' && <span>Time expired</span>}
      </div>
    </section>
  );
}

export function AssessmentSessionBoundary({
  controller,
  children,
}: AssessmentSessionBoundaryProps) {
  return (
    <>
      <AssessmentSessionPanel controller={controller} />
      <fieldset
        className="shared-assessment-session-content"
        disabled={controller.answerDisabled}
        aria-label="Assessment answers"
      >
        {children}
      </fieldset>
    </>
  );
}
