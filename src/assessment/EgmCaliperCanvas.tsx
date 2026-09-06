import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  CaliperEndpoint,
  CaliperPlacement,
  EgmScenario,
} from './types';
import { waveformSampleIntervalMs } from './waveform';

interface EgmCaliperCanvasProps {
  readonly scenario: EgmScenario;
  readonly calipers: CaliperPlacement;
  readonly running: boolean;
  readonly playheadMs: number;
  readonly onCalipersChange: (placement: CaliperPlacement) => void;
  readonly allowExpand?: boolean;
}

type DragHandle = 'start' | 'end' | null;

const LEFT_MARGIN = 82;
const RIGHT_MARGIN = 22;
const TOP_MARGIN = 24;
const BOTTOM_MARGIN = 34;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function resizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const rectangle = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rectangle.width * ratio));
  const height = Math.max(1, Math.round(rectangle.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

function channelIndex(scenario: EgmScenario, channelId: string): number {
  const index = scenario.channels.findIndex((channel) => channel.id === channelId);
  return index >= 0 ? index : 0;
}

export function EgmCaliperCanvas({
  scenario,
  calipers,
  running,
  playheadMs,
  onCalipersChange,
  allowExpand = true,
}: EgmCaliperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [expanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    function draw(): void {
      const context = resizeCanvas(canvasElement);
      if (!context) return;
      const width = canvasElement.clientWidth;
      const height = canvasElement.clientHeight;
      const plotWidth = Math.max(1, width - LEFT_MARGIN - RIGHT_MARGIN);
      const plotHeight = Math.max(1, height - TOP_MARGIN - BOTTOM_MARGIN);
      const rowHeight = plotHeight / scenario.channels.length;
      const xForTime = (timeMs: number): number => (
        LEFT_MARGIN + (timeMs / scenario.durationMs) * plotWidth
      );
      const yForChannel = (channelId: string): number => (
        TOP_MARGIN + rowHeight * (channelIndex(scenario, channelId) + 0.5)
      );

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#061016';
      context.fillRect(0, 0, width, height);

      context.strokeStyle = 'rgba(159, 185, 194, 0.12)';
      context.lineWidth = 1;
      const majorGridMs = 200;
      for (let timeMs = 0; timeMs <= scenario.durationMs; timeMs += majorGridMs) {
        const x = xForTime(timeMs);
        context.beginPath();
        context.moveTo(x, TOP_MARGIN);
        context.lineTo(x, height - BOTTOM_MARGIN);
        context.stroke();
        context.fillStyle = '#66818a';
        context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(`${timeMs} ms`, x + 3, height - 12);
      }

      scenario.channels.forEach((channel, channelPosition) => {
        const centerY = TOP_MARGIN + rowHeight * (channelPosition + 0.5);
        context.strokeStyle = 'rgba(159, 185, 194, 0.14)';
        context.beginPath();
        context.moveTo(LEFT_MARGIN, centerY);
        context.lineTo(width - RIGHT_MARGIN, centerY);
        context.stroke();

        context.fillStyle = channel.kind === 'surface' ? '#f3d98d' : '#9eead1';
        context.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.textAlign = 'right';
        context.fillText(channel.label, LEFT_MARGIN - 12, centerY + 4);
        context.textAlign = 'left';

        const samples = scenario.waveformByChannel[channel.id];
        if (!samples) return;
        const amplitudeScale = rowHeight * (channel.kind === 'surface' ? 0.33 : 0.28);
        context.strokeStyle = channel.kind === 'surface' ? '#f3d98d' : '#a8f1d8';
        context.lineWidth = channel.kind === 'surface' ? 1.8 : 1.35;
        context.beginPath();
        samples.forEach((sample, sampleIndex) => {
          const timeMs = sampleIndex * waveformSampleIntervalMs;
          const x = xForTime(timeMs);
          const y = centerY - sample * amplitudeScale;
          if (sampleIndex === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      });

      const drawEndpoint = (
        endpoint: CaliperEndpoint,
        label: string,
        colour: string,
      ): void => {
        const x = xForTime(endpoint.timeMs);
        const y = yForChannel(endpoint.channelId);
        const halfSegment = Math.max(18, rowHeight * 0.34);

        context.strokeStyle = `${colour}55`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, TOP_MARGIN);
        context.lineTo(x, height - BOTTOM_MARGIN);
        context.stroke();

        context.strokeStyle = colour;
        context.lineWidth = 2.4;
        context.beginPath();
        context.moveTo(x, y - halfSegment);
        context.lineTo(x, y + halfSegment);
        context.stroke();
        context.beginPath();
        context.moveTo(x - 9, y);
        context.lineTo(x + 9, y);
        context.stroke();

        context.fillStyle = colour;
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
        context.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(label, x + 7, y - 9);
      };

      drawEndpoint(calipers.start, 'START', '#4fe5ad');
      drawEndpoint(calipers.end, 'END', '#ffb76b');

      if (running) {
        const x = xForTime(playheadMs);
        context.strokeStyle = 'rgba(255,255,255,0.55)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, TOP_MARGIN);
        context.lineTo(x, height - BOTTOM_MARGIN);
        context.stroke();
      }
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvasElement);
    return () => observer.disconnect();
  }, [calipers, playheadMs, running, scenario]);

  function endpointFromPointer(event: ReactPointerEvent<HTMLCanvasElement>): CaliperEndpoint {
    const canvas = event.currentTarget;
    const rectangle = canvas.getBoundingClientRect();
    const plotWidth = Math.max(1, rectangle.width - LEFT_MARGIN - RIGHT_MARGIN);
    const plotHeight = Math.max(1, rectangle.height - TOP_MARGIN - BOTTOM_MARGIN);
    const localX = clamp(event.clientX - rectangle.left - LEFT_MARGIN, 0, plotWidth);
    const localY = clamp(event.clientY - rectangle.top - TOP_MARGIN, 0, plotHeight - 0.001);
    const channelPosition = Math.floor((localY / plotHeight) * scenario.channels.length);
    const channel = scenario.channels[channelPosition] ?? scenario.channels[0];
    if (!channel) throw new Error('EGM scenario requires at least one channel.');
    return Object.freeze({
      timeMs: Math.round((localX / plotWidth) * scenario.durationMs),
      channelId: channel.id,
    });
  }

  function screenPoint(endpoint: CaliperEndpoint, canvas: HTMLCanvasElement): readonly [number, number] {
    const rectangle = canvas.getBoundingClientRect();
    const plotWidth = Math.max(1, rectangle.width - LEFT_MARGIN - RIGHT_MARGIN);
    const plotHeight = Math.max(1, rectangle.height - TOP_MARGIN - BOTTOM_MARGIN);
    const rowHeight = plotHeight / scenario.channels.length;
    return [
      rectangle.left + LEFT_MARGIN + (endpoint.timeMs / scenario.durationMs) * plotWidth,
      rectangle.top + TOP_MARGIN + rowHeight * (channelIndex(scenario, endpoint.channelId) + 0.5),
    ];
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (running) return;
    const [startX, startY] = screenPoint(calipers.start, event.currentTarget);
    const [endX, endY] = screenPoint(calipers.end, event.currentTarget);
    const startDistance = Math.hypot(event.clientX - startX, event.clientY - startY);
    const endDistance = Math.hypot(event.clientX - endX, event.clientY - endY);
    const nextHandle: Exclude<DragHandle, null> = startDistance <= endDistance ? 'start' : 'end';
    setDragHandle(nextHandle);
    event.currentTarget.setPointerCapture(event.pointerId);
    const endpoint = endpointFromPointer(event);
    onCalipersChange(nextHandle === 'start'
      ? { ...calipers, start: endpoint }
      : { ...calipers, end: endpoint });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (running || dragHandle === null) return;
    const endpoint = endpointFromPointer(event);
    onCalipersChange(dragHandle === 'start'
      ? { ...calipers, start: endpoint }
      : { ...calipers, end: endpoint });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragHandle(null);
  }

  const canvas = (
    <canvas
      ref={canvasRef}
      className="egm-canvas"
      aria-label="Synthetic electrogram with channel-aware draggable start and end calipers"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );

  return (
    <div className="egm-caliper-shell">
      {allowExpand && (
        <div className="egm-caliper-toolbar">
          <span>Click and drag either caliper handle</span>
          <button type="button" onClick={() => setExpanded(true)}>Enlarge tracing</button>
        </div>
      )}
      {canvas}
      {expanded && (
        <div className="egm-caliper-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setExpanded(false);
        }}>
          <section className="egm-caliper-modal-panel" role="dialog" aria-modal="true" aria-label="Expanded electrogram">
            <div className="egm-caliper-modal-heading">
              <div>
                <span className="assessment-panel-kicker">EXPANDED EGM</span>
                <strong>{scenario.title}</strong>
              </div>
              <button type="button" onClick={() => setExpanded(false)}>Close</button>
            </div>
            <EgmCaliperCanvas
              scenario={scenario}
              calipers={calipers}
              running={running}
              playheadMs={playheadMs}
              onCalipersChange={onCalipersChange}
              allowExpand={false}
            />
          </section>
        </div>
      )}
    </div>
  );
}
