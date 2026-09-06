import { describe, expect, it } from 'vitest';
import { catheterTargets } from '../assessment/task1/catalog';
import {
  markSpatialCatheterPlacements,
} from '../assessment/CatheterPlacementExercise';

describe('draggable catheter placement', () => {
  it('does not award unplaced catheters', () => {
    const result = markSpatialCatheterPlacements({});
    expect(result.score).toBe(0);
    expect(result.feedback).toHaveLength(4);
  });

  it('awards placements near each target and rejects distant placements', () => {
    const target = (id: string) => catheterTargets.find((candidate) => candidate.id === id)!;
    const result = markSpatialCatheterPlacements({
      hra: { xPercent: target('high-right-atrium').xPercent, yPercent: target('high-right-atrium').yPercent },
      hbe: { xPercent: target('his-bundle-region').xPercent + 3, yPercent: target('his-bundle-region').yPercent + 3 },
      rva: { xPercent: target('right-ventricular-apex').xPercent, yPercent: target('right-ventricular-apex').yPercent },
      cs: { xPercent: 5, yPercent: 95 },
    });
    expect(result.score).toBe(3);
    expect(result.feedback).toEqual(['CS: position requires review.']);
  });
});
