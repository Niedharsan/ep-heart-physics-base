import { buildTaskFiveTraceRenderModel } from './traceRendererModel';
import type { TaskFiveTraceView } from './traceRendererModel';
import type { TaskFiveTraceDefinition } from './traceCatalog';

export interface TaskFiveTraceStripProps {
  readonly definition: TaskFiveTraceDefinition;
  readonly view: TaskFiveTraceView;
  readonly studentTitle: string;
  readonly studentDescription: string;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

export function TaskFiveTraceStrip({
  definition,
  view,
  studentTitle,
  studentDescription,
}: TaskFiveTraceStripProps) {
  const model = buildTaskFiveTraceRenderModel(definition, view);
  const prefix = `task-five-trace-${safeId(definition.id)}`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;
  const title = view === 'instructor' ? definition.title : studentTitle;
  const description = view === 'instructor' ? definition.description : studentDescription;

  return (
    <figure className="task-five-trace" data-task-five-trace={definition.id}>
      <svg
        className="task-five-strip"
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <g className="task-five-grid-lines" aria-hidden="true">
          {Array.from({ length: 17 }, (_, index) => (
            <line key={`v-${index}`} x1={48 + index * 43.4} y1="18" x2={48 + index * 43.4} y2={model.height - 12} />
          ))}
          {model.channels.map((renderedChannel) => (
            <line key={`h-${renderedChannel.id}`} x1="48" y1={renderedChannel.baseline} x2="742" y2={renderedChannel.baseline} />
          ))}
        </g>
        {model.channels.map((renderedChannel) => (
          <g key={renderedChannel.id} className="task-five-trace-channel">
            <text x="8" y={renderedChannel.baseline + 4}>{renderedChannel.label}</text>
            <path d={renderedChannel.baselinePath} className="task-five-trace-baseline" />
            {renderedChannel.events.map((renderedEvent) => (
              <path key={renderedEvent.id} d={renderedEvent.path} className={`task-five-event task-five-event-${renderedEvent.className}`} />
            ))}
          </g>
        ))}
        {model.annotations.map((renderedAnnotation) => (
          <g key={renderedAnnotation.id} className="task-five-annotation">
            {renderedAnnotation.endX !== undefined ? (
              <>
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y} x2={renderedAnnotation.endX} y2={renderedAnnotation.y} />
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.x} y2={renderedAnnotation.y + 5} />
                <line x1={renderedAnnotation.endX} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.endX} y2={renderedAnnotation.y + 5} />
                <text x={(renderedAnnotation.x + renderedAnnotation.endX) / 2} y={renderedAnnotation.y - 6} textAnchor="middle">{renderedAnnotation.label}</text>
              </>
            ) : (
              <text x={renderedAnnotation.x + 4} y={renderedAnnotation.y}>{renderedAnnotation.label}</text>
            )}
          </g>
        ))}
      </svg>
      <figcaption>{definition.teachingLabel}</figcaption>
    </figure>
  );
}
