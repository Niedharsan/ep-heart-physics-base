import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { CaliperPlacement, EgmScenario } from './types';
import { waveformSampleIntervalMs } from './waveform';

interface EgmCaliperCanvasProps {
  readonly scenario: EgmScenario;
  readonly calipers: CaliperPlacement;
  readonly running: boolean;
  readonly playheadMs: number;
  readonly onCalipersChange: (placement: CaliperPlacement) => void;
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

export function EgmCaliperCanvas({
  scenario,
  calipers,
  running,
  playheadMs,
  onCalipersChange,
}: EgmCaliperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragHandle, setDragHandle] = useState<DragHandle>(null);

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

      scenario.channels.forEach((channel, channelIndex) => {
        const centerY = TOP_MARGIN + rowHeight * (channelIndex + 0.5);
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

      const drawCaliper = (timeMs: number, label: string, colour: string): void => {
        const x = xForTime(timeMs);
        context.strokeStyle = colour;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x, TOP_MARGIN);
        context.lineTo(x, height - BOTTOM_MARGIN);
        context.stroke();
        context.fillStyle = colour;
        context.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(label, x + 4, TOP_MARGIN + 12);
      };

      drawCaliper(calipers.startMs, 'START', '#4fe5ad');
      drawCaliper(calipers.endMs, 'END', '#ffb76b');

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

  function timeFromPointer(event: ReactPointerEvent<HTMLCanvasElement>): number {
    const canvas = event.currentTarget;
    const rectangle = canvas.getBoundingClientRect();
    const plotWidth = Math.max(1, rectangle.width - LEFT_MARGIN - RIGHT_MARGIN);
    const localX = clamp(event.clientX - rectangle.left - LEFT_MARGIN, 0, plotWidth);
    return Math.round((localX / plotWidth) * scenario.durationMs);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (running) return;
    const timeMs = timeFromPointer(event);
    const startDistance = Math.abs(timeMs - calipers.startMs);
    const endDistance = Math.abs(timeMs - calipers.endMs);
    const nextHandle: Exclude<DragHandle, null> = startDistance <= endDistance ? 'start' : 'end';
    setDragHandle(nextHandle);
    event.currentTarget.setPointerCapture(event.pointerId);
    onCalipersChange(nextHandle === 'start'
      ? { ...calipers, startMs: timeMs }
      : { ...calipers, endMs: timeMs });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (running || dragHandle === null) return;
    const timeMs = timeFromPointer(event);
    onCalipersChange(dragHandle === 'start'
      ? { ...calipers, startMs: timeMs }
      : { ...calipers, endMs: timeMs });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragHandle(null);
  }

  return (
    <canvas
      ref={canvasRef}
      className="egm-canvas"
      aria-label="Synthetic electrogram with draggable start and end calipers"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
