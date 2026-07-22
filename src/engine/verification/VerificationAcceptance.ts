import type { ObservedOrderReport } from './ObservedOrder';

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
