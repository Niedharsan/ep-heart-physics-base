import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EcgCanvas } from '../ui/EcgCanvas';

describe('professional live ECG UI', () => {
  it('shows an explicit waiting state before signal samples arrive', () => {
    const markup = renderToStaticMarkup(<EcgCanvas samples={[]} />);
    expect(markup).toContain('waiting for signal');
    expect(markup).toContain('trigger a pacing pulse');
  });

  it('renders the live signal through the clinical SVG scene', () => {
    const samples = Array.from({ length: 300 }, (_, index) =>
      Math.sin(index / 9) * Math.exp(-(((index % 75) - 24) ** 2) / 180),
    );
    const markup = renderToStaticMarkup(<EcgCanvas samples={samples} />);
    expect(markup).toContain('clinical-ecg-svg');
    expect(markup).toContain('clinical-grid-major');
    expect(markup).toContain('clinical-ecg-calibration');
    expect(markup).toContain('clinical-ecg-trace');
    expect(markup).toContain('25 mm/s');
    expect(markup).toContain('Display-normalized pseudo-ECG');
  });

  it('limits the visible signal to a six-second rolling strip', () => {
    const samples = Array.from({ length: 900 }, (_, index) => Math.sin(index / 10));
    const markup = renderToStaticMarkup(<EcgCanvas samples={samples} />);
    expect(markup).toContain('6 s rolling strip');
    expect(markup).toContain('5 s');
    expect(markup).not.toContain('8 s');
  });
});
