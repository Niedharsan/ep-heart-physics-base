import { ClientModuleNav } from './ClientModuleNav';
import { appHref } from '../appHref';
import { clientModules } from './routes';

const moduleLabels = Object.freeze({
  assessment: {
    action: 'Open assessments',
    eyebrow: 'PRACTISE',
  },
} as const);

export function ClientPreviewHome() {
  return (
    <main className="client-preview-shell">
      <ClientModuleNav current="home" />

      <section className="client-preview-hero">
        <div>
          <p className="client-preview-eyebrow">CARDIAC ELECTROPHYSIOLOGY LEARNING</p>
          <h1>Learn EP through measurement and interpretation</h1>
          <p className="client-preview-lead">
            Measure intracardiac intervals and work through structured electrophysiology assessments.
          </p>
          <div className="client-preview-actions">
            <a className="client-module-open primary" href={appHref('mode=assessment')}>Open assessments</a>
          </div>
        </div>
        <div className="client-preview-hero-mark" aria-hidden="true">
          <span>EP</span>
        </div>
      </section>

      <section className="client-module-grid" aria-label="Available modules">
        {clientModules.map((module) => {
          const labels = moduleLabels[module.id];
          return (
            <article className="client-module-card" key={module.id}>
              <div className="client-module-card-heading">
                <span>{labels.eyebrow}</span>
                <h2>{module.title}</h2>
              </div>
              <p>{module.summary}</p>
              <ul>
                {module.capabilities.slice(0, 3).map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
              <a className="client-module-open" href={module.href}>{labels.action}</a>
            </article>
          );
        })}
      </section>

      <footer className="client-preview-footer">
        Educational and research prototype. Not for patient care or diagnosis.
      </footer>
    </main>
  );
}
