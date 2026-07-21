const alignmentTolerance = 1e-10;

export function physicalCoordinateToGridIndex(
  coordinate: number,
  dx: number,
  maximumIndex: number,
  label: string,
): number {
  if (!Number.isFinite(coordinate) || coordinate < 0) {
    throw new Error(`${label} must be a finite non-negative model-length coordinate.`);
  }
  if (!(dx > 0) || !Number.isFinite(dx)) throw new Error('Grid spacing must be finite and positive.');
  if (!Number.isInteger(maximumIndex) || maximumIndex < 0) throw new Error('Maximum grid index must be a non-negative integer.');
  const unrounded = coordinate / dx;
  const index = Math.round(unrounded);
  if (Math.abs(unrounded - index) > alignmentTolerance) {
    throw new Error(`${label}=${coordinate} is not exactly representable on grid spacing ${dx}.`);
  }
  if (index > maximumIndex) throw new Error(`${label}=${coordinate} lies outside the grid.`);
  return index;
}

export function gridNodeCountForExtent(extent: number, dx: number, label: string): number {
  if (!(extent > 0) || !Number.isFinite(extent)) throw new Error(`${label} must be finite and positive.`);
  const finalIndex = physicalCoordinateToGridIndex(extent, dx, Number.MAX_SAFE_INTEGER, label);
  return finalIndex + 1;
}

export function snapGridCoordinate(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Grid coordinate must be finite.');
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= alignmentTolerance ? nearest : value;
}
