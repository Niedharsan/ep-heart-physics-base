export type ObservedTrend = 'contracting' | 'stagnant' | 'divergent' | 'oscillatory';

export interface ObservedOrderReport {
  readonly errors: readonly number[];
  readonly refinementRatio: number;
  readonly pairwiseOrders: readonly (number | null)[];
  readonly trend: ObservedTrend;
  readonly notes: readonly string[];
}

export function analyzeObservedOrder(errors: readonly number[], refinementRatio: number): ObservedOrderReport {
  if (errors.length < 2 || !errors.every((error) => Number.isFinite(error) && error >= 0)) {
    throw new Error('Observed-order analysis requires at least two finite non-negative errors.');
  }
  if (!(refinementRatio > 1) || !Number.isFinite(refinementRatio)) {
    throw new Error('Observed-order refinement ratio must be finite and greater than one.');
  }
  const notes: string[] = [];
  const pairwiseOrders = errors.slice(0, -1).map((error, index) => {
    const next = errors[index + 1]!;
    if (error === 0 || next === 0) {
      notes.push(`pair ${index} has a zero error, so its logarithmic order is undefined`);
      return null;
    }
    return Math.log(error / next) / Math.log(refinementRatio);
  });
  const differences = errors.slice(1).map((error, index) => error - errors[index]!);
  const hasDecrease = differences.some((difference) => difference < 0);
  const hasIncrease = differences.some((difference) => difference > 0);
  let trend: ObservedTrend;
  if (differences.every((difference) => difference < 0)) trend = 'contracting';
  else if (!hasDecrease && hasIncrease) trend = 'divergent';
  else if (!hasDecrease && !hasIncrease) trend = 'stagnant';
  else trend = 'oscillatory';
  if (trend !== 'contracting') notes.push(`error sequence is ${trend}`);
  return Object.freeze({
    errors: Object.freeze([...errors]),
    refinementRatio,
    pairwiseOrders: Object.freeze(pairwiseOrders),
    trend,
    notes: Object.freeze(notes),
  });
}
