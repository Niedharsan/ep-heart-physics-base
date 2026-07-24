import type { EpRecorderProfile } from './acquisitionContracts';

export class EpAcquisitionValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid EP acquisition model: ${issues.join('; ')}`);
    this.name = 'EpAcquisitionValidationError';
  }
}

export function validateEpRecorderProfile(profile: EpRecorderProfile, sampleRateHz: number, lowPassHz: number, highPassHz: number | null, notchHz: 50 | 60 | null): readonly string[] {
  const issues: string[] = [];
  if (profile.version !== 1) issues.push('unsupported recorder version');
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(profile.id)) issues.push('invalid recorder id');
  if (!Number.isFinite(profile.inputRangeMv) || profile.inputRangeMv <= 0) issues.push('inputRangeMv must be positive');
  if (profile.resolutionBits !== null && (!Number.isInteger(profile.resolutionBits) || profile.resolutionBits < 8 || profile.resolutionBits > 32)) issues.push('resolutionBits must be null or an integer from 8 to 32');
  if (!Number.isFinite(lowPassHz) || lowPassHz <= 0 || lowPassHz >= sampleRateHz / 2) issues.push('lowPassHz must be positive and below Nyquist');
  if (highPassHz !== null && (!Number.isFinite(highPassHz) || highPassHz < 0 || highPassHz >= lowPassHz)) issues.push('highPassHz must be non-negative and below lowPassHz');
  if (notchHz !== null && notchHz >= sampleRateHz / 2) issues.push('notchHz must be below Nyquist');
  const noise = profile.noise;
  for (const [name, value] of Object.entries(noise)) {
    if (name === 'mainsPhaseRadians') continue;
    if (!Number.isFinite(value) || value < 0) issues.push(`${name} must be finite and non-negative`);
  }
  if (noise.baselineWanderAmplitudeMv > 0 && noise.baselineWanderHz <= 0) issues.push('baselineWanderHz must be positive when baseline wander is enabled');
  if (noise.mainsPhaseRadians !== undefined && !Number.isFinite(noise.mainsPhaseRadians)) issues.push('mainsPhaseRadians must be finite');
  return Object.freeze(issues);
}

export function assertValidEpRecorderProfile(profile: EpRecorderProfile, sampleRateHz: number, lowPassHz: number, highPassHz: number | null, notchHz: 50 | 60 | null): void {
  const issues = validateEpRecorderProfile(profile, sampleRateHz, lowPassHz, highPassHz, notchHz);
  if (issues.length) throw new EpAcquisitionValidationError(issues);
}
