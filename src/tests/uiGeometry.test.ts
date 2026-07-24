import { describe, expect, it } from 'vitest';
import { mapPointerToNodalGrid, physicalGridAspectRatio } from '../ui/CanvasGeometry';

describe('voltage-canvas physical geometry', () => {
  it('uses nodal physical extents for the display aspect ratio', () => {
    expect(physicalGridAspectRatio(160, 104, 1)).toBeCloseTo(159 / 103, 15);
    expect(physicalGridAspectRatio(97, 25, 0.5)).toBe(4);
  });

  it('maps and clamps pointers to inclusive nodal coordinates', () => {
    const bounds = { left: 10, top: 20, width: 200, height: 100 };
    expect(mapPointerToNodalGrid(110, 70, bounds, 160, 104)).toEqual({ x: 79.5, y: 51.5 });
    expect(mapPointerToNodalGrid(-100, -100, bounds, 160, 104)).toEqual({ x: 0, y: 0 });
    expect(mapPointerToNodalGrid(1000, 1000, bounds, 160, 104)).toEqual({ x: 159, y: 103 });
    expect(mapPointerToNodalGrid(-100, 1000, bounds, 160, 104)).toEqual({ x: 0, y: 103 });
    expect(mapPointerToNodalGrid(1000, -100, bounds, 160, 104)).toEqual({ x: 159, y: 0 });
  });

  it('rejects malformed canvas geometry', () => {
    expect(() => mapPointerToNodalGrid(0, 0, { left: 0, top: 0, width: 0, height: 10 }, 8, 8))
      .toThrow(/positive dimensions/);
    expect(() => physicalGridAspectRatio(1, 8, 1)).toThrow(/at least two/);
  });
});
