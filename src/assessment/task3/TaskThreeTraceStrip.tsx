import { RunningEgmStrip } from '../traces/RunningEgmStrip';
import { adaptLegacyTrace } from '../traces/clinicalTrace';
import type { TaskThreeTraceView } from './traceRendererModel';
import type { TaskThreeTraceDefinition } from './traceCatalog';

export interface TaskThreeTraceStripProps {
  readonly definition: TaskThreeTraceDefinition;
  readonly view: TaskThreeTraceView;
  readonly studentTitle: string;
  readonly studentDescription: string;
}

export function TaskThreeTraceStrip({
  definition,
  view,
  studentTitle,
  studentDescription,
}: TaskThreeTraceStripProps) {
  const instructor = view === 'instructor';
  return (
    <div className="task-three-trace" data-task-three-trace={definition.id}>
      <RunningEgmStrip
        definition={adaptLegacyTrace(definition, {
          title: instructor ? definition.title : studentTitle,
          description: instructor ? definition.description : studentDescription,
          mode: definition.mode === 'surface-ecg' ? 'surface' : 'intracardiac',
        })}
        annotationView={instructor ? 'instructor' : 'student'}
        autoPlay
        compact
        svgClassName="task-three-strip"
      />
    </div>
  );
}
