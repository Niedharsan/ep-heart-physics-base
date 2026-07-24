import { RunningEgmStrip } from '../traces/RunningEgmStrip';
import { adaptLegacyTrace } from '../traces/clinicalTrace';
import type { TaskFourTraceView } from './traceRendererModel';
import type { TaskFourTraceDefinition } from './traceCatalog';

export interface TaskFourTraceStripProps {
  readonly definition: TaskFourTraceDefinition;
  readonly view: TaskFourTraceView;
  readonly studentTitle: string;
  readonly studentDescription: string;
}

export function TaskFourTraceStrip({
  definition,
  view,
  studentTitle,
  studentDescription,
}: TaskFourTraceStripProps) {
  const instructor = view === 'instructor';
  return (
    <div className="task-four-trace" data-task-four-trace={definition.id}>
      <RunningEgmStrip
        definition={adaptLegacyTrace(definition, {
          title: instructor ? definition.title : studentTitle,
          description: instructor ? definition.description : studentDescription,
          mode: 'mixed',
          durationMs: 4800,
        })}
        annotationView={instructor ? 'instructor' : 'student'}
        autoPlay
        compact
        svgClassName="task-four-strip"
      />
    </div>
  );
}
