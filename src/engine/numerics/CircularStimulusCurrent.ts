import type { FloatingPointState } from './FloatingPointState';
import {
  validateCircularRegion,
  validateFinitePositive,
} from '../geometry/SpatialInputValidation';

export interface CircularCurrentRegion {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export function writeCircularStimulusCurrent(
  target: FloatingPointState,
  mask: Uint8Array,
  width: number,
  height: number,
  region: CircularCurrentRegion,
  amplitude: number,
): void {
  if (target.length !== width * height || mask.length !== target.length) {
    throw new Error('Circular stimulus-current arrays must match the grid dimensions.');
  }

  validateCircularRegion(
    region.x,
    region.y,
    region.radius,
    width,
    height,
    'Circular stimulus current',
  );
  validateFinitePositive(amplitude, 'Circular stimulus-current amplitude');

  const radiusSquared = region.radius * region.radius;
  const minimumX = Math.max(0, Math.floor(region.x - region.radius));
  const maximumX = Math.min(width - 1, Math.ceil(region.x + region.radius));
  const minimumY = Math.max(0, Math.floor(region.y - region.radius));
  const maximumY = Math.min(height - 1, Math.ceil(region.y + region.radius));

  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const dx = x - region.x;
      const dy = y - region.y;
      if (dx * dx + dy * dy > radiusSquared) continue;

      const index = y * width + x;
      if (mask[index] === 1) {
        target[index] = Math.max(target[index] ?? 0, amplitude);
      }
    }
  }
}
