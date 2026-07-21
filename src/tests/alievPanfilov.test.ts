import { describe, expect, it } from 'vitest';
import type { ModelParameters } from '../engine/core/types';
import { hasStateClipping, numericalSafeguards } from '../engine/core/numericalDiagnostics';
import { AlievPanfilovModel, defaultAlievPanfilovParameters } from '../engine/models/AlievPanfilov';

const derivativeFixtures = [
  { state: [0, 0], expected: [0, 0] },
  { state: [0.01, 0.002], expected: [-0.0031880000000000003, 0.0010070967741935483] },
  { state: [0.4, 0.1], expected: [0.632, 0.08871428571428573] },
  { state: [1.1, 0.35], expected: [-1.309000000000001, 0.005399999999999967] },
  { state: [-0.19, 1.9], expected: [0.795112, -13.639222545454546] },
] as const;

describe('AlievPanfilovModel', () => {
  it('matches independently derived reaction derivatives', () => {
    const model = new AlievPanfilovModel(defaultAlievPanfilovParameters);
    for (const fixture of derivativeFixtures) {
      const actual = model.derivatives(fixture.state[0], fixture.state[1]);
      expect(actual[0]).toBeCloseTo(fixture.expected[0], 12);
      expect(actual[1]).toBeCloseTo(fixture.expected[1], 12);
    }
  });

  it('matches an independently derived custom-parameter fixture', () => {
    const model = new AlievPanfilovModel({ a: 0.1, b: 0.25, k: 7, epsilon: 0.005, mu1: 0.1, mu2: 0.4 });
    const [du, dv] = model.derivatives(0.75, 0.2);
    expect(du).toBeCloseTo(0.703125, 12);
    expect(dv).toBeCloseTo(0.05429891304347827, 12);
  });

  it('has an exact resting equilibrium and the documented subthreshold direction', () => {
    const model = new AlievPanfilovModel(defaultAlievPanfilovParameters);
    expect(model.derivatives(0, 0)).toEqual([-0, 0]);
    const [du, dv] = model.derivatives(0.01, 0);
    expect(du).toBeLessThan(0);
    expect(dv).toBeGreaterThan(0);
  });

  it('remains finite during a short unclipped model-only Euler trajectory', () => {
    const model = new AlievPanfilovModel(defaultAlievPanfilovParameters);
    let u = 0.2;
    let v = 0;
    const dt = 0.001;
    for (let step = 0; step < 10_000; step += 1) {
      const [du, dv] = model.derivatives(u, v);
      u += dt * du;
      v += dt * dv;
      expect(Number.isFinite(u) && Number.isFinite(v)).toBe(true);
    }
    expect(model.diagnostics.denominatorGuardCount).toBe(0);
  });

  it('counts the defensive denominator guard without disguising it as the published equation', () => {
    const model = new AlievPanfilovModel(defaultAlievPanfilovParameters);
    model.derivatives(-defaultAlievPanfilovParameters.mu2, 0.1);
    expect(model.diagnostics.denominatorGuardCount).toBe(1);
    model.resetDiagnostics();
    expect(model.diagnostics.denominatorGuardCount).toBe(0);
  });

  it('validates every project-supported parameter domain with named errors', () => {
    const invalid: Array<[keyof ModelParameters, number]> = [
      ['a', 0], ['a', 1], ['b', -1], ['k', 0], ['epsilon', 0], ['mu1', -1],
      ['mu2', numericalSafeguards.minimumSupportedMu2 - Number.EPSILON],
    ];
    for (const [name, value] of invalid) {
      expect(() => new AlievPanfilovModel({ ...defaultAlievPanfilovParameters, [name]: value }))
        .toThrow(new RegExp(`parameter ${name}`));
    }
    const names: Array<keyof ModelParameters> = ['a', 'b', 'k', 'epsilon', 'mu1', 'mu2'];
    for (const name of names) {
      for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(() => new AlievPanfilovModel({ ...defaultAlievPanfilovParameters, [name]: value }))
          .toThrow(new RegExp(`parameter ${name}`));
      }
      const missing = { ...defaultAlievPanfilovParameters } as Record<string, number>;
      delete missing[name];
      expect(() => new AlievPanfilovModel(missing as unknown as ModelParameters))
        .toThrow(new RegExp(`parameter ${name}`));
    }
  });

  it('accounts for Float32 storage at the accepted denominator boundary', () => {
    expect(() => new AlievPanfilovModel({
      ...defaultAlievPanfilovParameters,
      mu2: -numericalSafeguards.voltageMinimum + numericalSafeguards.denominatorFloor,
    })).toThrow(/parameter mu2/);
    const model = new AlievPanfilovModel({
      ...defaultAlievPanfilovParameters,
      mu2: numericalSafeguards.minimumSupportedMu2,
    });
    model.derivatives(Math.fround(numericalSafeguards.voltageMinimum), 0.1);
    expect(model.diagnostics.denominatorGuardCount).toBe(0);
  });

  it('detects aggregate clipping without treating other diagnostics as clipping', () => {
    const base = {
      denominatorGuardCount: 1,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 1,
    };
    expect(hasStateClipping(base)).toBe(false);
    for (const name of ['voltageClipLowCount', 'voltageClipHighCount', 'recoveryClipLowCount', 'recoveryClipHighCount'] as const) {
      expect(hasStateClipping({ ...base, [name]: 1 })).toBe(true);
    }
  });

  it('snapshots validated parameters so caller mutation cannot bypass validation', () => {
    const supplied = { ...defaultAlievPanfilovParameters };
    const model = new AlievPanfilovModel(supplied);
    supplied.mu2 = -1;
    expect(model.parameters.mu2).toBe(0.3);
    expect(Object.isFrozen(model.parameters)).toBe(true);
  });
});
