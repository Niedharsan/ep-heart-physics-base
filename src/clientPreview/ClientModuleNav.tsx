import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ClientPreviewRoute } from './routes';
import { appHref } from '../appHref';
import './clientPreview.css';

interface ClientModuleNavProps {
  readonly current: ClientPreviewRoute;
}

const navigationItems: ReadonlyArray<{
  readonly id: ClientPreviewRoute;
  readonly label: string;
  readonly search: string;
}> = Object.freeze([
  Object.freeze({ id: 'home', label: 'Overview', search: '' }),
  Object.freeze({ id: 'assessment', label: 'Assessments', search: 'mode=assessment' }),
]);

export function ClientModuleNav({ current }: ClientModuleNavProps) {
  const [speed, setSpeed] = useState(0.5);
  function updateSpeed(event: ChangeEvent<HTMLInputElement>): void {
    const next = Number(event.target.value);
    setSpeed(next);
    window.dispatchEvent(new CustomEvent('ep-heart-playback-rate', { detail: next }));
  }
  return (
    <nav className="client-module-nav" aria-label="EP Heart modules">
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
      <label className="global-egm-speed"><span>EGM speed {speed.toFixed(2)}×</span><input type="range" min="0.25" max="1.5" step="0.05" value={speed} onChange={updateSpeed} aria-label="Global EGM playback speed" /></label>
    </nav>
  );
}
