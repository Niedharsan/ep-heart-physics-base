import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import {
  isCurrentPulseActive,
  writeRectangularStimulusCurrent,
} from '../engine/numerics/RectangularStimulusCurrent';

describe('finite-duration rectangular stimulus current', () => {
  it('uses an endpoint-exclusive integer-step pulse', () => {
    const active = Array.from({ length: 12 }, (_, step) => isCurrentPulseActive(step, 0, 10));
    expect(active.filter(Boolean)).toHaveLength(10);
    expect(active.slice(0, 10).every(Boolean)).toBe(true);
    expect(active[10]).toBe(false);
  });

  it('writes only conductive nodes in the requested rectangle', () => {
    const target = new Float64Array(20);
    const mask = new Uint8Array(20).fill(1);
    mask[7] = 0;
    writeRectangularStimulusCurrent(target, mask, 5, 4, {
      minimumX: 1, maximumX: 2, minimumY: 1, maximumY: 2,
    }, 5);
    expect(target[6]).toBe(5);
    expect(target[7]).toBe(0);
    expect(target[11]).toBe(5);
    expect(target[12]).toBe(5);
    expect(target.filter((value) => value !== 0)).toHaveLength(3);
  });

  it('adds dt times current to a resting uniform field on the first step', () => {
    const solver = new MonodomainSolver({
      grid: { width: 8, height: 8, dx: 1 },
      diffusion: 0.1,
      requestedDt: 0.02,
      stepsPerFrame: 1,
      statePrecision: 'float64',
      model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
    });
    const voltageSource = new Float64Array(solver.tissue.size);
    const recoverySource = new Float64Array(solver.tissue.size);
    writeRectangularStimulusCurrent(voltageSource, solver.tissue.mask, 8, 8, {
      minimumX: 0, maximumX: 7, minimumY: 0, maximumY: 7,
    }, 5);
    solver.step({ voltage: voltageSource, recovery: recoverySource });
    expect([...solver.voltage].every((value) => Math.abs(value - 0.1) < 1e-14)).toBe(true);
    expect([...solver.recovery].every((value) => value === 0)).toBe(true);
  });
});
