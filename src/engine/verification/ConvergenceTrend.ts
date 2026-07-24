export interface RefinementTrendGates {
  readonly refinementRatio: number;
  readonly maximumContraction: number;
  readonly minimumApparentOrder: number;
  readonly maximumFinestPairRelativeChange: number;
}

export type RefinementTrendKind =
  | 'monotone-contracting'
  | 'monotone-noncontracting'
  | 'oscillatory'
  | 'stationary';

export interface RefinementTrendInput {
  readonly parameterName: 'dx' | 'dt';
  readonly parameterUnits: 'model-length-unit' | 'model-time-unit';
  readonly quantityUnits: 'model-length-unit/model-time-unit';
  readonly parameterValues: readonly number[];
  readonly quantities: readonly number[];
  readonly refinementRatio: number;
}

export interface RefinementTrendResult {
  readonly parameterName: 'dx' | 'dt';
  readonly parameterUnits: 'model-length-unit' | 'model-time-unit';
  readonly quantityUnits: 'model-length-unit/model-time-unit';
  readonly parameterValues: readonly number[];
  readonly quantities: readonly number[];
  readonly signedDifferences: readonly [number, number];
  readonly absoluteDifferences: readonly [number, number];
  readonly refinementRatio: number;
  readonly trend: RefinementTrendKind;
  readonly contraction: number | null;
  readonly apparentOrder: number | null;
  readonly finestPairRelativeChange: number;
  readonly richardsonEstimate: number | null;
  readonly notes: readonly string[];
}

const ratioTolerance = 1e-10;

export function analyzeRefinementTrend(input: RefinementTrendInput): RefinementTrendResult {
  const { parameterValues, quantities, refinementRatio } = input;
  validateRefinementDefinition(parameterValues, refinementRatio);
  if (quantities.length !== 3) {
    throw new Error('Refinement trend analysis requires exactly three parameter values and quantities.');
  }
  if (!quantities.every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Refinement quantities must be finite and positive.');
  }

  const coarseDifference = quantities[1]! - quantities[0]!;
  const fineDifference = quantities[2]! - quantities[1]!;
  const coarseAbsoluteDifference = Math.abs(coarseDifference);
  const fineAbsoluteDifference = Math.abs(fineDifference);
  const notes: string[] = [];
  let trend: RefinementTrendKind;
  if (coarseDifference === 0 && fineDifference === 0) trend = 'stationary';
  else if (coarseDifference * fineDifference < 0) trend = 'oscillatory';
  else if (coarseAbsoluteDifference > 0 && fineAbsoluteDifference < coarseAbsoluteDifference) {
    trend = 'monotone-contracting';
  } else trend = 'monotone-noncontracting';

  const contraction = coarseAbsoluteDifference === 0 ? null : fineAbsoluteDifference / coarseAbsoluteDifference;
  const apparentOrder = contraction === null || contraction === 0
    ? null
    : Math.log(1 / contraction) / Math.log(refinementRatio);
  let richardsonEstimate: number | null = null;
  if (trend === 'monotone-contracting' && apparentOrder !== null) {
    const denominator = refinementRatio ** apparentOrder - 1;
    if (denominator !== 0 && Number.isFinite(denominator)) {
      richardsonEstimate = quantities[2]! + fineDifference / denominator;
    }
  }
  if (trend !== 'monotone-contracting') notes.push(`quantity sequence is ${trend}`);
  if (contraction === null) notes.push('coarse-pair difference is zero, so contraction and order are undefined');
  else if (apparentOrder === null) notes.push('fine-pair difference is zero, so logarithmic order is undefined');
  if (richardsonEstimate === null) notes.push('Richardson estimate is not supported for this sequence');

  return Object.freeze({
    parameterName: input.parameterName,
    parameterUnits: input.parameterUnits,
    quantityUnits: input.quantityUnits,
    parameterValues: Object.freeze([...parameterValues]),
    quantities: Object.freeze([...quantities]),
    signedDifferences: Object.freeze([coarseDifference, fineDifference]) as readonly [number, number],
    absoluteDifferences: Object.freeze([coarseAbsoluteDifference, fineAbsoluteDifference]) as readonly [number, number],
    refinementRatio,
    trend,
    contraction,
    apparentOrder,
    finestPairRelativeChange: fineAbsoluteDifference / quantities[2]!,
    richardsonEstimate,
    notes: Object.freeze(notes),
  });
}

export function validateRefinementDefinition(
  parameterValues: readonly number[],
  refinementRatio: number,
): void {
  if (parameterValues.length !== 3) {
    throw new Error('Refinement definition requires exactly three parameter values.');
  }
  if (!parameterValues.every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Refinement parameters must be finite and positive.');
  }
  if (!(refinementRatio > 1) || !Number.isFinite(refinementRatio)) {
    throw new Error('Refinement ratio must be finite and greater than one.');
  }
  const firstRatio = parameterValues[0]! / parameterValues[1]!;
  const secondRatio = parameterValues[1]! / parameterValues[2]!;
  if (Math.abs(firstRatio - refinementRatio) > ratioTolerance
    || Math.abs(secondRatio - refinementRatio) > ratioTolerance) {
    throw new Error(`Refinement parameters must decrease by ratio ${refinementRatio}.`);
  }
}
