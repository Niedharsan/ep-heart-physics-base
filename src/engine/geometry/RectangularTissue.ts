import type { GridConfig } from '../core/types';

export class RectangularTissue {
  readonly width: number;
  readonly height: number;
  readonly dx: number;
  readonly size: number;
  readonly mask: Uint8Array;

  constructor(config: GridConfig) {
    if (!Number.isInteger(config.width) || config.width < 8) {
      throw new Error('Grid width must be an integer of at least 8 cells.');
    }
    if (!Number.isInteger(config.height) || config.height < 8) {
      throw new Error('Grid height must be an integer of at least 8 cells.');
    }
    if (!(config.dx > 0) || !Number.isFinite(config.dx)) {
      throw new Error('Grid spacing dx must be finite and greater than zero.');
    }

    this.width = config.width;
    this.height = config.height;
    this.dx = config.dx;
    this.size = config.width * config.height;
    this.mask = new Uint8Array(this.size);
    this.mask.fill(1);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  isConductive(x: number, y: number): boolean {
    return this.mask[this.index(x, y)] === 1;
  }

  setCircularObstacle(cx: number, cy: number, radius: number): void {
    const r2 = radius * radius;
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.mask[this.index(x, y)] = 0;
        }
      }
    }
  }

  ablateCircle(cx: number, cy: number, radius: number): void {
    this.setCircularObstacle(cx, cy, radius);
  }
}
