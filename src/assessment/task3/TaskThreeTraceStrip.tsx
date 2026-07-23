import { buildTaskThreeTraceRenderModel } from './traceRendererModel';
import type { TaskThreeTraceView } from './traceRendererModel';
import type { TaskThreeTraceDefinition } from './traceCatalog';

export interface TaskThreeTraceStripProps {
  readonly definition: TaskThreeTraceDefinition;
  readonly view: TaskThreeTraceView;
  readonly studentTitle: string;
  readonly studentDescription: string;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

export function TaskThreeTraceStrip({
  definition,
  view,
  studentTitle,
  studentDescription,
}: TaskThreeTraceStripProps) {
  const model = buildTaskThreeTraceRenderModel(definition, view);
  const prefix = `task-three-trace-${safeId(definition.id)}-${view}`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;
  const accessibleTitle = view === 'instructor' ? definition.title : studentTitle;
  const accessibleDescription = view === 'instructor' ? definition.description : studentDescription;

  return (
    <figure className="task-three-trace" data-task-three-trace={definition.id}>
      <svg
        className="task-three-strip"
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{accessibleTitle}</title>
        <desc id={descriptionId}>{accessibleDescription}</desc>
        <g className="task-three-grid-lines" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <line
              key={`v-${index}`}
              x1={44 + index * 41}
              y1="18"
              x2={44 + index * 41}
              y2={model.height - 14}
            />
          ))}
          {model.channels.map((renderedChannel) => (
            <line
              key={`h-${renderedChannel.id}`}
              x1="44"
              y1={renderedChannel.baseline}
              x2="740"
              y2={renderedChannel.baseline}
            />
          ))}
        </g>
        {model.channels.map((renderedChannel) => (
          <g key={renderedChannel.id} className="task-three-trace-channel">
            <text x="10" y={renderedChannel.baseline + 4}>{renderedChannel.label}</text>
            <path d={renderedChannel.baselinePath} className="task-three-trace-baseline" />
            {renderedChannel.events.map((renderedEvent) => (
              <path
                key={renderedEvent.id}
                d={renderedEvent.path}
                className={`task-three-event task-three-event-${renderedEvent.kind}`}
              />
            ))}
          </g>
        ))}
        {model.annotations.map((renderedAnnotation) => (
          <g key={renderedAnnotation.id} className="task-three-annotation">
            {renderedAnnotation.endX !== undefined ? (
              <>
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y} x2={renderedAnnotation.endX} y2={renderedAnnotation.y} />
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.x} y2={renderedAnnotation.y + 5} />
                <line x1={renderedAnnotation.endX} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.endX} y2={renderedAnnotation.y + 5} />
                <text x={(renderedAnnotation.x + renderedAnnotation.endX) / 2} y={renderedAnnotation.y - 6} textAnchor="middle">
                  {renderedAnnotation.label}
                </text>
              </>
            ) : (
              <text x={renderedAnnotation.x + 5} y={renderedAnnotation.y}>{renderedAnnotation.label}</text>
            )}
          </g>
        ))}
      </svg>
      <figcaption>{definition.teachingLabel}</figcaption>
    </figure>
  );
}
