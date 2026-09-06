import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ClientPreviewRoute } from './routes';
import { appHref } from '../appHref';
import './clientPreview.css';
import './assessmentTaskNav.css';

interface ClientModuleNavProps {
  readonly current: ClientPreviewRoute;
}

type AssessmentNavTask = 'interval' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

const navigationItems: ReadonlyArray<{
  readonly id: ClientPreviewRoute;
  readonly label: string;
  readonly search: string;
}> = Object.freeze([
  Object.freeze({ id: 'home', label: 'Overview', search: '' }),
  Object.freeze({ id: 'assessment', label: 'Assessments', search: 'mode=assessment' }),
]);

const assessmentTasks: ReadonlyArray<{
  readonly id: AssessmentNavTask;
  readonly label: string;
  readonly title: string;
}> = Object.freeze([
  Object.freeze({ id: 'interval', label: 'Interval trainer', title: 'Interval trainer' }),
  Object.freeze({ id: '1', label: 'Task 1', title: 'Task 1 · Basic EP study' }),
  Object.freeze({ id: '2', label: 'Task 2', title: 'Task 2 · Sinus node, refractoriness & AV block' }),
  Object.freeze({ id: '3', label: 'Task 3', title: 'Task 3 · Tachycardia & AH change' }),
  Object.freeze({ id: '4', label: 'Task 4', title: 'Task 4 · Intracardiac manoeuvres' }),
  Object.freeze({ id: '5', label: 'Task 5', title: 'Task 5 · VT & para-Hisian pacing' }),
  Object.freeze({ id: '6', label: 'Task 6', title: 'Task 6 · VT/PVC localisation 1' }),
  Object.freeze({ id: '7', label: 'Task 7', title: 'Task 7 · VT/PVC localisation 2' }),
  Object.freeze({ id: '8', label: 'Task 8', title: 'Task 8 · VT/PVC localisation 3' }),
]);

function currentAssessmentTask(): AssessmentNavTask {
  if (typeof window === 'undefined') return 'interval';
  const task = new URLSearchParams(window.location.search).get('task');
  if (
    task === '1'
    || task === '2'
    || task === '3'
    || task === '4'
    || task === '5'
    || task === '6'
    || task === '7'
    || task === '8'
  ) return task;
  return 'interval';
}

function assessmentTaskHref(task: AssessmentNavTask): string {
  if (typeof window === 'undefined') {
    return appHref(task === 'interval' ? 'mode=assessment' : `mode=assessment&task=${task}`);
  }
  const current = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  params.set('mode', 'assessment');
  if (task !== 'interval') params.set('task', task);

  const assessmentMode = current.get('assessmentMode');
  if (assessmentMode === 'mock' || assessmentMode === 'exam') {
    params.set('assessmentMode', assessmentMode);
  } else if (current.get('view') === 'instructor') {
    params.set('view', 'instructor');
  }
  return appHref(params.toString());
}

export function ClientModuleNav({ current }: ClientModuleNavProps) {
  const [speed, setSpeed] = useState(0.5);
  const selectedAssessmentTask = current === 'assessment' ? currentAssessmentTask() : 'interval';

  function updateSpeed(event: ChangeEvent<HTMLInputElement>): void {
    const next = Number(event.target.value);
    setSpeed(next);
    window.dispatchEvent(new CustomEvent('ep-heart-playback-rate', { detail: next }));
  }

  return (
    <nav
      className={`client-module-nav${current === 'assessment' ? ' client-module-nav-assessment' : ''}`}
      aria-label="EP Heart modules"
    >
      <div className="client-module-primary-row">
        <a className="client-preview-brand" href={appHref()} aria-label="EP Heart home">
          <span aria-hidden="true">EP</span>
          <strong>EP Heart</strong>
        </a>
        <div className="client-module-links">
          {navigationItems.map((item) => (
            <a
              key={item.id}
              className={item.id === current ? 'active' : undefined}
              href={appHref(item.search)}
              aria-current={item.id === current ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
        <label className="global-egm-speed">
          <span>Trace speed {speed.toFixed(2)}×</span>
          <input
            type="range"
            min="0.25"
            max="1.5"
            step="0.05"
            value={speed}
            onChange={updateSpeed}
            aria-label="Global ECG and EGM playback speed"
          />
        </label>
      </div>

      {current === 'assessment' && (
        <div className="client-assessment-task-nav" aria-label="Assessment tasks">
          {assessmentTasks.map((task) => (
            <a
              key={task.id}
              className={selectedAssessmentTask === task.id ? 'active' : undefined}
              href={assessmentTaskHref(task.id)}
              aria-current={selectedAssessmentTask === task.id ? 'page' : undefined}
              title={task.title}
            >
              {task.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
