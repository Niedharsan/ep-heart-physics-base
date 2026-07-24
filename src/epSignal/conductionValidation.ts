import type { EpValidationIssue } from './contracts';
import {
  EP_CONDUCTION_SCHEMA_VERSION,
} from './conductionContracts';
import type {
  EpConductionArcDefinition,
  EpConductionDelayModel,
  EpConductionNetworkDefinition,
  EpConductionSimulationRequest,
  EpNodeRefractoryModel,
  EpPacingCaptureTarget,
} from './conductionContracts';

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function issue(
  severity: EpValidationIssue['severity'],
  code: string,
  path: string,
  message: string,
): EpValidationIssue {
  return Object.freeze({ severity, code, path, message });
}

function validateId(value: string, path: string, issues: EpValidationIssue[]): void {
  if (!ID_PATTERN.test(value)) {
    issues.push(issue('error', 'invalid-id', path, 'Use lowercase letters, numbers, dots, underscores or hyphens, starting with a letter or number.'));
  }
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateRefractoryModel(
  model: EpNodeRefractoryModel,
  path: string,
  issues: EpValidationIssue[],
): void {
  if (!isFiniteNonNegative(model.absoluteRefractoryPeriodMs)) {
    issues.push(issue('error', 'invalid-absolute-refractory-period', `${path}.absoluteRefractoryPeriodMs`, 'Absolute refractory period must be finite and non-negative.'));
  }
  if (model.relativeRefractoryPeriodMs !== undefined) {
    if (!isFiniteNonNegative(model.relativeRefractoryPeriodMs)) {
      issues.push(issue('error', 'invalid-relative-refractory-period', `${path}.relativeRefractoryPeriodMs`, 'Relative refractory period must be finite and non-negative.'));
    } else if (model.relativeRefractoryPeriodMs < model.absoluteRefractoryPeriodMs) {
      issues.push(issue('error', 'relative-before-absolute-refractory', `${path}.relativeRefractoryPeriodMs`, 'Relative refractory period cannot end before the absolute refractory period.'));
    }
  }
  if (
    model.relativeCaptureThresholdMultiplier !== undefined
    && (!isFinitePositive(model.relativeCaptureThresholdMultiplier)
      || model.relativeCaptureThresholdMultiplier < 1)
  ) {
    issues.push(issue('error', 'invalid-relative-capture-multiplier', `${path}.relativeCaptureThresholdMultiplier`, 'Relative-refractory capture multiplier must be finite and at least 1.'));
  }
  if (
    model.relativeCaptureThresholdMultiplier !== undefined
    && model.relativeRefractoryPeriodMs === undefined
  ) {
    issues.push(issue('error', 'relative-capture-without-relative-period', `${path}.relativeCaptureThresholdMultiplier`, 'A relative capture multiplier requires a relative refractory period.'));
  }
}

function validateDelayModel(
  model: EpConductionDelayModel,
  path: string,
  issues: EpValidationIssue[],
): void {
  switch (model.kind) {
    case 'fixed':
      if (!isFinitePositive(model.delayMs)) {
        issues.push(issue('error', 'invalid-fixed-delay', `${path}.delayMs`, 'Fixed conduction delay must be finite and greater than zero.'));
      }
      break;
    case 'recovery': {
      const fields = [
        ['minimumDelayMs', model.minimumDelayMs],
        ['recoveryTimeConstantMs', model.recoveryTimeConstantMs],
        ['maximumDelayMs', model.maximumDelayMs],
      ] as const;
      fields.forEach(([field, value]) => {
        if (!isFinitePositive(value)) {
          issues.push(issue('error', 'invalid-recovery-delay-parameter', `${path}.${field}`, `${field} must be finite and greater than zero.`));
        }
      });
      if (!isFiniteNonNegative(model.maximumAdditionalDelayMs)) {
        issues.push(issue('error', 'invalid-recovery-delay-parameter', `${path}.maximumAdditionalDelayMs`, 'maximumAdditionalDelayMs must be finite and non-negative.'));
      }
      if (model.maximumDelayMs < model.minimumDelayMs) {
        issues.push(issue('error', 'invalid-recovery-delay-range', `${path}.maximumDelayMs`, 'Maximum delay cannot be below minimum delay.'));
      }
      if (model.minimumDelayMs + model.maximumAdditionalDelayMs > model.maximumDelayMs + 1e-9) {
        issues.push(issue('warning', 'recovery-delay-clipped', path, 'The configured recovery term can exceed maximumDelayMs and will be clipped.'));
      }
      break;
    }
    case 'av-nodal-history': {
      const positiveFields = [
        ['minimumDelayMs', model.minimumDelayMs],
        ['recoveryTimeConstantMs', model.recoveryTimeConstantMs],
        ['fatigueDecayTimeConstantMs', model.fatigueDecayTimeConstantMs],
        ['facilitationWindowMs', model.facilitationWindowMs],
        ['maximumDelayMs', model.maximumDelayMs],
      ] as const;
      positiveFields.forEach(([field, value]) => {
        if (!isFinitePositive(value)) {
          issues.push(issue('error', 'invalid-av-nodal-delay-parameter', `${path}.${field}`, `${field} must be finite and greater than zero.`));
        }
      });
      const nonNegativeFields = [
        ['maximumRecoveryDelayMs', model.maximumRecoveryDelayMs],
        ['fatigueIncrementMs', model.fatigueIncrementMs],
        ['maximumFatigueMs', model.maximumFatigueMs],
        ['facilitationMagnitudeMs', model.facilitationMagnitudeMs],
      ] as const;
      nonNegativeFields.forEach(([field, value]) => {
        if (!isFiniteNonNegative(value)) {
          issues.push(issue('error', 'invalid-av-nodal-delay-parameter', `${path}.${field}`, `${field} must be finite and non-negative.`));
        }
      });
      if (model.maximumDelayMs < model.minimumDelayMs) {
        issues.push(issue('error', 'invalid-av-nodal-delay-range', `${path}.maximumDelayMs`, 'Maximum delay cannot be below minimum delay.'));
      }
      break;
    }
  }
}

function validateArc(
  arc: EpConductionArcDefinition,
  index: number,
  nodeIds: ReadonlySet<string>,
  issues: EpValidationIssue[],
): void {
  const path = `arcs[${index}]`;
  validateId(arc.id, `${path}.id`, issues);
  if (arc.label.trim() === '') {
    issues.push(issue('error', 'empty-arc-label', `${path}.label`, 'Conduction arc label cannot be empty.'));
  }
  if (!nodeIds.has(arc.fromNodeId)) {
    issues.push(issue('error', 'unknown-arc-source', `${path}.fromNodeId`, `Unknown source node: ${arc.fromNodeId}.`));
  }
  if (!nodeIds.has(arc.toNodeId)) {
    issues.push(issue('error', 'unknown-arc-target', `${path}.toNodeId`, `Unknown target node: ${arc.toNodeId}.`));
  }
  if (arc.fromNodeId === arc.toNodeId) {
    issues.push(issue('error', 'self-loop-arc', path, 'Self-loop arcs are not supported; use at least two nodes for a re-entry circuit.'));
  }
  if (!isFiniteNonNegative(arc.effectiveRefractoryPeriodMs)) {
    issues.push(issue('error', 'invalid-pathway-refractory-period', `${path}.effectiveRefractoryPeriodMs`, 'Pathway refractory period must be finite and non-negative.'));
  }
  validateDelayModel(arc.delay, `${path}.delay`, issues);
  if (arc.initialLastDepartureMs !== undefined && !Number.isFinite(arc.initialLastDepartureMs)) {
    issues.push(issue('error', 'invalid-initial-departure-time', `${path}.initialLastDepartureMs`, 'Initial departure time must be finite when provided.'));
  }
  if (arc.initialFatigueMs !== undefined && !isFiniteNonNegative(arc.initialFatigueMs)) {
    issues.push(issue('error', 'invalid-initial-fatigue', `${path}.initialFatigueMs`, 'Initial fatigue must be finite and non-negative.'));
  }
  if (arc.delay.kind !== 'av-nodal-history' && (arc.initialFatigueMs ?? 0) > 0) {
    issues.push(issue('error', 'fatigue-on-non-history-arc', `${path}.initialFatigueMs`, 'Initial fatigue is only valid for av-nodal-history delay models.'));
  }
  if (
    arc.delay.kind === 'av-nodal-history'
    && (arc.initialFatigueMs ?? 0) > arc.delay.maximumFatigueMs
  ) {
    issues.push(issue('error', 'initial-fatigue-above-maximum', `${path}.initialFatigueMs`, 'Initial fatigue cannot exceed maximumFatigueMs.'));
  }
}

export function validateConductionNetwork(
  network: EpConductionNetworkDefinition,
): readonly EpValidationIssue[] {
  const issues: EpValidationIssue[] = [];
  if (network.schemaVersion !== EP_CONDUCTION_SCHEMA_VERSION) {
    issues.push(issue('error', 'unsupported-conduction-schema-version', 'schemaVersion', `Expected conduction schema version ${EP_CONDUCTION_SCHEMA_VERSION}.`));
  }
  validateId(network.id, 'id', issues);
  if (network.title.trim() === '') {
    issues.push(issue('error', 'empty-network-title', 'title', 'Conduction network title cannot be empty.'));
  }
  if (!SEMVER_PATTERN.test(network.networkVersion)) {
    issues.push(issue('error', 'invalid-network-version', 'networkVersion', 'Network version must use semantic versioning.'));
  }
  if (network.nodes.length === 0) {
    issues.push(issue('error', 'missing-conduction-nodes', 'nodes', 'A conduction network requires at least one node.'));
  }

  const nodeIds = new Set<string>();
  network.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    validateId(node.id, `${path}.id`, issues);
    if (nodeIds.has(node.id)) {
      issues.push(issue('error', 'duplicate-node-id', `${path}.id`, `Duplicate node id: ${node.id}.`));
    }
    nodeIds.add(node.id);
    if (node.label.trim() === '') {
      issues.push(issue('error', 'empty-node-label', `${path}.label`, 'Conduction node label cannot be empty.'));
    }
    validateRefractoryModel(node.refractory, `${path}.refractory`, issues);
    if (node.initialLastActivationMs !== undefined && !Number.isFinite(node.initialLastActivationMs)) {
      issues.push(issue('error', 'invalid-initial-activation-time', `${path}.initialLastActivationMs`, 'Initial activation time must be finite when provided.'));
    }
  });

  const arcIds = new Set<string>();
  network.arcs.forEach((arc, index) => {
    validateArc(arc, index, nodeIds, issues);
    if (arcIds.has(arc.id)) {
      issues.push(issue('error', 'duplicate-arc-id', `arcs[${index}].id`, `Duplicate arc id: ${arc.id}.`));
    }
    arcIds.add(arc.id);
  });

  const connectedNodeIds = new Set<string>();
  network.arcs.forEach((arc) => {
    connectedNodeIds.add(arc.fromNodeId);
    connectedNodeIds.add(arc.toNodeId);
  });
  network.nodes.forEach((node, index) => {
    if (!connectedNodeIds.has(node.id) && network.nodes.length > 1) {
      issues.push(issue('warning', 'isolated-conduction-node', `nodes[${index}]`, `Node ${node.id} is isolated from the conduction graph.`));
    }
  });

  return Object.freeze(issues);
}

