/**
 * Lightweight pseudo-ECG estimator based on the temporal change in tissue
 * voltage projected through a simple linear lead field.
 *
 * This is signal-derived rather than beat-template playback. It is still an
 * approximation and must not be treated as a validated forward ECG solution.
 */
export class PseudoEcg {
  private readonly weights: Float32Array;
  private previousVoltage: FloatingPointState;

  constructor(
    width: number,
    height: number,
    precision: StatePrecision,
    electrode: ElectrodeDefinitionV1,
  ) {
    const size = width * height;
    this.weights = new Float32Array(size);
    this.previousVoltage = createStateArray(precision, size);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const nx = x / Math.max(width - 1, 1);
        const ny = y / Math.max(height - 1, 1);
        this.weights[y * width + x] = (nx - 0.5) * electrode.normalizedXWeight
          + (ny - 0.5) * electrode.normalizedYWeight;
      }
    }
  }

  reset(voltage?: FloatingPointState): void {
    this.previousVoltage.fill(0);
    if (voltage) this.previousVoltage.set(voltage);
  }

  sample(voltage: FloatingPointState, mask: Uint8Array): number {
    if (voltage.length !== this.previousVoltage.length || mask.length !== voltage.length) {
      throw new Error('Pseudo-ECG arrays must have matching lengths.');
    }

    let sum = 0;
    let conductiveCount = 0;
    for (let index = 0; index < voltage.length; index += 1) {
      if (mask[index] === 0) continue;
      const current = voltage[index] ?? 0;
      const previous = this.previousVoltage[index] ?? 0;
      sum += (current - previous) * (this.weights[index] ?? 0);
      conductiveCount += 1;
      this.previousVoltage[index] = current;
    }

    return conductiveCount > 0 ? sum / conductiveCount : 0;
  }
}
import { createStateArray, type FloatingPointState } from '../numerics/FloatingPointState';
import type { StatePrecision } from '../core/types';
import type { ElectrodeDefinitionV1 } from '../definitions/types';
