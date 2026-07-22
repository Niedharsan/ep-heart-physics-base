import { buildTraceRenderModel } from './traceRendererModel';
import type { TaskTwoTraceDefinition } from './traceCatalog';

export interface TraceStripProps {
  readonly definition: TaskTwoTraceDefinition;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

export function TraceStrip({ definition }: TraceStripProps) {
  const model = buildTraceRenderModel(definition);
  const prefix = `task-two-trace-${safeId(definition.id)}`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;

  return (
    <figure className="task-two-trace">
      <svg
        className="task-two-strip"
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{definition.title}</title>
        <desc id={descriptionId}>{definition.description}</desc>
        <g className="task-two-grid-lines" aria-hidden="true">
          {Array.from({ length: 17 }, (_, index) => (
            <line key={`v-${index}`} x1={44 + index * 41} y1="18" x2={44 + index * 41} y2={model.height - 14} />
          ))}
          {model.channels.map((renderedChannel) => (
            <line key={`h-${renderedChannel.id}`} x1="44" y1={renderedChannel.baseline} x2="700" y2={renderedChannel.baseline} />
          ))}
        </g>
        {model.channels.map((renderedChannel) => (
          <g key={renderedChannel.id} className="task-two-trace-channel">
            <text x="10" y={renderedChannel.baseline + 4}>{renderedChannel.label}</text>
            <path d={renderedChannel.baselinePath} className="task-two-trace-baseline" />
            {renderedChannel.events.map((renderedEvent) => (
              <path key={renderedEvent.id} d={renderedEvent.path} className={`task-two-event task-two-event-${renderedEvent.kind}`} />
            ))}
          </g>
        ))}
        {model.annotations.map((renderedAnnotation) => (
          <g key={renderedAnnotation.id} className={`task-two-annotation task-two-annotation-${renderedAnnotation.kind}`}>
            {renderedAnnotation.kind === 'interval' && renderedAnnotation.endX !== undefined ? (
              <>
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y} x2={renderedAnnotation.endX} y2={renderedAnnotation.y} />
                <line x1={renderedAnnotation.x} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.x} y2={renderedAnnotation.y + 5} />
                <line x1={renderedAnnotation.endX} y1={renderedAnnotation.y - 5} x2={renderedAnnotation.endX} y2={renderedAnnotation.y + 5} />
                <text x={(renderedAnnotation.x + renderedAnnotation.endX) / 2} y={renderedAnnotation.y - 6} textAnchor="middle">{renderedAnnotation.label}</text>
              </>
            ) : (
              <>
                {renderedAnnotation.kind === 'blocked' && (
                  <line x1={renderedAnnotation.x} y1={renderedAnnotation.y - 4} x2={renderedAnnotation.x} y2={renderedAnnotation.y + 33} />
                )}
                <text x={renderedAnnotation.x + 5} y={renderedAnnotation.y}>{renderedAnnotation.label}</text>
              </>
            )}
          </g>
        ))}
      </svg>
      <figcaption>{definition.teachingLabel}</figcaption>
    </figure>
  );
}
