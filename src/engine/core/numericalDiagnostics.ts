export interface NumericalDiagnostics {
  readonly denominatorGuardCount: number;
  readonly voltageClipLowCount: number;
  readonly voltageClipHighCount: number;
  readonly recoveryClipLowCount: number;
  readonly recoveryClipHighCount: number;
  readonly nonFiniteStateCount: number;
}

export type MutableNumericalDiagnostics = {
  -readonly [Key in keyof NumericalDiagnostics]: NumericalDiagnostics[Key];
};

export interface NumericalStateExtrema {
  readonly voltageMinimum: number;
  readonly voltageMaximum: number;
  readonly recoveryMinimum: number;
  readonly recoveryMaximum: number;
}

export type MutableNumericalStateExtrema = {
  -readonly [Key in keyof NumericalStateExtrema]: NumericalStateExtrema[Key];
};

const denominatorFloor = 1e-6;
const voltageMinimum = -0.2;

export const numericalSafeguards = Object.freeze({
  denominatorFloor,
  voltageMinimum,
  voltageMaximum: 1.5,
  minimumSupportedMu2: denominatorFloor - Math.fround(voltageMinimum),
});

export function createNumericalDiagnostics(): MutableNumericalDiagnostics {
  return {
    denominatorGuardCount: 0,
    voltageClipLowCount: 0,
    voltageClipHighCount: 0,
    recoveryClipLowCount: 0,
    recoveryClipHighCount: 0,
    nonFiniteStateCount: 0,
  };
}

export function copyNumericalDiagnostics(value: NumericalDiagnostics): NumericalDiagnostics {
  return Object.freeze({ ...value });
}

export function createNumericalStateExtrema(): MutableNumericalStateExtrema {
  return {
    voltageMinimum: 0,
    voltageMaximum: 0,
    recoveryMinimum: 0,
    recoveryMaximum: 0,
  };
}

export function copyNumericalStateExtrema(value: NumericalStateExtrema): NumericalStateExtrema {
  return Object.freeze({ ...value });
}

export function hasStateClipping(value: NumericalDiagnostics): boolean {
  return value.voltageClipLowCount + value.voltageClipHighCount
    + value.recoveryClipLowCount + value.recoveryClipHighCount > 0;
}
