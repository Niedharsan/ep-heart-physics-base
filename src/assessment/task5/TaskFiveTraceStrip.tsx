import { RunningEgmStrip } from '../traces/RunningEgmStrip';
import { adaptLegacyTrace } from '../traces/clinicalTrace';
import type { TaskFiveTraceView } from './traceRendererModel';
import type { TaskFiveTraceDefinition } from './traceCatalog';

export interface TaskFiveTraceStripProps {
  readonly definition: TaskFiveTraceDefinition;
  readonly view: TaskFiveTraceView;
  readonly studentTitle: string;
  readonly studentDescription: string;
}

export function TaskFiveTraceStrip({
  definition,
  view,
  studentTitle,
  studentDescription,
}: TaskFiveTraceStripProps) {
  const instructor = view === 'instructor';
  return (
    <div className="task-five-trace" data-task-five-trace={definition.id}>
      <RunningEgmStrip
        definition={adaptLegacyTrace(definition, {
          title: instructor ? definition.title : studentTitle,
          description: instructor ? definition.description : studentDescription,
          mode: 'mixed',
          durationMs: 4400,
        })}
        annotationView={instructor ? 'instructor' : 'student'}
        autoPlay
        compact
        svgClassName="task-five-strip"
      />
    </div>
  );
}
