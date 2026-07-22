import { useEffect, useRef } from 'react';
import type { EngineSnapshot } from '../engine/core/types';
import { mapPointerToNodalGrid, physicalGridAspectRatio } from './CanvasGeometry';
import {
  mapVoltageToRgba,
  type VoltageDisplayMode,
} from './VoltageVisualization';

interface PacingSiteMarker {
  readonly x: number;
  readonly y: number;
}

interface VoltageCanvasProps {
  readonly snapshot: EngineSnapshot | null;
  readonly interactionMode: 'stimulate' | 'ablate';
  readonly displayMode: VoltageDisplayMode;
  readonly showGrid: boolean;
  readonly brightness: number;
  readonly frontWidth: number;
  readonly pacingSites: readonly PacingSiteMarker[];
  readonly onPoint: (x: number, y: number) => void;
}

export function VoltageCanvas({
  snapshot,
  interactionMode,
  displayMode,
  showGrid,
  brightness,
  frontWidth,
  pacingSites,
  onPoint,
}: VoltageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspectRatio = snapshot
    ? physicalGridAspectRatio(snapshot.width, snapshot.height, snapshot.dx)
    : physicalGridAspectRatio(160, 104, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;

    const cssWidth = Math.max(1, canvas.clientWidth);
    const cssHeight = Math.max(1, canvas.clientHeight);
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const targetWidth = Math.round(cssWidth * devicePixelRatio);
    const targetHeight = Math.round(cssHeight * devicePixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    const image = context.createImageData(snapshot.width, snapshot.height);
    for (let index = 0; index < snapshot.voltage.length; index += 1) {
      const pixelIndex = index * 4;
      if (snapshot.tissueMask[index] === 0) {
        image.data[pixelIndex] = 3;
        image.data[pixelIndex + 1] = 7;
        image.data[pixelIndex + 2] = 12;
        image.data[pixelIndex + 3] = 255;
        continue;
      }

      const [red, green, blue, alpha] = mapVoltageToRgba(
        snapshot.voltage[index] ?? 0,
        { mode: displayMode, brightness, frontWidth },
      );
      image.data[pixelIndex] = red;
      image.data[pixelIndex + 1] = green;
      image.data[pixelIndex + 2] = blue;
      image.data[pixelIndex + 3] = alpha;
    }

    const buffer = document.createElement('canvas');
    buffer.width = snapshot.width;
    buffer.height = snapshot.height;
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return;
    bufferContext.putImageData(image, 0, 0);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#03070d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(buffer, 0, 0, canvas.width, canvas.height);

    if (showGrid) {
      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.lineWidth = devicePixelRatio;
      for (let x = 0; x <= canvas.width; x += canvas.width / 8) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }
      for (let y = 0; y <= canvas.height; y += canvas.height / 6) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
    }

    pacingSites.forEach((site, index) => {
      const markerX = (site.x / Math.max(snapshot.width - 1, 1)) * canvas.width;
      const markerY = (site.y / Math.max(snapshot.height - 1, 1)) * canvas.height;
      const markerRadius = 8 * devicePixelRatio;

      context.beginPath();
      context.arc(markerX, markerY, markerRadius, 0, Math.PI * 2);
      context.fillStyle = 'rgba(2, 8, 13, 0.82)';
      context.fill();
      context.strokeStyle = '#55edb1';
      context.lineWidth = 2 * devicePixelRatio;
      context.stroke();

      context.fillStyle = '#dffff2';
      context.font = `700 ${10 * devicePixelRatio}px ui-sans-serif, system-ui`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(index + 1), markerX, markerY);
    });
  }, [snapshot, displayMode, showGrid, brightness, frontWidth, pacingSites]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={622}
      style={{ aspectRatio }}
      className={`voltage-canvas mode-${interactionMode}`}
      onPointerDown={(event) => {
        if (!snapshot) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const point = mapPointerToNodalGrid(
          event.clientX,
          event.clientY,
          bounds,
          snapshot.width,
          snapshot.height,
        );
        onPoint(point.x, point.y);
      }}
      aria-label="Cardiac tissue voltage field"
    />
  );
}
