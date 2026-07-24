import { EP_SIGNAL_SCHEMA_VERSION } from './contracts';
import type {
  CartesianPointMm,
  EpElectrodeContact,
  EpSignalChannelDefinition,
  EpSignalScenarioDefinition,
  EpValidationIssue,
  GeneratedEpSignalSet,
} from './contracts';
import { sampleCountForDuration } from './sampling';

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const UINT32_MAX = 0xffff_ffff;

function issue(
  severity: EpValidationIssue['severity'],
  code: string,
  path: string,
  message: string,
): EpValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateId(value: string, path: string, issues: EpValidationIssue[]): void {
  if (!ID_PATTERN.test(value)) {
    issues.push(issue('error', 'invalid-id', path, 'Use lowercase letters, numbers, dots, underscores or hyphens, starting with a letter or number.'));
  }
}

function validatePoint(point: CartesianPointMm, path: string, issues: EpValidationIssue[]): void {
  (['x', 'y', 'z'] as const).forEach((axis) => {
    if (!Number.isFinite(point[axis])) {
      issues.push(issue('error', 'non-finite-coordinate', `${path}.${axis}`, 'Electrode coordinates must be finite millimetre values.'));
    }
  });
}

function validateContact(contact: EpElectrodeContact, path: string, issues: EpValidationIssue[]): void {
  validateId(contact.id, `${path}.id`, issues);
  if (contact.label.trim() === '') {
    issues.push(issue('error', 'empty-electrode-label', `${path}.label`, 'Electrode labels cannot be empty.'));
  }
  validatePoint(contact.positionMm, `${path}.positionMm`, issues);
  if (contact.diameterMm !== undefined && !isFinitePositive(contact.diameterMm)) {
    issues.push(issue('error', 'invalid-electrode-diameter', `${path}.diameterMm`, 'Electrode diameter must be finite and greater than zero.'));
  }
}

