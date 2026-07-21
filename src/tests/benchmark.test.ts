import { describe, expect, it } from 'vitest';
import { defaultAlievPanfilovParameters } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';

describe('reference numerical benchmark', () => {
  it('records solver throughput without asserting a fake universal target', () => {
    const solver = new MonodomainSolver({
      grid: { width: 160, height: 104, dx: 1 },
      diffusion: 0.8,
      requestedDt: 0.08,
      stepsPerFrame: 8,
      model: defaultAlievPanfilovParameters,
    });
    solver.applyStimulus({ x: 20, y: 52, radius: 4, amplitude: 1 });

    const iterations = 100;
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) solver.step();
    const elapsedMs = performance.now() - startedAt;
    const stepsPerSecond = (iterations * 1000) / elapsedMs;

    console.info(`Reference CPU throughput: ${stepsPerSecond.toFixed(0)} solver steps/s on ${solver.tissue.width}x${solver.tissue.height}.`);
    expect(stepsPerSecond).toBeGreaterThan(0);
  });
});
