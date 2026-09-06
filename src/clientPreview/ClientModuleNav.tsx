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
    </nav>
  );
}
