import type { EngineSnapshot } from '../core/types';
import type { MonodomainSolver } from '../numerics/MonodomainSolver';

export class StepRateMeter {
  private stepsSinceMeasurement = 0;
  private measuredStepsPerSecond = 0;
  private lastMeasurementAt: number;

  constructor(private readonly measurementPeriod: number, now: number) {
    if (!(measurementPeriod > 0) || !Number.isFinite(measurementPeriod)) {
      throw new Error('Performance measurement period must be finite and positive.');
    }
    this.lastMeasurementAt = validateNow(now);
  }

  recordSteps(count: number): void {
    if (!Number.isInteger(count) || count < 0) throw new Error('Recorded step count must be a non-negative integer.');
    this.stepsSinceMeasurement += count;
  }

  measure(now: number): number {
    const current = validateNow(now);
    const elapsed = current - this.lastMeasurementAt;
    if (elapsed < 0) throw new Error('Performance clock must be monotone.');
    if (elapsed >= this.measurementPeriod) {
      this.measuredStepsPerSecond = elapsed === 0 ? 0 : (this.stepsSinceMeasurement * 1000) / elapsed;
      this.stepsSinceMeasurement = 0;
      this.lastMeasurementAt = current;
    }
    return this.measuredStepsPerSecond;
  }

  reset(now: number): void {
    this.lastMeasurementAt = validateNow(now);
    this.stepsSinceMeasurement = 0;
    this.measuredStepsPerSecond = 0;
  }
}

export function createEngineSnapshot(
  solver: MonodomainSolver,
  ecgSample: number,
  simulationStepsPerSecond: number,
): EngineSnapshot {
  if (!Number.isFinite(ecgSample) || !(simulationStepsPerSecond >= 0)
    || !Number.isFinite(simulationStepsPerSecond)) {
    throw new Error('Snapshot signal and performance values must be finite and rate must be non-negative.');
  }
  return Object.freeze({
    width: solver.tissue.width,
    height: solver.tissue.height,
    dx: solver.tissue.dx,
    time: solver.time,
    voltage: new Float32Array(solver.voltage),
    tissueMask: new Uint8Array(solver.tissue.mask),
    ecgSample,
    lesions: Object.freeze(solver.lesions.map((lesion) => Object.freeze({ ...lesion }))),
    simulationStepsPerSecond,
    diagnostics: solver.diagnostics,
  });
}

function validateNow(now: number): number {
  if (!Number.isFinite(now)) throw new Error('Performance clock value must be finite.');
  return now;
}
