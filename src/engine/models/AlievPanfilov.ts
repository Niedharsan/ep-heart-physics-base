import type { ModelParameters } from '../core/types';
import {
  numericalSafeguards,
} from '../core/numericalDiagnostics';

export interface ReactionModelDiagnostics {
  readonly denominatorGuardCount: number;
}

/**
 * Reduced Aliev-Panfilov excitable-tissue model.
 *
 * State variables are dimensionless. This model is suitable for wave-dynamics
 * prototyping, but it is not a calibrated human ionic-current model.
 */
export class AlievPanfilovModel {
  readonly parameters: ModelParameters;
  private denominatorGuardCount = 0;

  constructor(parameters: ModelParameters) {
    validateParameters(parameters);
    this.parameters = Object.freeze({ ...parameters });
  }

  get diagnostics(): ReactionModelDiagnostics {
    return Object.freeze({ denominatorGuardCount: this.denominatorGuardCount });
  }

  resetDiagnostics(): void {
    this.denominatorGuardCount = 0;
  }

  derivatives(u: number, v: number): readonly [du: number, dv: number] {
    const { a, b, k, epsilon, mu1, mu2 } = this.parameters;
    const du = -k * u * (u - a) * (u - 1) - u * v;
    const rawDenominator = u + mu2;
    if (rawDenominator < numericalSafeguards.denominatorFloor) {
      this.denominatorGuardCount += 1;
    }
    const denominator = Math.max(rawDenominator, numericalSafeguards.denominatorFloor);
    const recoveryRate = epsilon + (mu1 * v) / denominator;
    const dv = recoveryRate * (-v - k * u * (u - b - 1));
    return [du, dv];
  }
}

function validateParameters(parameters: ModelParameters): void {
  const requiredParameters = ['a', 'b', 'k', 'epsilon', 'mu1', 'mu2'] as const;
  for (const name of requiredParameters) {
    if (!Number.isFinite(parameters[name])) throw new Error(`Aliev-Panfilov parameter ${name} must be finite.`);
  }
  if (!(parameters.a > 0 && parameters.a < 1)) {
    throw new Error('Aliev-Panfilov parameter a must be greater than 0 and less than 1.');
  }
  if (parameters.b < 0) throw new Error('Aliev-Panfilov parameter b must be greater than or equal to 0.');
  if (!(parameters.k > 0)) throw new Error('Aliev-Panfilov parameter k must be greater than 0.');
  if (!(parameters.epsilon > 0)) throw new Error('Aliev-Panfilov parameter epsilon must be greater than 0.');
  if (parameters.mu1 < 0) throw new Error('Aliev-Panfilov parameter mu1 must be greater than or equal to 0.');
  const minimumMu2 = numericalSafeguards.minimumSupportedMu2;
  if (parameters.mu2 < minimumMu2) {
    throw new Error(`Aliev-Panfilov parameter mu2 must be greater than or equal to ${minimumMu2}.`);
  }
}

export const defaultAlievPanfilovParameters: ModelParameters = Object.freeze({
  a: 0.05,
  b: 0.15,
  k: 8,
  epsilon: 0.01,
  mu1: 0.2,
  mu2: 0.3,
});
