import App from './App';
import { AssessmentApp } from './assessment/AssessmentApp';
import { ClientPreviewHome } from './clientPreview/ClientPreviewHome';
import { resolveClientPreviewRoute } from './clientPreview/routes';

export function RootApplication() {
  const route = resolveClientPreviewRoute(window.location);

  if (route === 'simulator') return <App />;
  if (route === 'assessment') return <AssessmentApp />;
  return <ClientPreviewHome />;
}
