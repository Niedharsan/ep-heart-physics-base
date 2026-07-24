import type { StatePrecision } from '../core/types';

export type FloatingPointState = Float32Array | Float64Array;

export function createStateArray(precision: StatePrecision, length: number): FloatingPointState {
  if (!Number.isInteger(length) || length < 0) throw new Error('State-array length must be a non-negative integer.');
  if (precision === 'float32') return new Float32Array(length);
  if (precision === 'float64') return new Float64Array(length);
  const neverPrecision: never = precision;
  throw new Error(`Unsupported state precision: ${String(neverPrecision)}`);
}
