import { useEffect, useRef } from 'react';

interface EcgCanvasProps {
  readonly samples: readonly number[];
}

export function EcgCanvas({ samples }: EcgCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#05080c';
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(255,255,255,0.07)';
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    if (samples.length < 2) return;
    const maxAbs = Math.max(0.0001, ...samples.map((sample) => Math.abs(sample)));
    context.strokeStyle = '#41f3a2';
    context.lineWidth = 2;
    context.beginPath();
    samples.forEach((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * width;
      const y = height * 0.5 - (sample / maxAbs) * height * 0.38;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }, [samples]);

  return <canvas ref={canvasRef} width={960} height={200} className="ecg-canvas" aria-label="Pseudo ECG lead" />;
}
