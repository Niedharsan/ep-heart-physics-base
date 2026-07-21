import { useEffect, useRef } from 'react';
import type { EngineSnapshot } from '../engine/core/types';

interface VoltageCanvasProps {
  readonly snapshot: EngineSnapshot | null;
  readonly interactionMode: 'stimulate' | 'ablate';
  readonly onPoint: (x: number, y: number) => void;
}

function voltageToRgb(value: number): readonly [number, number, number] {
  const normalized = Math.max(0, Math.min(1, value));
  const red = Math.round(30 + normalized * 225);
  const green = Math.round(10 + Math.pow(normalized, 2) * 170);
  const blue = Math.round(45 + (1 - normalized) * 70);
  return [red, green, blue];
}

export function VoltageCanvas({ snapshot, interactionMode, onPoint }: VoltageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const image = context.createImageData(snapshot.width, snapshot.height);
    for (let index = 0; index < snapshot.voltage.length; index += 1) {
      const pixelIndex = index * 4;
      if (snapshot.tissueMask[index] === 0) {
        image.data[pixelIndex] = 6;
        image.data[pixelIndex + 1] = 8;
        image.data[pixelIndex + 2] = 13;
        image.data[pixelIndex + 3] = 255;
        continue;
      }
      const [red, green, blue] = voltageToRgb(snapshot.voltage[index] ?? 0);
      image.data[pixelIndex] = red;
      image.data[pixelIndex + 1] = green;
      image.data[pixelIndex + 2] = blue;
      image.data[pixelIndex + 3] = 255;
    }

    const buffer = document.createElement('canvas');
    buffer.width = snapshot.width;
    buffer.height = snapshot.height;
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return;
    bufferContext.putImageData(image, 0, 0);

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(buffer, 0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = 1;
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
  }, [snapshot]);

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={560}
      className={`voltage-canvas mode-${interactionMode}`}
      onPointerDown={(event) => {
        if (!snapshot) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * snapshot.width;
        const y = ((event.clientY - bounds.top) / bounds.height) * snapshot.height;
        onPoint(x, y);
      }}
      aria-label="Cardiac tissue voltage field"
    />
  );
}
