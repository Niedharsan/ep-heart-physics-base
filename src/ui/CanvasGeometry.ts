export interface CanvasBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface NodalPoint {
  readonly x: number;
  readonly y: number;
}

export function physicalGridAspectRatio(width: number, height: number, dx: number): number {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error('Canvas grid dimensions must be integers of at least two.');
  }
  if (!(dx > 0) || !Number.isFinite(dx)) throw new Error('Canvas grid spacing must be finite and positive.');
  return ((width - 1) * dx) / ((height - 1) * dx);
}

export function mapPointerToNodalGrid(
  clientX: number,
  clientY: number,
  bounds: CanvasBounds,
  gridWidth: number,
  gridHeight: number,
): NodalPoint {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    throw new Error('Pointer coordinates must be finite.');
  }
  if (!(bounds.width > 0) || !Number.isFinite(bounds.width)
    || !(bounds.height > 0) || !Number.isFinite(bounds.height)
    || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.top)) {
    throw new Error('Canvas bounds must be finite with positive dimensions.');
  }
  if (!Number.isInteger(gridWidth) || !Number.isInteger(gridHeight) || gridWidth < 2 || gridHeight < 2) {
    throw new Error('Pointer mapping requires grid dimensions of at least two.');
  }
  const normalizedX = clamp01((clientX - bounds.left) / bounds.width);
  const normalizedY = clamp01((clientY - bounds.top) / bounds.height);
  return Object.freeze({
    x: normalizedX * (gridWidth - 1),
    y: normalizedY * (gridHeight - 1),
  });
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