function validateCaptureTarget(
  target: EpPacingCaptureTarget,
  path: string,
  nodeIds: ReadonlySet<string>,
  issues: EpValidationIssue[],
): void {
  if (!nodeIds.has(target.nodeId)) {
    issues.push(issue('error', 'unknown-pacing-target', `${path}.nodeId`, `Unknown pacing target node: ${target.nodeId}.`));
  }
  if (!isFiniteNonNegative(target.latencyMs)) {
    issues.push(issue('error', 'invalid-pacing-latency', `${path}.latencyMs`, 'Pacing capture latency must be finite and non-negative.'));
  }
  if (!isFinitePositive(target.threshold.rheobaseMa)) {
    issues.push(issue('error', 'invalid-rheobase', `${path}.threshold.rheobaseMa`, 'Rheobase must be finite and greater than zero.'));
  }
  if (!isFinitePositive(target.threshold.chronaxieMs)) {
    issues.push(issue('error', 'invalid-chronaxie', `${path}.threshold.chronaxieMs`, 'Chronaxie must be finite and greater than zero.'));
  }
}

export function validateConductionSimulationRequest(
  request: EpConductionSimulationRequest,
): readonly EpValidationIssue[] {
  const issues = [...validateConductionNetwork(request.network)];
  if (!isFinitePositive(request.durationMs)) {
    issues.push(issue('error', 'invalid-conduction-duration', 'durationMs', 'Simulation duration must be finite and greater than zero.'));
  }
  if (
    request.maxProcessedQueueItems !== undefined
    && (!Number.isInteger(request.maxProcessedQueueItems) || request.maxProcessedQueueItems <= 0)
  ) {
    issues.push(issue('error', 'invalid-queue-limit', 'maxProcessedQueueItems', 'Queue limit must be a positive integer.'));
  }

  const nodeIds = new Set(request.network.nodes.map((node) => node.id));
  const sourceIds = new Set<string>();
  request.scheduledActivations.forEach((activation, index) => {
    const path = `scheduledActivations[${index}]`;
    validateId(activation.id, `${path}.id`, issues);
    if (sourceIds.has(activation.id)) {
      issues.push(issue('error', 'duplicate-source-id', `${path}.id`, `Duplicate source id: ${activation.id}.`));
    }
    sourceIds.add(activation.id);
    if (!nodeIds.has(activation.nodeId)) {
      issues.push(issue('error', 'unknown-scheduled-node', `${path}.nodeId`, `Unknown scheduled activation node: ${activation.nodeId}.`));
    }
    if (!Number.isFinite(activation.timeMs) || activation.timeMs < 0 || activation.timeMs > request.durationMs) {
      issues.push(issue('error', 'scheduled-activation-out-of-range', `${path}.timeMs`, 'Scheduled activation must lie within the simulation duration.'));
    }
    if (!Number.isInteger(activation.beatIndex) || activation.beatIndex < 0) {
      issues.push(issue('error', 'invalid-scheduled-beat-index', `${path}.beatIndex`, 'Beat index must be a non-negative integer.'));
    }
  });

  request.pacingStimuli.forEach((stimulus, index) => {
    const path = `pacingStimuli[${index}]`;
    validateId(stimulus.id, `${path}.id`, issues);
    if (sourceIds.has(stimulus.id)) {
      issues.push(issue('error', 'duplicate-source-id', `${path}.id`, `Duplicate source id: ${stimulus.id}.`));
    }
    sourceIds.add(stimulus.id);
    if (stimulus.siteId.trim() === '') {
      issues.push(issue('error', 'empty-pacing-site', `${path}.siteId`, 'Pacing site cannot be empty.'));
    }
    if (!Number.isFinite(stimulus.timeMs) || stimulus.timeMs < 0 || stimulus.timeMs > request.durationMs) {
      issues.push(issue('error', 'pacing-stimulus-out-of-range', `${path}.timeMs`, 'Pacing stimulus must lie within the simulation duration.'));
    }
    if (!Number.isInteger(stimulus.beatIndex) || stimulus.beatIndex < 0) {
      issues.push(issue('error', 'invalid-pacing-beat-index', `${path}.beatIndex`, 'Beat index must be a non-negative integer.'));
    }
    if (!isFinitePositive(stimulus.amplitudeMa)) {
      issues.push(issue('error', 'invalid-pacing-amplitude', `${path}.amplitudeMa`, 'Pacing amplitude must be finite and greater than zero.'));
    }
    if (!isFinitePositive(stimulus.pulseWidthMs)) {
      issues.push(issue('error', 'invalid-pulse-width', `${path}.pulseWidthMs`, 'Pulse width must be finite and greater than zero.'));
    }
    if (stimulus.targets.length === 0) {
      issues.push(issue('error', 'missing-pacing-targets', `${path}.targets`, 'A pacing stimulus requires at least one capture target.'));
    }
    const targetNodeIds = new Set<string>();
    stimulus.targets.forEach((target, targetIndex) => {
      validateCaptureTarget(target, `${path}.targets[${targetIndex}]`, nodeIds, issues);
      if (targetNodeIds.has(target.nodeId)) {
        issues.push(issue('error', 'duplicate-pacing-target', `${path}.targets[${targetIndex}].nodeId`, `Duplicate pacing target: ${target.nodeId}.`));
      }
      targetNodeIds.add(target.nodeId);
      if (stimulus.timeMs + target.latencyMs > request.durationMs) {
        issues.push(issue('warning', 'capture-outside-recording-window', `${path}.targets[${targetIndex}].latencyMs`, 'This target capture would occur beyond the requested simulation duration.'));
      }
    });
  });

  if (request.scheduledActivations.length === 0 && request.pacingStimuli.length === 0) {
    issues.push(issue('warning', 'missing-activation-sources', 'scheduledActivations', 'The simulation has no scheduled or paced activation source.'));
  }

  return Object.freeze(issues);
}

export class EpConductionValidationError extends Error {
  readonly issues: readonly EpValidationIssue[];

  constructor(message: string, issues: readonly EpValidationIssue[]) {
    super(message);
    this.name = 'EpConductionValidationError';
    this.issues = issues;
  }
}

export function assertValidConductionNetwork(network: EpConductionNetworkDefinition): void {
  const issues = validateConductionNetwork(network);
  if (issues.some((item) => item.severity === 'error')) {
    throw new EpConductionValidationError('EP conduction network failed validation.', issues);
  }
}

export function assertValidConductionSimulationRequest(
  request: EpConductionSimulationRequest,
): void {
  const issues = validateConductionSimulationRequest(request);
  if (issues.some((item) => item.severity === 'error')) {
    throw new EpConductionValidationError('EP conduction simulation request failed validation.', issues);
  }
}
