import { useEffect, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  ClinicalTraceAnnotation,
  ClinicalTraceDefinition,
} from './clinicalTrace';
import { buildClinicalTracePath } from './clinicalSignalModel';
import './runningEgmStrip.css';

export interface RunningEgmStripProps {
  readonly definition: ClinicalTraceDefinition;
  readonly showAnnotations?: boolean;
  readonly annotationView?: 'none' | 'student' | 'instructor';
  readonly autoPlay?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
  readonly svgClassName?: string;
  readonly allowExpand?: boolean;
}

interface RenderedChannel {
  readonly id: string;
  readonly label: string;
  readonly signalClass: string;
  readonly baselineY: number;
  readonly path: string;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

export function RunningEgmStrip({
  definition,
  showAnnotations = false,
  annotationView = 'none',
  autoPlay = true,
  compact = false,
  className = '',
  svgClassName = '',
  allowExpand = true,
}: RunningEgmStripProps) {
  const [running, setRunning] = useState(autoPlay);
  const [replayKey, setReplayKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [measuring, setMeasuring] = useState(false);
  const [calipers, setCalipers] = useState([0.2, 0.6]);
  const reactId = safeId(useId());
  const prefix = `running-egm-${safeId(definition.id)}-${reactId}`;
  const smallGridId = `${prefix}-small-grid`;
  const largeGridId = `${prefix}-large-grid`;
  const clipId = `${prefix}-clip`;
  const titleId = `${prefix}-title`;
  const descriptionId = `${prefix}-description`;

  const labelWidth = compact ? 68 : 76;
  const plotWidth = compact ? 824 : 884;
  const rowHeight = compact ? 48 : 56;
  const topPadding = compact ? 22 : 26;
  const bottomPadding = 34;
  const height = topPadding + definition.channels.length * rowHeight + bottomPadding;

  const visibleAnnotations = useMemo(() => {
    const resolvedView = showAnnotations ? 'instructor' : annotationView;
    if (resolvedView === 'none') return [];
    if (resolvedView === 'instructor') return definition.annotations;
    return definition.annotations.filter((annotation) => annotation.visibility === 'student');
  }, [annotationView, definition.annotations, showAnnotations]);

  const renderedChannels = useMemo<readonly RenderedChannel[]>(() => (
    definition.channels.map((channel, index) => {
      const baselineY = topPadding + index * rowHeight + rowHeight / 2;
      return Object.freeze({
        id: channel.id,
        label: channel.label,
        signalClass: channel.signalClass,
        baselineY,
        path: buildClinicalTracePath(definition, channel, baselineY, plotWidth),
      });
    })
  ), [definition, plotWidth, rowHeight, topPadding]);

  const scrollStyle = {
    '--running-egm-shift': `-${plotWidth}px`,
    animationDuration: `${definition.durationMs / playbackRate}ms`,
    animationPlayState: running ? 'running' : 'paused',
  } as CSSProperties;

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  useEffect(() => {
    const syncRate = (event: Event): void => {
      const rate = (event as CustomEvent<number>).detail;
      if (Number.isFinite(rate)) setPlaybackRate(rate);
    };
    window.addEventListener('ep-heart-playback-rate', syncRate);
    return () => window.removeEventListener('ep-heart-playback-rate', syncRate);
  }, []);

  function annotationY(annotation: ClinicalTraceAnnotation): number {
    const channelIndex = Math.max(
      0,
      definition.channels.findIndex((channel) => channel.id === annotation.channelId),
    );
    return topPadding + channelIndex * rowHeight + 9;
  }

  function renderAnnotations(offsetX: number) {
    return visibleAnnotations.map((annotation, index) => {
      const x = offsetX + (annotation.timeMs / definition.durationMs) * plotWidth;
      const endX = annotation.endTimeMs === undefined
        ? undefined
        : offsetX + (annotation.endTimeMs / definition.durationMs) * plotWidth;
      const y = annotationY(annotation);
      return (
        <g key={`${annotation.id}-${offsetX}`} className="running-egm-annotation">
          {endX === undefined ? (
            <>
              <line x1={x} y1={y + 4} x2={x} y2={y + rowHeight - 14} />
              <text x={x + 5} y={y}>{index + 1}</text>
            </>
          ) : (
            <>
              <line x1={x} y1={y + 10} x2={endX} y2={y + 10} />
              <line x1={x} y1={y + 4} x2={x} y2={y + 16} />
              <line x1={endX} y1={y + 4} x2={endX} y2={y + 16} />
              <text x={(x + endX) / 2} y={y + 2} textAnchor="middle">{index + 1}</text>
            </>
          )}
        </g>
      );
    });
  }

  return (
    <figure className={`running-egm-strip ${compact ? 'running-egm-strip-compact' : ''} ${className}`.trim()} data-running-egm={definition.id}>
      <div className="running-egm-toolbar">
        <div className="running-egm-status">
          <span className={`running-egm-live-dot ${running ? 'active' : ''}`} aria-hidden="true" />
          <strong>{running ? 'LIVE RECORDING' : 'FROZEN'}</strong>
          <span>25 mm/s</span>
          <span>10 mm/mV</span>
        </div>
        <div className="running-egm-actions">
          <button type="button" aria-pressed={measuring} onClick={() => {
            setMeasuring(!measuring);
            setRunning(false);
          }}>{measuring ? 'Hide calipers' : 'Measure'}</button>
          <label className="running-egm-speed" title="Slow down or speed up the tracing">
            <span>Speed {playbackRate.toFixed(2)}×</span>
            <input
              type="range"
              min="0.25"
              max="1.5"
              step="0.05"
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
              aria-label="EGM playback speed"
            />
          </label>
          {allowExpand && (
            <button type="button" onClick={() => setExpanded(true)} aria-label={`Enlarge ${definition.title}`}>
              Enlarge tracing
            </button>
          )}
          <button type="button" onClick={() => { setMeasuring(false); setRunning((current) => !current); }}>
            {running ? 'Freeze' : 'Run'}
          </button>
          <button
            type="button"
            onClick={() => {
              setReplayKey((current) => current + 1);
              setMeasuring(false);
              setRunning(true);
            }}
          >
            Replay
          </button>
        </div>
      </div>

      <div className="running-egm-measurement-area">
      <svg
        className={`running-egm-svg ${svgClassName}`.trim()}
        viewBox={`0 0 ${labelWidth + plotWidth} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{definition.title}</title>
        <desc id={descriptionId}>{definition.description}</desc>
        <defs>
          <pattern id={smallGridId} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="running-egm-grid-small" />
          </pattern>
          <pattern id={largeGridId} width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill={`url(#${smallGridId})`} />
            <path d="M 50 0 L 0 0 0 50" className="running-egm-grid-large" />
          </pattern>
          <clipPath id={clipId}>
            <rect x={labelWidth} y="0" width={plotWidth} height={height} />
          </clipPath>
        </defs>

        <rect width={labelWidth + plotWidth} height={height} className="running-egm-background" />
        <rect x={labelWidth} width={plotWidth} height={height} fill={`url(#${largeGridId})`} />
        <rect width={labelWidth} height={height} className="running-egm-label-rail" />

        {renderedChannels.map((channel) => (
          <g key={`label-${channel.id}`}>
            <line
              x1={labelWidth}
              y1={channel.baselineY + rowHeight / 2}
              x2={labelWidth + plotWidth}
              y2={channel.baselineY + rowHeight / 2}
              className="running-egm-channel-separator"
            />
            <text
              x={labelWidth - 10}
              y={channel.baselineY + 4}
              textAnchor="end"
              className={`running-egm-channel-label signal-${channel.signalClass}`}
            >
              {channel.label}
            </text>
          </g>
        ))}

        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(${labelWidth} 0)`}>
            <g
              key={replayKey}
              className="running-egm-scroll"
              style={scrollStyle}
            >
              {[0, plotWidth].map((offsetX) => (
                <g key={offsetX} transform={`translate(${offsetX} 0)`}>
                  {renderedChannels.map((channel) => (
                    <path
                      key={`${channel.id}-${offsetX}`}
                      d={channel.path}
                      className={`running-egm-wave signal-${channel.signalClass}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ))}
              {renderAnnotations(0)}
              {renderAnnotations(plotWidth)}
            </g>
          </g>
        </g>

        <line
          x1={labelWidth + plotWidth - 2}
          y1="0"
          x2={labelWidth + plotWidth - 2}
          y2={height - bottomPadding + 8}
          className={`running-egm-scan-line ${running ? 'active' : ''}`}
        />

        <g className="running-egm-calibration" aria-hidden="true">
          <path
            d={`M ${labelWidth + 14} ${height - 10} v -12 h 16 v 12 h 16`}
          />
          <text x={labelWidth + 58} y={height - 10}>1 mV</text>
          <text x={labelWidth + plotWidth - 8} y={height - 10} textAnchor="end">
            {Math.round(definition.durationMs / 100) / 10} s loop
          </text>
        </g>
      </svg>
      {measuring && <div className="running-egm-calipers" style={{ left: `${100 * labelWidth / (labelWidth + plotWidth)}%` }}>
        {calipers.map((position, index) => <button
          key={index}
          type="button"
          className={`running-egm-caliper caliper-${index}`}
          style={{ left: `${position * 100}%` }}
          aria-label={`${index === 0 ? 'Start' : 'End'} caliper`}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
            const next = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
            setCalipers((current) => current.map((value, i) => i === index ? next : value));
          }}
          onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const delta = (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 10 : 1) / definition.durationMs;
            setCalipers((current) => current.map((value, i) => i === index ? Math.max(0, Math.min(1, value + delta)) : value));
          }}
        ><span>{index === 0 ? 'Start' : 'End'}</span></button>)}
      </div>}
      </div>
      {measuring && <div className="running-egm-measurement-readout">
        <strong>{Math.round(Math.abs(calipers[1]! - calipers[0]!) * definition.durationMs)} ms</strong>
        <span>Drag the handles or use arrow keys. Shift + arrow moves 10 ms.</span>
      </div>}

      <figcaption>
        {definition.teachingLabel}
        {visibleAnnotations.length > 0 ? ' Teaching overlays visible.' : ''}
      </figcaption>
      {visibleAnnotations.length > 0 && <ol className="running-egm-answer-notes" aria-label="Tracing explanations">
        {visibleAnnotations.map((annotation) => <li key={annotation.id}>{annotation.label}</li>)}
      </ol>}

      {expanded && (
        <div
          className="running-egm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged tracing: ${definition.title}`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
        >
          <div className="running-egm-modal-panel">
            <div className="running-egm-modal-heading">
              <div>
                <span>ENLARGED ECG / EGM</span>
                <h2>{definition.title}</h2>
              </div>
              <button type="button" onClick={() => setExpanded(false)} autoFocus>
                Close
              </button>
            </div>
            <RunningEgmStrip
              definition={definition}
              showAnnotations={showAnnotations}
              annotationView={annotationView}
              autoPlay={running}
              compact={false}
              className="running-egm-expanded-strip"
              allowExpand={false}
            />
          </div>
        </div>
      )}
    </figure>
  );
}
