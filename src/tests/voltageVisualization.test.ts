import { describe, expect, it } from 'vitest';
import { mapVoltageToRgba } from '../ui/VoltageVisualization';

describe('voltage visualization mapping', () => {
  it('returns finite byte channels for every display mode', () => {
    for (const mode of ['wavefront', 'voltage', 'monochrome'] as const) {
      for (const value of [-1, 0, 0.25, 0.5, 1, 2]) {
        const rgba = mapVoltageToRgba(value, {
          mode,
          brightness: 1,
          frontWidth: 0.14,
        });

        expect(rgba).toHaveLength(4);
        rgba.forEach((channel) => {
          expect(Number.isInteger(channel)).toBe(true);
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        });
      }
    }
  });

  it('emphasizes the mid-voltage activation front', () => {
    const options = { mode: 'wavefront' as const, brightness: 1, frontWidth: 0.14 };
    const resting = mapVoltageToRgba(0, options);
    const front = mapVoltageToRgba(0.48, options);
    const plateau = mapVoltageToRgba(1, options);
    const intensity = (rgba: readonly number[]) => rgba[0]! + rgba[1]! + rgba[2]!;

    expect(intensity(front)).toBeGreaterThan(intensity(resting));
    expect(intensity(front)).toBeGreaterThan(intensity(plateau));
  });

  it('clamps voltage outside the supported display range', () => {
    const options = { mode: 'voltage' as const, brightness: 1, frontWidth: 0.14 };
    expect(mapVoltageToRgba(-1, options)).toEqual(mapVoltageToRgba(0, options));
    expect(mapVoltageToRgba(2, options)).toEqual(mapVoltageToRgba(1, options));
  });
});
