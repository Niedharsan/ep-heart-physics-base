import type { ClientPreviewRoute } from './routes';
import './clientPreview.css';

interface ClientModuleNavProps {
  readonly current: ClientPreviewRoute;
}

const navigationItems: ReadonlyArray<{
  readonly id: ClientPreviewRoute;
  readonly label: string;
  readonly href: string;
}> = Object.freeze([
  Object.freeze({ id: 'home', label: 'Overview', href: '/' }),
  Object.freeze({ id: 'simulator', label: 'Simulator', href: '/?mode=simulator' }),
  Object.freeze({ id: 'assessment', label: 'Assessments', href: '/?mode=assessment' }),
]);

export function ClientModuleNav({ current }: ClientModuleNavProps) {
  return (
    <nav className="client-module-nav" aria-label="EP Heart modules">
      <a className="client-preview-brand" href="/" aria-label="EP Heart home">
        <span aria-hidden="true">EP</span>
        <strong>EP Heart</strong>
      </a>
      <div className="client-module-links">
        {navigationItems.map((item) => (
          <a
            key={item.id}
            className={item.id === current ? 'active' : undefined}
            href={item.href}
            aria-current={item.id === current ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
