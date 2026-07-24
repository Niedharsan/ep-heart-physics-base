import type { EpValidationIssue } from './contracts';
import { EP_WAVEFORM_SCHEMA_VERSION } from './waveformContracts';
import type { EpActivationSourceDefinition, EpWaveformSynthesisDefinition } from './waveformContracts';

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function issue(code: string, path: string, message: string): EpValidationIssue {
  return Object.freeze({ severity: 'error', code, path, message });
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateSource(source: EpActivationSourceDefinition, index: number, issues: EpValidationIssue[]): void {
  const path = `sources[${index}]`;
  if (!ID_PATTERN.test(source.id)) issues.push(issue('invalid-waveform-source-id', `${path}.id`, 'Source identifiers must use lowercase letters, numbers, dots, underscores or hyphens.'));
  if (source.label.trim() === '') issues.push(issue('empty-waveform-source-label', `${path}.label`, 'Source labels cannot be empty.'));
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(source.positionMm[axis])) issues.push(issue('non-finite-waveform-source-position', `${path}.positionMm.${axis}`, 'Source positions must be finite.'));
    if (!Number.isFinite(source.dipoleDirection[axis])) issues.push(issue('non-finite-waveform-source-direction', `${path}.dipoleDirection.${axis}`, 'Dipole directions must be finite.'));
  }
  const norm = Math.hypot(source.dipoleDirection.x, source.dipoleDirection.y, source.dipoleDirection.z);
  if (!finitePositive(norm)) issues.push(issue('zero-waveform-source-direction', `${path}.dipoleDirection`, 'Dipole direction must have non-zero length.'));
  if (!Number.isFinite(source.amplitudeMv)) issues.push(issue('invalid-waveform-source-amplitude', `${path}.amplitudeMv`, 'Source amplitude must be finite.'));
  if (source.farFieldScale !== undefined && !Number.isFinite(source.farFieldScale)) issues.push(issue('invalid-far-field-scale', `${path}.farFieldScale`, 'Far-field scale must be finite.'));
  switch (source.kernel.kind) {
    case 'gaussian':
    case 'gaussian-derivative':
      if (!finitePositive(source.kernel.widthMs)) issues.push(issue('invalid-kernel-width', `${path}.kernel.widthMs`, 'Kernel width must be positive.'));
      break;
    case 'difference-of-gaussians':
      if (!finitePositive(source.kernel.narrowWidthMs) || !finitePositive(source.kernel.broadWidthMs)) issues.push(issue('invalid-kernel-width', `${path}.kernel`, 'Both kernel widths must be positive.'));
      if (source.kernel.broadWidthMs <= source.kernel.narrowWidthMs) issues.push(issue('invalid-kernel-order', `${path}.kernel.broadWidthMs`, 'Broad width must exceed narrow width.'));
      if (!Number.isFinite(source.kernel.broadScale)) issues.push(issue('invalid-broad-scale', `${path}.kernel.broadScale`, 'Broad scale must be finite.'));
      break;
  }
  if (source.surfaceLeadWeights) {
    for (const [lead, weight] of Object.entries(source.surfaceLeadWeights)) {
      if (lead.trim() === '' || !Number.isFinite(weight)) issues.push(issue('invalid-surface-lead-weight', `${path}.surfaceLeadWeights`, 'Surface lead names must be non-empty and weights finite.'));
    }
  }
}

export function validateEpWaveformModel(model: EpWaveformSynthesisDefinition): readonly EpValidationIssue[] {
  const issues: EpValidationIssue[] = [];
  if (model.schemaVersion !== EP_WAVEFORM_SCHEMA_VERSION) issues.push(issue('unsupported-waveform-schema-version', 'schemaVersion', `Expected waveform schema version ${EP_WAVEFORM_SCHEMA_VERSION}.`));
  if (!ID_PATTERN.test(model.id)) issues.push(issue('invalid-waveform-model-id', 'id', 'Model id is invalid.'));
  if (!SEMVER_PATTERN.test(model.modelVersion)) issues.push(issue('invalid-waveform-model-version', 'modelVersion', 'Model version must use semantic versioning.'));
  if (!finitePositive(model.conductivityScale)) issues.push(issue('invalid-conductivity-scale', 'conductivityScale', 'Conductivity scale must be positive.'));
  if (!finitePositive(model.minimumDistanceMm)) issues.push(issue('invalid-minimum-distance', 'minimumDistanceMm', 'Minimum distance must be positive.'));
  if (!Number.isFinite(model.stimulusArtifact.amplitudeMv)) issues.push(issue('invalid-stimulus-amplitude', 'stimulusArtifact.amplitudeMv', 'Stimulus artifact amplitude must be finite.'));
  if (!finitePositive(model.stimulusArtifact.decayTimeConstantMs)) issues.push(issue('invalid-stimulus-decay', 'stimulusArtifact.decayTimeConstantMs', 'Stimulus decay must be positive.'));
  if (!Number.isFinite(model.stimulusArtifact.oppositeLobeScale)) issues.push(issue('invalid-stimulus-opposite-lobe', 'stimulusArtifact.oppositeLobeScale', 'Opposite lobe scale must be finite.'));
  if (!Number.isFinite(model.stimulusArtifact.oppositeLobeDelayMs) || model.stimulusArtifact.oppositeLobeDelayMs < 0) issues.push(issue('invalid-stimulus-lobe-delay', 'stimulusArtifact.oppositeLobeDelayMs', 'Opposite lobe delay must be finite and non-negative.'));
  const ids = new Set<string>();
  model.sources.forEach((source, index) => {
    validateSource(source, index, issues);
    if (ids.has(source.id)) issues.push(issue('duplicate-waveform-source-id', `sources[${index}].id`, `Duplicate source id: ${source.id}.`));
    ids.add(source.id);
  });
  if (model.sources.length === 0) issues.push(issue('missing-waveform-sources', 'sources', 'At least one activation source is required.'));
  return issues;
}

export class EpWaveformValidationError extends Error {
  readonly issues: readonly EpValidationIssue[];
  constructor(issues: readonly EpValidationIssue[]) {
    super(issues.map((item) => `${item.code} at ${item.path}: ${item.message}`).join('\n'));
    this.name = 'EpWaveformValidationError';
    this.issues = issues;
  }
}

export function assertValidEpWaveformModel(model: EpWaveformSynthesisDefinition): void {
  const issues = validateEpWaveformModel(model);
  if (issues.some((item) => item.severity === 'error')) throw new EpWaveformValidationError(issues);
}
