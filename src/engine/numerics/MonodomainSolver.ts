import type { Lesion, SolverConfig, Stimulus } from '../core/types';
import { RectangularTissue } from '../geometry/RectangularTissue';
import { AlievPanfilovModel } from '../models/AlievPanfilov';
import { PseudoEcg } from '../signals/PseudoEcg';
import {
  copyNumericalDiagnostics,
  createNumericalDiagnostics,
  numericalSafeguards,
  type NumericalDiagnostics,
} from '../core/numericalDiagnostics';

export class MonodomainSolver {
  readonly tissue: RectangularTissue;
  readonly voltage: Float32Array;
  readonly recovery: Float32Array;
  readonly nextVoltage: Float32Array;
  readonly nextRecovery: Float32Array;
  readonly stableDt: number;
  readonly lesions: Lesion[] = [];

  time = 0;
  private readonly model: AlievPanfilovModel;
  private readonly ecg: PseudoEcg;
  private readonly diffusion: number;
  private readonly diagnosticCounts = createNumericalDiagnostics();

  constructor(readonly config: SolverConfig) {
    if (!(config.diffusion > 0) || !Number.isFinite(config.diffusion)) {
      throw new Error('Diffusion coefficient must be finite and greater than zero.');
    }
    if (!(config.requestedDt > 0) || !Number.isFinite(config.requestedDt)) {
      throw new Error('Requested timestep must be finite and greater than zero.');
    }

    this.tissue = new RectangularTissue(config.grid);
    this.model = new AlievPanfilovModel(config.model);
    this.diffusion = config.diffusion;
    this.voltage = new Float32Array(this.tissue.size);
    this.recovery = new Float32Array(this.tissue.size);
    this.nextVoltage = new Float32Array(this.tissue.size);
    this.nextRecovery = new Float32Array(this.tissue.size);
    this.ecg = new PseudoEcg(this.tissue.width, this.tissue.height);

    // Explicit five-point Laplacian stability limit in 2D.
    const diffusionLimit = (config.grid.dx * config.grid.dx) / (4 * config.diffusion);
    this.stableDt = Math.min(config.requestedDt, diffusionLimit * 0.9);
    if (!(this.stableDt > 0) || !Number.isFinite(this.stableDt)) {
      throw new Error('Unable to derive a stable timestep from the configuration.');
    }
  }

  get diagnostics(): NumericalDiagnostics {
    return copyNumericalDiagnostics({
      ...this.diagnosticCounts,
      denominatorGuardCount: this.model.diagnostics.denominatorGuardCount,
    });
  }

  reset(): void {
    this.voltage.fill(0);
    this.recovery.fill(0);
    this.nextVoltage.fill(0);
    this.nextRecovery.fill(0);
    this.tissue.mask.fill(1);
    this.lesions.length = 0;
    this.time = 0;
    this.ecg.reset();
    Object.assign(this.diagnosticCounts, createNumericalDiagnostics());
    this.model.resetDiagnostics();
  }

