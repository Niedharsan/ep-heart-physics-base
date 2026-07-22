import type { FloatingPointState } from './FloatingPointState';

export function fivePointNoFluxLaplacianAt(
  state: FloatingPointState,
  mask: Uint8Array,
  width: number,
  height: number,
  dx: number,
  x: number,
  y: number,
): number {
  if (state.length !== width * height || mask.length !== state.length) {
    throw new Error('No-flux Laplacian arrays must match the grid dimensions.');
  }
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= width || y < 0 || y >= height) {
    throw new Error('No-flux Laplacian coordinates must identify a grid node.');
  }
  if (!(dx > 0) || !Number.isFinite(dx)) throw new Error('No-flux Laplacian dx must be finite and positive.');
  const index = y * width + x;
  if (mask[index] !== 1) return 0;
  const center = state[index]!;
  const leftIndex = x > 0 ? index - 1 : index + 1;
  const rightIndex = x < width - 1 ? index + 1 : index - 1;
  const upIndex = y > 0 ? index - width : index + width;
  const downIndex = y < height - 1 ? index + width : index - width;
  const left = mask[leftIndex] === 1 ? state[leftIndex]! : center;
  const right = mask[rightIndex] === 1 ? state[rightIndex]! : center;
  const up = mask[upIndex] === 1 ? state[upIndex]! : center;
  const down = mask[downIndex] === 1 ? state[downIndex]! : center;
  return (left + right + up + down - 4 * center) / (dx * dx);
}
