import { RunningEgmStrip } from '../traces/RunningEgmStrip';
import { adaptLegacyTrace } from '../traces/clinicalTrace';
import type { TaskTwoTraceDefinition } from './traceCatalog';

export interface TraceStripProps {
  readonly definition: TaskTwoTraceDefinition;
  readonly showAnnotations?: boolean;
}

export function TraceStrip({ definition, showAnnotations = false }: TraceStripProps) {
  return (
    <div className="task-two-trace" data-task-two-trace={definition.id}>
      <RunningEgmStrip
        definition={adaptLegacyTrace(definition, { mode: 'mixed', durationMs: 4200 })}
        annotationView={showAnnotations ? 'instructor' : 'none'}
        autoPlay
        compact
        svgClassName="task-two-strip"
      />
    </div>
  );
}
