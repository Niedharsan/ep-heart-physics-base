import type { EpValidationIssue, GeneratedEpSignalSet } from './contracts';
import type { EpSignalStripRenderProfile } from './renderingContracts';

const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function issue(code: string, path: string, message: string): EpValidationIssue {
  return { severity: 'error', code, path, message };
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function positive(
  issues: EpValidationIssue[],
  value: number,
  path: string,
  code: string,
): void {
  if (!finite(value) || value <= 0) {
    issues.push(issue(code, path, 'Must be a finite value greater than zero.'));
  }
}

function nonNegative(
  issues: EpValidationIssue[],
  value: number,
  path: string,
  code: string,
): void {
  if (!finite(value) || value < 0) {
    issues.push(issue(code, path, 'Must be a finite non-negative value.'));
  }
}

export function validateEpSignalStripRenderProfile(
  profile: EpSignalStripRenderProfile,
  signalSet: GeneratedEpSignalSet,
): readonly EpValidationIssue[] {
  const issues: EpValidationIssue[] = [];

  if (profile.schemaVersion !== 1) {
    issues.push(issue('renderer.version', 'profile.schemaVersion', 'Unsupported renderer schema version.'));
  }
  if (!ID_PATTERN.test(profile.id)) {
    issues.push(issue('renderer.id', 'profile.id', 'Use a stable lowercase identifier.'));
  }

  positive(issues, profile.paperSpeedMmPerSecond, 'profile.paperSpeedMmPerSecond', 'renderer.paper-speed');
  nonNegative(issues, profile.startTimeMs, 'profile.startTimeMs', 'renderer.start-time');
  positive(issues, profile.durationMs, 'profile.durationMs', 'renderer.duration');
  nonNegative(issues, profile.channelGapMm, 'profile.channelGapMm', 'renderer.channel-gap');
  nonNegative(
    issues,
    profile.minimumHorizontalStepMm,
    'profile.minimumHorizontalStepMm',
    'renderer.horizontal-step',
  );

  for (const [name, value] of Object.entries(profile.marginsMm)) {
    nonNegative(issues, value, `profile.marginsMm.${name}`, 'renderer.margin');
  }

  positive(issues, profile.grid.minorSpacingMm, 'profile.grid.minorSpacingMm', 'renderer.grid-minor');
  positive(issues, profile.grid.majorSpacingMm, 'profile.grid.majorSpacingMm', 'renderer.grid-major');
  if (
    finite(profile.grid.minorSpacingMm)
    && finite(profile.grid.majorSpacingMm)
    && profile.grid.minorSpacingMm > 0
    && profile.grid.majorSpacingMm > 0
  ) {
    const ratio = profile.grid.majorSpacingMm / profile.grid.minorSpacingMm;
    if (profile.grid.majorSpacingMm < profile.grid.minorSpacingMm || Math.abs(ratio - Math.round(ratio)) > 1e-9) {
      issues.push(issue(
        'renderer.grid-ratio',
        'profile.grid',
        'Major grid spacing must be an integer multiple of minor grid spacing.',
      ));
    }
  }

  positive(
    issues,
    profile.calibration.amplitudeMv,
    'profile.calibration.amplitudeMv',
    'renderer.calibration-amplitude',
  );
  nonNegative(
    issues,
    profile.calibration.leadInMs,
    'profile.calibration.leadInMs',
    'renderer.calibration-lead-in',
  );
  positive(
    issues,
    profile.calibration.plateauMs,
    'profile.calibration.plateauMs',
    'renderer.calibration-plateau',
  );
  nonNegative(
    issues,
    profile.calibration.leadOutMs,
    'profile.calibration.leadOutMs',
    'renderer.calibration-lead-out',
  );
  nonNegative(
    issues,
    profile.calibration.rightGapMm,
    'profile.calibration.rightGapMm',
    'renderer.calibration-gap',
  );

  if (profile.timeMarkerIntervalMs !== null) {
    positive(
      issues,
      profile.timeMarkerIntervalMs,
      'profile.timeMarkerIntervalMs',
      'renderer.time-marker-interval',
    );
  }

  if (!finite(signalSet.sampleRateHz) || signalSet.sampleRateHz <= 0) {
    issues.push(issue('renderer.sample-rate', 'signalSet.sampleRateHz', 'Signal sample rate must be positive and finite.'));
  }
  if (!Number.isInteger(signalSet.sampleCount) || signalSet.sampleCount < 2) {
    issues.push(issue('renderer.sample-count', 'signalSet.sampleCount', 'At least two samples are required.'));
  }
  if (!finite(signalSet.durationMs) || signalSet.durationMs <= 0) {
    issues.push(issue('renderer.signal-duration', 'signalSet.durationMs', 'Signal duration must be positive and finite.'));
  }

  const requestedEndMs = profile.startTimeMs + profile.durationMs;
  if (finite(requestedEndMs) && finite(signalSet.durationMs) && requestedEndMs > signalSet.durationMs + 1e-9) {
    issues.push(issue('renderer.window', 'profile.durationMs', 'Requested render window exceeds the signal duration.'));
  }

  if (profile.channels.length === 0) {
    issues.push(issue('renderer.channels-empty', 'profile.channels', 'At least one channel is required.'));
  }

  const sourceChannels = new Map(signalSet.channels.map((channel) => [channel.channelId, channel]));
  const configuredIds = new Set<string>();
  profile.channels.forEach((channel, index) => {
    const path = `profile.channels[${index}]`;
    if (configuredIds.has(channel.channelId)) {
      issues.push(issue('renderer.channel-duplicate', `${path}.channelId`, 'Channel ids must be unique.'));
    }
    configuredIds.add(channel.channelId);
    const source = sourceChannels.get(channel.channelId);
    if (!source) {
      issues.push(issue('renderer.channel-missing', `${path}.channelId`, 'Configured channel does not exist in the signal set.'));
    } else if (source.samples.length !== signalSet.sampleCount) {
      issues.push(issue('renderer.channel-length', `signalSet.channels.${channel.channelId}`, 'Channel length must equal signalSet.sampleCount.'));
    }
    if (!channel.label.trim()) {
      issues.push(issue('renderer.channel-label', `${path}.label`, 'Channel label must not be blank.'));
    }
    positive(issues, channel.gainMmPerMv, `${path}.gainMmPerMv`, 'renderer.channel-gain');
    positive(issues, channel.heightMm, `${path}.heightMm`, 'renderer.channel-height');
    positive(issues, channel.strokeWidthMm, `${path}.strokeWidthMm`, 'renderer.channel-stroke');
  });

  if (profile.calibration.enabled && profile.channels.length > 0) {
    const pulseWidthMm = profile.paperSpeedMmPerSecond
      * (profile.calibration.leadInMs + profile.calibration.plateauMs + profile.calibration.leadOutMs)
      / 1000;
    if (finite(pulseWidthMm) && profile.marginsMm.left + 1e-9 < pulseWidthMm + profile.calibration.rightGapMm) {
      issues.push(issue(
        'renderer.calibration-margin',
        'profile.marginsMm.left',
        'Left margin is too small for the configured calibration pulse.',
      ));
    }
  }

  return Object.freeze(issues);
}

export function assertValidEpSignalStripRenderProfile(
  profile: EpSignalStripRenderProfile,
  signalSet: GeneratedEpSignalSet,
): void {
  const issues = validateEpSignalStripRenderProfile(profile, signalSet);
  if (issues.length > 0) {
    const detail = issues.map((entry) => `${entry.path}: ${entry.message}`).join('; ');
    throw new Error(`Invalid EP signal render profile: ${detail}`);
  }
}
