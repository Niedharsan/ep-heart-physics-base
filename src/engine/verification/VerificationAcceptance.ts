import type { ObservedOrderReport } from './ObservedOrder';
import type { NumericalDiagnostics } from '../core/numericalDiagnostics';
import type { RefinementTrendGates, RefinementTrendResult } from './ConvergenceTrend';

export interface VerificationGates {
  readonly requireContracting: boolean;
  readonly minimumPairwiseOrder: number;
  readonly maximumPairwiseOrder?: number;
}

export interface VerificationAcceptance {
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export function evaluateVerification(
  report: ObservedOrderReport,
  gates: VerificationGates,
): VerificationAcceptance {
  if (!Number.isFinite(gates.minimumPairwiseOrder)
    || (gates.maximumPairwiseOrder !== undefined && !Number.isFinite(gates.maximumPairwiseOrder))) {
    throw new Error('Verification order gates must be finite.');
  }
  const failures: string[] = [];
  if (gates.requireContracting && report.trend !== 'contracting') {
    failures.push(`expected a contracting trend, received ${report.trend}`);
  }
  report.pairwiseOrders.forEach((order, index) => {
    if (order === null) failures.push(`pair ${index} has undefined observed order`);
    else {
      if (order < gates.minimumPairwiseOrder) {
        failures.push(`pair ${index} order ${order} is below ${gates.minimumPairwiseOrder}`);
      }
      if (gates.maximumPairwiseOrder !== undefined && order > gates.maximumPairwiseOrder) {
        failures.push(`pair ${index} order ${order} exceeds ${gates.maximumPairwiseOrder}`);
      }
    }
  });
  return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures) });
}

export function evaluateRefinementTrend(
  report: RefinementTrendResult,
  gates: RefinementTrendGates,
): VerificationAcceptance {
  validateRefinementGates(gates);
  const failures: string[] = [];
  if (report.refinementRatio !== gates.refinementRatio) {
    failures.push(`report refinement ratio ${report.refinementRatio} does not match gate ${gates.refinementRatio}`);
  }
  if (report.trend !== 'monotone-contracting') {
    failures.push(`expected monotone-contracting quantities, received ${report.trend}`);
  }
  if (report.contraction === null) failures.push('contraction is undefined');
  else if (report.contraction > gates.maximumContraction) {
    failures.push(`contraction ${report.contraction} exceeds ${gates.maximumContraction}`);
  }
  if (report.apparentOrder === null) failures.push('apparent order is undefined');
  else if (report.apparentOrder < gates.minimumApparentOrder) {
    failures.push(`apparent order ${report.apparentOrder} is below ${gates.minimumApparentOrder}`);
  }
  if (report.finestPairRelativeChange > gates.maximumFinestPairRelativeChange) {
    failures.push(
      `finest-pair relative change ${report.finestPairRelativeChange} exceeds ${gates.maximumFinestPairRelativeChange}`,
    );
  }
  return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures) });
}

export function evaluateScientificDiagnostics(
  diagnostics: NumericalDiagnostics,
): VerificationAcceptance {
  const failures = Object.entries(diagnostics)
    .filter(([, count]) => count !== 0)
    .map(([name, count]) => `${name} must be zero, received ${count}`);
  return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures) });
}

export function evaluateRadialSymmetry(
  report: {
    readonly maximumRelativeSpeedDeviation: number;
    readonly activationSpreads: readonly [number, number];
  },
  gates: {
    readonly maximumDirectionalSpeedDeviation: number;
    readonly maximumOuterActivationSpread: number;
  },
): VerificationAcceptance {
  if (!(gates.maximumDirectionalSpeedDeviation >= 0)
    || !Number.isFinite(gates.maximumDirectionalSpeedDeviation)
    || !(gates.maximumOuterActivationSpread >= 0)
    || !Number.isFinite(gates.maximumOuterActivationSpread)) {
    throw new Error('Radial symmetry gates must be finite and non-negative.');
  }
  const failures: string[] = [];
  if (report.maximumRelativeSpeedDeviation > gates.maximumDirectionalSpeedDeviation) {
    failures.push(
      `directional-speed deviation ${report.maximumRelativeSpeedDeviation} exceeds ${gates.maximumDirectionalSpeedDeviation}`,
    );
  }
  if (report.activationSpreads[1] > gates.maximumOuterActivationSpread) {
    failures.push(`outer activation spread ${report.activationSpreads[1]} exceeds ${gates.maximumOuterActivationSpread}`);
  }
  return Object.freeze({ passed: failures.length === 0, failures: Object.freeze(failures) });
}

export function validateRefinementGates(gates: RefinementTrendGates): void {
  if (!(gates.refinementRatio > 1) || !Number.isFinite(gates.refinementRatio)) {
    throw new Error('Refinement ratio gate must be finite and greater than one.');
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
}