  applyRectangularStimulus(
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    amplitude: number,
  ): void {
    const startX = Math.max(0, Math.floor(Math.min(xMin, xMax)));
    const endX = Math.min(this.tissue.width - 1, Math.ceil(Math.max(xMin, xMax)));
    const startY = Math.max(0, Math.floor(Math.min(yMin, yMax)));
    const endY = Math.min(this.tissue.height - 1, Math.ceil(Math.max(yMin, yMax)));
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const index = this.tissue.index(x, y);
        if (this.tissue.mask[index] === 1) {
          this.voltage[index] = Math.max(this.voltage[index] ?? 0, amplitude);
        }
      }
    }
  }

  applyStimulus(stimulus: Stimulus): void {
    const radiusSquared = stimulus.radius * stimulus.radius;
    const minX = Math.max(0, Math.floor(stimulus.x - stimulus.radius));
    const maxX = Math.min(this.tissue.width - 1, Math.ceil(stimulus.x + stimulus.radius));
    const minY = Math.max(0, Math.floor(stimulus.y - stimulus.radius));
    const maxY = Math.min(this.tissue.height - 1, Math.ceil(stimulus.y + stimulus.radius));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - stimulus.x;
        const dy = y - stimulus.y;
        const index = this.tissue.index(x, y);
        if (dx * dx + dy * dy <= radiusSquared && this.tissue.mask[index] === 1) {
          this.voltage[index] = Math.max(this.voltage[index] ?? 0, stimulus.amplitude);
        }
      }
    }
  }

  createLesion(x: number, y: number, radius: number): Lesion {
    if (!(radius > 0) || !Number.isFinite(radius)) {
      throw new Error('Lesion radius must be finite and greater than zero.');
    }
    const lesion: Lesion = {
      id: `lesion-${this.lesions.length + 1}`,
      x,
      y,
      radius,
      createdAt: this.time,
    };
    this.lesions.push(lesion);
    this.tissue.ablateCircle(x, y, radius);
    for (let index = 0; index < this.tissue.size; index += 1) {
      if (this.tissue.mask[index] === 0) {
        this.voltage[index] = 0;
        this.recovery[index] = 0;
      }
    }
    return lesion;
  }

  addObstacle(x: number, y: number, radius: number): void {
    this.tissue.setCircularObstacle(x, y, radius);
  }

  step(): number {
    const { width, height, dx, mask } = this.tissue;
    const inverseDxSquared = 1 / (dx * dx);
    const dt = this.stableDt;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (mask[index] === 0) {
          this.nextVoltage[index] = 0;
          this.nextRecovery[index] = 0;
          continue;
        }

        const center = this.voltage[index] ?? 0;
        // No-flux boundaries are implemented by mirroring the centre value
        // when a neighbour is outside tissue or non-conductive.
        const leftIndex = x > 0 ? index - 1 : index;
        const rightIndex = x < width - 1 ? index + 1 : index;
        const upIndex = y > 0 ? index - width : index;
        const downIndex = y < height - 1 ? index + width : index;

        const left = mask[leftIndex] === 1 ? (this.voltage[leftIndex] ?? center) : center;
        const right = mask[rightIndex] === 1 ? (this.voltage[rightIndex] ?? center) : center;
        const up = mask[upIndex] === 1 ? (this.voltage[upIndex] ?? center) : center;
        const down = mask[downIndex] === 1 ? (this.voltage[downIndex] ?? center) : center;

        const laplacian = (left + right + up + down - 4 * center) * inverseDxSquared;
        const recovery = this.recovery[index] ?? 0;
        const [reactionU, reactionV] = this.model.derivatives(center, recovery);
        const nextU = center + dt * (reactionU + this.diffusion * laplacian);
        const nextV = recovery + dt * reactionV;

        if (!Number.isFinite(nextU) || !Number.isFinite(nextV)) {
          this.diagnosticCounts.nonFiniteStateCount += 1;
          throw new Error(`Non-finite solver state at cell ${index} and time ${this.time}.`);
        }

        if (nextU < numericalSafeguards.voltageMinimum) this.diagnosticCounts.voltageClipLowCount += 1;
        if (nextU > numericalSafeguards.voltageMaximum) this.diagnosticCounts.voltageClipHighCount += 1;
        if (nextV < numericalSafeguards.recoveryMinimum) this.diagnosticCounts.recoveryClipLowCount += 1;
        if (nextV > numericalSafeguards.recoveryMaximum) this.diagnosticCounts.recoveryClipHighCount += 1;
        this.nextVoltage[index] = Math.min(
          numericalSafeguards.voltageMaximum,
          Math.max(numericalSafeguards.voltageMinimum, nextU),
        );
        this.nextRecovery[index] = Math.min(
          numericalSafeguards.recoveryMaximum,
          Math.max(numericalSafeguards.recoveryMinimum, nextV),
        );
      }
    }

    this.voltage.set(this.nextVoltage);
    this.recovery.set(this.nextRecovery);
    this.time += dt;
    return this.ecg.sample(this.voltage, this.tissue.mask);
  }
}
