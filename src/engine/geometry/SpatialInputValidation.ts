export function validateFinitePositive(value: number, label: string): void {
  if (!(value > 0) || !Number.isFinite(value)) throw new Error(`${label} must be finite and positive.`);
}

export function validateNodalPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${label} coordinates must be finite.`);
  if (x < 0 || x > width - 1 || y < 0 || y > height - 1) {
    throw new Error(`${label} coordinates must lie inside the nodal grid.`);
  }
}

export function validateCircularRegion(
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number,
  label: string,
): void {
  validateNodalPoint(x, y, width, height, label);
  validateFinitePositive(radius, `${label} radius`);
}

export function validateNodalRectangle(
  minimumX: number,
  maximumX: number,
  minimumY: number,
  maximumY: number,
  width: number,
  height: number,
  label: string,
): void {
  validateNodalPoint(minimumX, minimumY, width, height, `${label} minimum`);
  validateNodalPoint(maximumX, maximumY, width, height, `${label} maximum`);
  if (maximumX < minimumX || maximumY < minimumY) throw new Error(`${label} coordinates must be ordered.`);
}
