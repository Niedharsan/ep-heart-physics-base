import type { FloatingPointState } from './FloatingPointState';

export interface RectangularCurrentRegion {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

export function isCurrentPulseActive(
  step: number,
  onsetStep: number,
  durationSteps: number,
): boolean {
  if (!Number.isInteger(step) || step < 0 || !Number.isInteger(onsetStep) || onsetStep < 0
    || !Number.isInteger(durationSteps) || durationSteps < 1) {
    throw new Error('Current-pulse step values must be non-negative integers with positive duration.');
  }
  return step >= onsetStep && step < onsetStep + durationSteps;
}

export function writeRectangularStimulusCurrent(
  target: FloatingPointState,
  mask: Uint8Array,
  width: number,
  height: number,
  region: RectangularCurrentRegion,
  amplitude: number,
): void {
  if (target.length !== width * height || mask.length !== target.length) {
    throw new Error('Stimulus-current arrays must match the grid dimensions.');
  }
  if (!(amplitude > 0) || !Number.isFinite(amplitude)) {
    throw new Error('Stimulus-current amplitude must be finite and positive.');
  }
  for (const [name, value] of Object.entries(region)) {
    if (!Number.isInteger(value)) throw new Error(`Stimulus-current ${name} must be an integer grid index.`);
  }
  if (region.minimumX < 0 || region.minimumY < 0
    || region.maximumX >= width || region.maximumY >= height
    || region.maximumX < region.minimumX || region.maximumY < region.minimumY) {
    throw new Error('Stimulus-current region must be ordered and lie inside the grid.');
  }
  for (let y = region.minimumY; y <= region.maximumY; y += 1) {
    for (let x = region.minimumX; x <= region.maximumX; x += 1) {
      const index = y * width + x;
      if (mask[index] === 1) target[index] = amplitude;
    }
  }
}
