export interface ErrorNorms {
  readonly rootMeanSquare: number;
  readonly maximumAbsolute: number;
  readonly sampleCount: number;
}

export function calculateErrorNorms(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  mask?: Uint8Array,
): ErrorNorms {
  if (actual.length !== expected.length || (mask && mask.length !== actual.length)) {
    throw new Error('Error-norm arrays must have matching lengths.');
  }
  let squaredErrorSum = 0;
  let maximumAbsolute = 0;
  let sampleCount = 0;
  for (let index = 0; index < actual.length; index += 1) {
    if (mask && mask[index] !== 1) continue;
    const actualValue = actual[index]!;
    const expectedValue = expected[index]!;
    if (!Number.isFinite(actualValue) || !Number.isFinite(expectedValue)) {
      throw new Error(`Error-norm values must be finite at index ${index}.`);
    }
    const absoluteError = Math.abs(actualValue - expectedValue);
    squaredErrorSum += absoluteError * absoluteError;
    maximumAbsolute = Math.max(maximumAbsolute, absoluteError);
    sampleCount += 1;
  }
  if (sampleCount === 0) throw new Error('Error norms require at least one included sample.');
  return Object.freeze({
    rootMeanSquare: Math.sqrt(squaredErrorSum / sampleCount),
    maximumAbsolute,
    sampleCount,
  });
}