function distanceMm(first: CartesianPointMm, second: CartesianPointMm): number {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function validateChannel(
  channel: EpSignalChannelDefinition,
  index: number,
  issues: EpValidationIssue[],
): void {
  const path = `channels[${index}]`;
  validateId(channel.id, `${path}.id`, issues);
  if (channel.label.trim() === '') {
    issues.push(issue('error', 'empty-channel-label', `${path}.label`, 'Channel labels cannot be empty.'));
  }
  if (channel.unit !== 'mV') {
    issues.push(issue('error', 'unsupported-signal-unit', `${path}.unit`, 'The phase-1 engine contract stores voltage channels in millivolts.'));
  }

  const expectedGeometry: Readonly<Record<EpSignalChannelDefinition['kind'], EpSignalChannelDefinition['geometry']['type']>> = {
    'surface-ecg': 'surface-lead',
    'unipolar-egm': 'unipolar',
    'bipolar-egm': 'bipolar',
    stimulus: 'stimulus',
    reference: 'reference',
  };
  if (channel.geometry.type !== expectedGeometry[channel.kind]) {
    issues.push(issue('error', 'channel-geometry-mismatch', `${path}.geometry`, `${channel.kind} channels require ${expectedGeometry[channel.kind]} geometry.`));
    return;
  }

  switch (channel.geometry.type) {
    case 'surface-lead':
      if (channel.geometry.leadName.trim() === '') {
        issues.push(issue('error', 'empty-lead-name', `${path}.geometry.leadName`, 'Surface lead names cannot be empty.'));
      }
      break;
    case 'unipolar':
      validateContact(channel.geometry.contact, `${path}.geometry.contact`, issues);
      if (channel.geometry.referenceLabel.trim() === '') {
        issues.push(issue('error', 'empty-reference-label', `${path}.geometry.referenceLabel`, 'Unipolar channels require a reference label.'));
      }
      break;
    case 'bipolar': {
      validateContact(channel.geometry.positive, `${path}.geometry.positive`, issues);
      validateContact(channel.geometry.negative, `${path}.geometry.negative`, issues);
      if (channel.geometry.positive.id === channel.geometry.negative.id) {
        issues.push(issue('error', 'duplicate-bipole-contact', `${path}.geometry`, 'A bipolar channel must use two distinct electrode contacts.'));
      }
      const spacingMm = distanceMm(channel.geometry.positive.positionMm, channel.geometry.negative.positionMm);
      if (!Number.isFinite(spacingMm) || spacingMm <= 0) {
        issues.push(issue('error', 'invalid-bipole-spacing', `${path}.geometry`, 'Bipolar contacts must occupy distinct finite positions.'));
      }
      break;
    }
    case 'stimulus':
      if (channel.geometry.contact) {
        validateContact(channel.geometry.contact, `${path}.geometry.contact`, issues);
      }
      break;
    case 'reference':
      if (channel.geometry.label.trim() === '') {
        issues.push(issue('error', 'empty-reference-name', `${path}.geometry.label`, 'Reference channel labels cannot be empty.'));
      }
      break;
  }
}

function validateAcquisition(scenario: EpSignalScenarioDefinition, issues: EpValidationIssue[]): void {
  const acquisition = scenario.acquisition;
  if (!isFinitePositive(acquisition.sampleRateHz)) {
    issues.push(issue('error', 'invalid-sample-rate', 'acquisition.sampleRateHz', 'Sample rate must be finite and greater than zero.'));
    return;
  }
  if (!isFinitePositive(acquisition.durationMs)) {
    issues.push(issue('error', 'invalid-duration', 'acquisition.durationMs', 'Recording duration must be finite and greater than zero.'));
  }
  const nyquistHz = acquisition.sampleRateHz / 2;
  if (!isFinitePositive(acquisition.lowPassHz) || acquisition.lowPassHz >= nyquistHz) {
    issues.push(issue('error', 'invalid-low-pass', 'acquisition.lowPassHz', 'Low-pass frequency must be positive and below the Nyquist frequency.'));
  }
  if (
    acquisition.highPassHz !== null
    && (!Number.isFinite(acquisition.highPassHz)
      || acquisition.highPassHz < 0
      || acquisition.highPassHz >= acquisition.lowPassHz)
  ) {
    issues.push(issue('error', 'invalid-high-pass', 'acquisition.highPassHz', 'High-pass frequency must be non-negative and below the low-pass frequency.'));
  }
  if (acquisition.notchHz !== null && acquisition.notchHz >= nyquistHz) {
    issues.push(issue('error', 'invalid-notch', 'acquisition.notchHz', 'Notch frequency must be below the Nyquist frequency.'));
  }
  if (!isFinitePositive(acquisition.display.sweepSpeedMmPerSecond)) {
    issues.push(issue('error', 'invalid-sweep-speed', 'acquisition.display.sweepSpeedMmPerSecond', 'Sweep speed must be finite and greater than zero.'));
  }
  if (!isFinitePositive(acquisition.display.gainMmPerMv)) {
    issues.push(issue('error', 'invalid-display-gain', 'acquisition.display.gainMmPerMv', 'Display gain must be finite and greater than zero.'));
  }
  if (!isFinitePositive(acquisition.display.minorGridMm) || !isFinitePositive(acquisition.display.majorGridMm)) {
    issues.push(issue('error', 'invalid-grid-spacing', 'acquisition.display', 'Grid spacing must be finite and greater than zero.'));
  } else if (acquisition.display.majorGridMm < acquisition.display.minorGridMm) {
    issues.push(issue('error', 'invalid-grid-order', 'acquisition.display.majorGridMm', 'Major grid spacing cannot be smaller than minor grid spacing.'));
  }

  const hasIntracardiacChannel = scenario.channels.some((channel) => (
    channel.kind === 'unipolar-egm' || channel.kind === 'bipolar-egm'
  ));
  if (hasIntracardiacChannel && acquisition.sampleRateHz < 1000) {
    issues.push(issue('warning', 'low-intracardiac-sample-rate', 'acquisition.sampleRateHz', 'Intracardiac scenarios should normally use at least 1000 Hz to preserve narrow deflections.'));
  }
  const hasSurfaceChannel = scenario.channels.some((channel) => channel.kind === 'surface-ecg');
  if (hasSurfaceChannel && acquisition.sampleRateHz < 500) {
    issues.push(issue('warning', 'low-surface-sample-rate', 'acquisition.sampleRateHz', 'Surface ECG scenarios should normally use at least 500 Hz for morphology and interval review.'));
  }
}

export function validateEpSignalScenario(scenario: EpSignalScenarioDefinition): readonly EpValidationIssue[] {
  const issues: EpValidationIssue[] = [];
  if (scenario.schemaVersion !== EP_SIGNAL_SCHEMA_VERSION) {
    issues.push(issue('error', 'unsupported-schema-version', 'schemaVersion', `Expected schema version ${EP_SIGNAL_SCHEMA_VERSION}.`));
  }
  validateId(scenario.id, 'id', issues);
  if (scenario.title.trim() === '') issues.push(issue('error', 'empty-title', 'title', 'Scenario title cannot be empty.'));
  if (scenario.description.trim() === '') issues.push(issue('error', 'empty-description', 'description', 'Scenario description cannot be empty.'));
  if (!Number.isInteger(scenario.deterministicSeed) || scenario.deterministicSeed < 0 || scenario.deterministicSeed > UINT32_MAX) {
    issues.push(issue('error', 'invalid-seed', 'deterministicSeed', 'The deterministic seed must be an unsigned 32-bit integer.'));
  }

  validateAcquisition(scenario, issues);

  const channelIds = new Set<string>();
  scenario.channels.forEach((channel, index) => {
    validateChannel(channel, index, issues);
    if (channelIds.has(channel.id)) {
      issues.push(issue('error', 'duplicate-channel-id', `channels[${index}].id`, `Duplicate channel id: ${channel.id}.`));
    }
    channelIds.add(channel.id);
  });
  if (scenario.channels.length === 0) {
    issues.push(issue('error', 'missing-channels', 'channels', 'A scenario must define at least one signal channel.'));
  }

  const eventIds = new Set<string>();
  const eventById = new Map<string, EpSignalScenarioDefinition['events'][number]>();
  scenario.events.forEach((event, index) => {
    const path = `events[${index}]`;
    validateId(event.id, `${path}.id`, issues);
    if (eventIds.has(event.id)) {
      issues.push(issue('error', 'duplicate-event-id', `${path}.id`, `Duplicate event id: ${event.id}.`));
    }
    eventIds.add(event.id);
    eventById.set(event.id, event);
    if (!Number.isFinite(event.timeMs) || event.timeMs < 0 || event.timeMs > scenario.acquisition.durationMs) {
      issues.push(issue('error', 'event-out-of-range', `${path}.timeMs`, 'Event time must lie within the recording duration.'));
    }
    if (!Number.isInteger(event.beatIndex) || event.beatIndex < 0) {
      issues.push(issue('error', 'invalid-beat-index', `${path}.beatIndex`, 'Beat index must be a non-negative integer.'));
    }
    event.channelIds?.forEach((channelId, channelIndex) => {
      if (!channelIds.has(channelId)) {
        issues.push(issue('error', 'unknown-event-channel', `${path}.channelIds[${channelIndex}]`, `Unknown channel id: ${channelId}.`));
      }
    });
  });

  const measurementIds = new Set<string>();
  scenario.measurements.forEach((measurement, index) => {
    const path = `measurements[${index}]`;
    validateId(measurement.id, `${path}.id`, issues);
    if (measurementIds.has(measurement.id)) {
      issues.push(issue('error', 'duplicate-measurement-id', `${path}.id`, `Duplicate measurement id: ${measurement.id}.`));
    }
    measurementIds.add(measurement.id);
    const startEvent = eventById.get(measurement.startEventId);
    const endEvent = eventById.get(measurement.endEventId);
    if (!startEvent) issues.push(issue('error', 'unknown-start-event', `${path}.startEventId`, `Unknown event id: ${measurement.startEventId}.`));
    if (!endEvent) issues.push(issue('error', 'unknown-end-event', `${path}.endEventId`, `Unknown event id: ${measurement.endEventId}.`));
    if (!Number.isFinite(measurement.expectedValueMs) || measurement.expectedValueMs < 0) {
      issues.push(issue('error', 'invalid-expected-measurement', `${path}.expectedValueMs`, 'Expected measurement must be finite and non-negative.'));
    }
    if (!isFinitePositive(measurement.toleranceMs)) {
      issues.push(issue('error', 'invalid-measurement-tolerance', `${path}.toleranceMs`, 'Measurement tolerance must be finite and greater than zero.'));
    }
    if (startEvent && endEvent) {
      const eventDifferenceMs = Math.abs(endEvent.timeMs - startEvent.timeMs);
      if (Math.abs(eventDifferenceMs - measurement.expectedValueMs) > 1e-9) {
        issues.push(issue('error', 'measurement-event-mismatch', `${path}.expectedValueMs`, `Expected ${measurement.expectedValueMs} ms but referenced events are ${eventDifferenceMs} ms apart.`));
      }
    }
    (['allowedStartChannelIds', 'allowedEndChannelIds'] as const).forEach((field) => {
      const ids = measurement[field];
      if (ids.length === 0) {
        issues.push(issue('error', 'missing-measurement-channels', `${path}.${field}`, 'Measurement endpoints require at least one allowed channel.'));
      }
      ids.forEach((channelId, channelIndex) => {
        if (!channelIds.has(channelId)) {
          issues.push(issue('error', 'unknown-measurement-channel', `${path}.${field}[${channelIndex}]`, `Unknown channel id: ${channelId}.`));
        }
      });
    });
  });

  if (!SEMVER_PATTERN.test(scenario.provenance.scenarioVersion)) {
    issues.push(issue('error', 'invalid-scenario-version', 'provenance.scenarioVersion', 'Scenario version must use semantic versioning.'));
  }
  if (!SEMVER_PATTERN.test(scenario.provenance.engineVersion)) {
    issues.push(issue('error', 'invalid-engine-version', 'provenance.engineVersion', 'Engine version must use semantic versioning.'));
  }
  if (scenario.provenance.engineModel.trim() === '') {
    issues.push(issue('error', 'empty-engine-model', 'provenance.engineModel', 'Engine model name cannot be empty.'));
  }
  const sourceIds = new Set<string>();
  scenario.provenance.sources.forEach((source, index) => {
    const path = `provenance.sources[${index}]`;
    validateId(source.id, `${path}.id`, issues);
    if (sourceIds.has(source.id)) {
      issues.push(issue('error', 'duplicate-source-id', `${path}.id`, `Duplicate source id: ${source.id}.`));
    }
    sourceIds.add(source.id);
    if (source.citation.trim() === '') {
      issues.push(issue('error', 'empty-source-citation', `${path}.citation`, 'Reference citations cannot be empty.'));
    }
  });
  if (scenario.provenance.sources.length === 0) {
    issues.push(issue('warning', 'missing-reference-sources', 'provenance.sources', 'Professional scenarios should record model, acquisition or clinical validation references.'));
  }

  return Object.freeze(issues);
}

export class EpSignalValidationError extends Error {
  readonly issues: readonly EpValidationIssue[];

  constructor(message: string, issues: readonly EpValidationIssue[]) {
    super(message);
    this.name = 'EpSignalValidationError';
    this.issues = issues;
  }
}

export function assertValidEpSignalScenario(scenario: EpSignalScenarioDefinition): void {
  const issues = validateEpSignalScenario(scenario);
  const errors = issues.filter((item) => item.severity === 'error');
  if (errors.length > 0) {
    throw new EpSignalValidationError(`EP signal scenario contains ${errors.length} validation error${errors.length === 1 ? '' : 's'}.`, issues);
  }
}

export function validateGeneratedEpSignalSet(
  generated: GeneratedEpSignalSet,
  scenario: EpSignalScenarioDefinition,
): readonly EpValidationIssue[] {
  const issues: EpValidationIssue[] = [];
  if (generated.schemaVersion !== EP_SIGNAL_SCHEMA_VERSION) {
    issues.push(issue('error', 'unsupported-generated-schema-version', 'schemaVersion', `Expected schema version ${EP_SIGNAL_SCHEMA_VERSION}.`));
  }
  if (generated.scenarioId !== scenario.id) {
    issues.push(issue('error', 'scenario-id-mismatch', 'scenarioId', 'Generated signal set does not belong to the supplied scenario.'));
  }
  if (generated.scenarioVersion !== scenario.provenance.scenarioVersion) {
    issues.push(issue('error', 'scenario-version-mismatch', 'scenarioVersion', 'Generated signal set uses a different scenario version.'));
  }
  if (generated.engineVersion !== scenario.provenance.engineVersion) {
    issues.push(issue('error', 'engine-version-mismatch', 'engineVersion', 'Generated signal set uses a different engine version.'));
  }
  if (generated.deterministicSeed !== scenario.deterministicSeed) {
    issues.push(issue('error', 'seed-mismatch', 'deterministicSeed', 'Generated signal set uses a different deterministic seed.'));
  }
  if (generated.sampleRateHz !== scenario.acquisition.sampleRateHz) {
    issues.push(issue('error', 'sample-rate-mismatch', 'sampleRateHz', 'Generated sample rate does not match the scenario.'));
  }
  if (generated.durationMs !== scenario.acquisition.durationMs) {
    issues.push(issue('error', 'duration-mismatch', 'durationMs', 'Generated duration does not match the scenario.'));
  }
  const expectedSampleCount = sampleCountForDuration(scenario.acquisition.durationMs, scenario.acquisition.sampleRateHz);
  if (generated.sampleCount !== expectedSampleCount) {
    issues.push(issue('error', 'sample-count-mismatch', 'sampleCount', `Expected ${expectedSampleCount} samples.`));
  }

  const expectedChannelIds = new Set(scenario.channels.map((channel) => channel.id));
  const generatedChannelIds = new Set<string>();
  generated.channels.forEach((channel, index) => {
    const path = `channels[${index}]`;
    if (generatedChannelIds.has(channel.channelId)) {
      issues.push(issue('error', 'duplicate-generated-channel', `${path}.channelId`, `Duplicate generated channel: ${channel.channelId}.`));
    }
    generatedChannelIds.add(channel.channelId);
    if (!expectedChannelIds.has(channel.channelId)) {
      issues.push(issue('error', 'unexpected-generated-channel', `${path}.channelId`, `Unexpected generated channel: ${channel.channelId}.`));
    }
    if (channel.unit !== 'mV') {
      issues.push(issue('error', 'unsupported-generated-unit', `${path}.unit`, 'Generated voltage channels must use millivolts.'));
    }
    if (!(channel.samples instanceof Float64Array)) {
      issues.push(issue('error', 'invalid-sample-storage', `${path}.samples`, 'Generated samples must be stored in Float64Array.'));
    } else {
      if (channel.samples.length !== expectedSampleCount) {
        issues.push(issue('error', 'channel-sample-count-mismatch', `${path}.samples`, `Expected ${expectedSampleCount} channel samples.`));
      }
      for (let sampleIndex = 0; sampleIndex < channel.samples.length; sampleIndex += 1) {
        const value = channel.samples[sampleIndex];
        if (value === undefined || !Number.isFinite(value)) {
          issues.push(issue('error', 'non-finite-sample', `${path}.samples[${sampleIndex}]`, 'Generated samples must all be finite.'));
          break;
        }
      }
    }
  });
  expectedChannelIds.forEach((channelId) => {
    if (!generatedChannelIds.has(channelId)) {
      issues.push(issue('error', 'missing-generated-channel', 'channels', `Missing generated channel: ${channelId}.`));
    }
  });

  return Object.freeze(issues);
}

export function assertValidGeneratedEpSignalSet(
  generated: GeneratedEpSignalSet,
  scenario: EpSignalScenarioDefinition,
): void {
  const issues = validateGeneratedEpSignalSet(generated, scenario);
  if (issues.some((item) => item.severity === 'error')) {
    throw new EpSignalValidationError('Generated EP signal set failed validation.', issues);
  }
}
