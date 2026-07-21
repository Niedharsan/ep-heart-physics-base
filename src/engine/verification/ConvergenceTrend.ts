export interface RefinementTrendGates {
  readonly refinementRatio: number;
  readonly maximumContraction: number;
  readonly minimumApparentOrder: number;
  readonly maximumFinestPairRelativeChange: number;
}

export interface RefinementTrendInput {
  readonly parameterName: 'dx' | 'dt';
  readonly parameterUnits: 'model-length-unit' | 'model-time-unit';
  readonly quantityUnits: 'model-length-unit/model-time-unit';
  readonly parameterValues: readonly number[];
  readonly quantities: readonly number[];
  readonly gates: RefinementTrendGates;
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
  readonly contraction: number;
  readonly apparentOrder: number;
  readonly finestPairRelativeChange: number;
  readonly richardsonEstimate: number;
  readonly gates: RefinementTrendGates;
}

const ratioTolerance = 1e-10;

export function analyzeRefinementTrend(input: RefinementTrendInput): RefinementTrendResult {
  const { parameterValues, quantities, gates } = input;
  validateRefinementDefinition(parameterValues, gates);
  if (quantities.length !== 3) {
    throw new Error('Refinement trend analysis requires exactly three parameter values and quantities.');
  }
  if (!quantities.every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Refinement quantities must be finite and positive.');
  }

  const coarseDifference = quantities[1]! - quantities[0]!;
  const fineDifference = quantities[2]! - quantities[1]!;
  if (coarseDifference * fineDifference <= 0) {
    throw new Error('Refinement quantities must change monotonically with non-zero same-sign differences.');
  }
  const coarseAbsoluteDifference = Math.abs(coarseDifference);
  const fineAbsoluteDifference = Math.abs(fineDifference);
  const contraction = fineAbsoluteDifference / coarseAbsoluteDifference;
  if (!(contraction < 1)) throw new Error('Refinement differences must contract from coarse to fine.');
  if (contraction > gates.maximumContraction) {
    throw new Error(`Refinement contraction ${contraction} exceeds ${gates.maximumContraction}.`);
  }
  const apparentOrder = Math.log(coarseAbsoluteDifference / fineAbsoluteDifference)
    / Math.log(gates.refinementRatio);
  if (!Number.isFinite(apparentOrder) || apparentOrder < gates.minimumApparentOrder) {
    throw new Error(`Refinement apparent order ${apparentOrder} is below ${gates.minimumApparentOrder}.`);
  }
  const finestPairRelativeChange = fineAbsoluteDifference / Math.abs(quantities[2]!);
  if (finestPairRelativeChange > gates.maximumFinestPairRelativeChange) {
    throw new Error(
      `Refinement finest-pair relative change ${finestPairRelativeChange} exceeds ${gates.maximumFinestPairRelativeChange}.`,
    );
  }
  const richardsonDenominator = gates.refinementRatio ** apparentOrder - 1;
  if (!(richardsonDenominator > 0) || !Number.isFinite(richardsonDenominator)) {
    throw new Error('Refinement Richardson denominator must be finite and positive.');
  }
  const richardsonEstimate = quantities[2]! + fineDifference / richardsonDenominator;

  return Object.freeze({
    parameterName: input.parameterName,
    parameterUnits: input.parameterUnits,
    quantityUnits: input.quantityUnits,
    parameterValues: Object.freeze([...parameterValues]),
    quantities: Object.freeze([...quantities]),
    signedDifferences: Object.freeze([coarseDifference, fineDifference]) as readonly [number, number],
    absoluteDifferences: Object.freeze([coarseAbsoluteDifference, fineAbsoluteDifference]) as readonly [number, number],
    refinementRatio: gates.refinementRatio,
    contraction,
    apparentOrder,
    finestPairRelativeChange,
    richardsonEstimate,
    gates: Object.freeze({ ...gates }),
  });
}

export function validateRefinementDefinition(
  parameterValues: readonly number[],
  gates: RefinementTrendGates,
): void {
  if (parameterValues.length !== 3) {
    throw new Error('Refinement definition requires exactly three parameter values.');
  }
  if (!parameterValues.every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Refinement parameters must be finite and positive.');
  }
  if (!(gates.refinementRatio > 1) || !Number.isFinite(gates.refinementRatio)) {
    throw new Error('Refinement ratio must be finite and greater than one.');
  }
  if (!(gates.maximumContraction > 0) || !Number.isFinite(gates.maximumContraction)) {
    throw new Error('Maximum contraction must be finite and positive.');
  }
  if (!(gates.minimumApparentOrder >= 0) || !Number.isFinite(gates.minimumApparentOrder)) {
    throw new Error('Minimum apparent order must be finite and non-negative.');
  }
  if (!(gates.maximumFinestPairRelativeChange >= 0)
    || !Number.isFinite(gates.maximumFinestPairRelativeChange)) {
    throw new Error('Maximum finest-pair relative change must be finite and non-negative.');
  }

  const firstRatio = parameterValues[0]! / parameterValues[1]!;
  const secondRatio = parameterValues[1]! / parameterValues[2]!;
  if (Math.abs(firstRatio - gates.refinementRatio) > ratioTolerance
    || Math.abs(secondRatio - gates.refinementRatio) > ratioTolerance) {
    throw new Error(`Refinement parameters must decrease by ratio ${gates.refinementRatio}.`);
  }

}
