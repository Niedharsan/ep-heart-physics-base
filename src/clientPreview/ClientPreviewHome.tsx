import { ClientModuleNav } from './ClientModuleNav';
import { clientModules, plannedClientCapabilities } from './routes';

export function ClientPreviewHome() {
  return (
    <main className="client-preview-shell">
      <ClientModuleNav current="home" />

      <section className="client-preview-hero">
        <div>
          <p className="client-preview-eyebrow">EP HEART · CLIENT REVIEW WORKSPACE</p>
          <h1>One place to review every available module</h1>
          <p className="client-preview-lead">
            Open either working module below, test the interaction and return structured feedback
            from the assessment workspace. Features marked as planned are not presented as complete.
          </p>
        </div>
        <div className="client-preview-status" role="status">
          <span /> Login-free preview
        </div>
      </section>

      <div className="client-preview-warning">
        Development preview only. The simulator and synthetic EGM traces are educational/research
        prototypes and are not validated for patient care, diagnosis or device programming.
      </div>

      <section className="client-module-grid" aria-label="Available modules">
        {clientModules.map((module) => (
          <article className="client-module-card" key={module.id}>
            <div className="client-module-card-heading">
              <span>{module.status}</span>
              <h2>{module.title}</h2>
            </div>
            <p>{module.summary}</p>
            <ul>
              {module.capabilities.map((capability) => <li key={capability}>{capability}</li>)}
            </ul>
            <p className="client-module-limitation">{module.limitation}</p>
            <a className="client-module-open" href={module.href}>Open module</a>
          </article>
        ))}
      </section>

      <section className="client-preview-roadmap">
        <div>
          <p className="client-preview-eyebrow">NOT YET IMPLEMENTED</p>
          <h2>Planned assessment coverage</h2>
          <p>
            These items are shown so the client can distinguish delivered functionality from the
            remaining specification. They will be implemented and validated sequentially.
          </p>
        </div>
        <ul>
          {plannedClientCapabilities.map((capability) => <li key={capability}>{capability}</li>)}
        </ul>
      </section>

      <section className="client-preview-review-guide">
        <div>
          <p className="client-preview-eyebrow">HOW TO REVIEW</p>
          <h2>Test, record and return feedback</h2>
        </div>
        <ol>
          <li>Open a module and try the intended workflow.</li>
          <li>Record any incorrect labels, morphology, behaviour or missing feature.</li>
          <li>Use the assessment feedback panel to copy a structured feedback package.</li>
        </ol>
        <a href="/?mode=assessment&task=5#feedback">Open Task 5 feedback panel</a>
      </section>

      <footer className="client-preview-footer">
        <span>EP Heart Physics Base</span>
        <span>Homogeneous dimensionless 2D prototype · Login-free assessment preview</span>
      </footer>
    </main>
  );
}
