import App from './App';
import { AssessmentApp } from './assessment/AssessmentApp';

export function RootApplication() {
  const searchParameters = new URLSearchParams(window.location.search);
  const assessmentRequested = (
    window.location.pathname.replace(/\/$/, '').endsWith('/assessment')
    || searchParameters.get('mode') === 'assessment'
  );

  return assessmentRequested ? <AssessmentApp /> : <App />;
}
