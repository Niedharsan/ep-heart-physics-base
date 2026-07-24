function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number.`);
  }
}

export function sampleIntervalMs(sampleRateHz: number): number {
  assertFinitePositive('sampleRateHz', sampleRateHz);
  return 1000 / sampleRateHz;
}

export function sampleCountForDuration(durationMs: number, sampleRateHz: number): number {
  assertFinitePositive('durationMs', durationMs);
  assertFinitePositive('sampleRateHz', sampleRateHz);
  return Math.floor((durationMs * sampleRateHz) / 1000) + 1;
}

export function sampleTimeMs(sampleIndex: number, sampleRateHz: number): number {
  if (!Number.isInteger(sampleIndex) || sampleIndex < 0) {
    throw new Error('sampleIndex must be a non-negative integer.');
  }
  return sampleIndex * sampleIntervalMs(sampleRateHz);
}
