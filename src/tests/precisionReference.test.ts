import { describe, expect, it } from 'vitest';
import { alievPanfilovPresets } from '../engine/models/AlievPanfilov';
import { MonodomainSolver } from '../engine/numerics/MonodomainSolver';
import { calculateErrorNorms } from '../engine/verification/ErrorNorms';
import type { StatePrecision } from '../engine/core/types';

function run(precision: StatePrecision): MonodomainSolver {
  const solver = new MonodomainSolver({
    grid: { width: 48, height: 32, dx: 1 },
    diffusion: 0.8,
    requestedDt: 0.08,
    model: alievPanfilovPresets.goktepeKuhl2009Figure4Generalized,
    statePrecision: precision,
  });
  solver.applyStimulus({ x: 8, y: 16, radius: 3, amplitude: 1 });
  for (let step = 0; step < 400; step += 1) solver.step();
  return solver;
}

describe('Float64 reference storage', () => {
  it('is deterministic within each precision and remains close across storage modes', () => {
    const float32 = run('float32');
    const float32Replay = run('float32');
    const float64 = run('float64');
    const float64Replay = run('float64');
    expect(float32.voltage).toBeInstanceOf(Float32Array);
    expect(float64.voltage).toBeInstanceOf(Float64Array);
    expect(float32Replay.voltage).toEqual(float32.voltage);
    expect(float32Replay.recovery).toEqual(float32.recovery);
    expect(float64Replay.voltage).toEqual(float64.voltage);
    expect(float64Replay.recovery).toEqual(float64.recovery);
    const voltageDifference = calculateErrorNorms(float32.voltage, float64.voltage);
    const recoveryDifference = calculateErrorNorms(float32.recovery, float64.recovery);
    expect(voltageDifference.rootMeanSquare).toBeLessThan(1e-5);
    expect(voltageDifference.maximumAbsolute).toBeLessThan(1e-4);
    expect(recoveryDifference.rootMeanSquare).toBeLessThan(1e-5);
    expect(recoveryDifference.maximumAbsolute).toBeLessThan(1e-4);
  });

  it('rejects malformed and non-finite manufactured sources', () => {
    const solver = run('float64');
    expect(() => solver.step({ voltage: [0], recovery: [0] })).toThrow(/match the tissue size/);
    const voltage = new Float64Array(solver.tissue.size);
    const recovery = new Float64Array(solver.tissue.size);
    voltage[3] = Number.NaN;
    expect(() => solver.step({ voltage, recovery })).toThrow(/source must be finite/);
  });

  it('rejects unsupported state precision at runtime boundaries', () => {
    expect(() => run('float16' as StatePrecision)).toThrow(/Unsupported state precision/);
  });
});
