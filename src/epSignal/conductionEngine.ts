import type {
  EpPhysiologicalEvent,
} from './contracts';
import type {
  EpActivationRecord,
  EpActivationRejection,
  EpActivationRejectionReason,
  EpActivationSourceKind,
  EpCaptureFailureReason,
  EpConductionArcDefinition,
  EpConductionArcStateSnapshot,
  EpConductionDelayModel,
  EpConductionNodeDefinition,
  EpConductionNodeStateSnapshot,
  EpConductionSimulationRequest,
  EpConductionTimeline,
  EpPacingCaptureResult,
  EpPacingCaptureTarget,
  EpPacingStimulus,
  EpPropagationRecord,
  EpPropagationStatus,
  EpStrengthDurationModel,
} from './conductionContracts';
import { assertValidConductionSimulationRequest } from './conductionValidation';

const EPSILON_MS = 1e-9;
const DEFAULT_MAX_QUEUE_ITEMS = 100_000;

interface MutableNodeState {
  lastActivationMs: number | null;
  activationCount: number;
}

interface MutableArcState {
  lastDepartureMs: number | null;
  propagationCount: number;
  fatigueMs: number;
}

interface MutablePropagationRecord {
  id: string;
  arcId: string;
  sourceActivationId: string;
  fromNodeId: string;
  toNodeId: string;
  departureTimeMs: number;
  arrivalTimeMs: number | null;
  delayMs: number | null;
  status: EpPropagationStatus;
}

interface PendingPacingCapture {
  readonly stimulus: EpPacingStimulus;
  readonly target: EpPacingCaptureTarget;
  readonly nominalThresholdMa: number;
}

interface PendingActivation {
  readonly timeMs: number;
  readonly order: number;
  readonly nodeId: string;
  readonly beatIndex: number;
  readonly sourceKind: EpActivationSourceKind;
  readonly sourceId: string;
  readonly parentPropagationId?: string;
  readonly pacing?: PendingPacingCapture;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

class StableActivationQueue {
  private readonly items: PendingActivation[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: PendingActivation): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentItem = this.items[parent];
      if (parentItem === undefined || !this.precedes(item, parentItem)) break;
      this.items[index] = parentItem;
      index = parent;
    }
    this.items[index] = item;
  }

  pop(): PendingActivation | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (first === undefined || last === undefined || this.items.length === 0) {
      return first;
    }

    this.items[0] = last;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let next = index;
      const nextItem = this.items[next];
      const leftItem = this.items[left];
      const rightItem = this.items[right];
      if (leftItem !== undefined && nextItem !== undefined && this.precedes(leftItem, nextItem)) {
        next = left;
      }
      const currentBest = this.items[next];
      if (rightItem !== undefined && currentBest !== undefined && this.precedes(rightItem, currentBest)) {
        next = right;
      }
      if (next === index) break;
      const current = this.items[index];
      const swap = this.items[next];
      if (current === undefined || swap === undefined) break;
      this.items[index] = swap;
      this.items[next] = current;
      index = next;
    }
    return first;
  }

  private precedes(first: PendingActivation, second: PendingActivation): boolean {
    return first.timeMs < second.timeMs
      || (Math.abs(first.timeMs - second.timeMs) <= EPSILON_MS && first.order < second.order);
  }
}

export class EpConductionSimulationLimitError extends Error {
  readonly processedQueueItems: number;
  readonly maximumQueueItems: number;

  constructor(processedQueueItems: number, maximumQueueItems: number) {
    super(`EP conduction simulation exceeded its ${maximumQueueItems} item safety limit.`);
    this.name = 'EpConductionSimulationLimitError';
    this.processedQueueItems = processedQueueItems;
    this.maximumQueueItems = maximumQueueItems;
  }
}

export function strengthDurationThresholdMa(
  model: EpStrengthDurationModel,
  pulseWidthMs: number,
): number {
  if (!Number.isFinite(model.rheobaseMa) || model.rheobaseMa <= 0) {
    throw new Error('rheobaseMa must be finite and greater than zero.');
  }
  if (!Number.isFinite(model.chronaxieMs) || model.chronaxieMs <= 0) {
    throw new Error('chronaxieMs must be finite and greater than zero.');
  }
  if (!Number.isFinite(pulseWidthMs) || pulseWidthMs <= 0) {
    throw new Error('pulseWidthMs must be finite and greater than zero.');
  }
  return model.rheobaseMa * (1 + model.chronaxieMs / pulseWidthMs);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

interface ArcDelayResult {
  readonly delayMs: number;
  readonly nextFatigueMs: number;
}

function recoveryIntervalMs(state: MutableArcState, departureTimeMs: number): number {
  return state.lastDepartureMs === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, departureTimeMs - state.lastDepartureMs);
}

function delayForArc(
  arc: EpConductionArcDefinition,
  state: MutableArcState,
  departureTimeMs: number,
): ArcDelayResult {
  const intervalMs = recoveryIntervalMs(state, departureTimeMs);
  const model: EpConductionDelayModel = arc.delay;
  switch (model.kind) {
    case 'fixed':
      return { delayMs: model.delayMs, nextFatigueMs: 0 };
    case 'recovery': {
      const recoveryDelayMs = Number.isFinite(intervalMs)
        ? model.maximumAdditionalDelayMs * Math.exp(
          -Math.max(0, intervalMs - arc.effectiveRefractoryPeriodMs) / model.recoveryTimeConstantMs,
        )
        : 0;
      return {
        delayMs: clamp(
          model.minimumDelayMs + recoveryDelayMs,
          model.minimumDelayMs,
          model.maximumDelayMs,
        ),
        nextFatigueMs: 0,
      };
    }
    case 'av-nodal-history': {
      const decayedFatigueMs = Number.isFinite(intervalMs)
        ? state.fatigueMs * Math.exp(-intervalMs / model.fatigueDecayTimeConstantMs)
        : 0;
      const recoveryDelayMs = Number.isFinite(intervalMs)
        ? model.maximumRecoveryDelayMs * Math.exp(
          -Math.max(0, intervalMs - arc.effectiveRefractoryPeriodMs) / model.recoveryTimeConstantMs,
        )
        : 0;
      const facilitationMs = Number.isFinite(intervalMs) && intervalMs < model.facilitationWindowMs
        ? model.facilitationMagnitudeMs * (1 - intervalMs / model.facilitationWindowMs)
        : 0;
      return {
        delayMs: clamp(
          model.minimumDelayMs + recoveryDelayMs + decayedFatigueMs - facilitationMs,
          model.minimumDelayMs,
          model.maximumDelayMs,
        ),
        nextFatigueMs: Math.min(
          model.maximumFatigueMs,
          decayedFatigueMs + model.fatigueIncrementMs,
        ),
      };
    }
  }
}

function frozenAttributes(
  ...sources: ReadonlyArray<Readonly<Record<string, string | number | boolean>> | undefined>
): Readonly<Record<string, string | number | boolean>> {
  return Object.freeze(Object.assign({}, ...sources.filter((source) => source !== undefined)));
}

function immutablePropagation(record: MutablePropagationRecord): EpPropagationRecord {
  return Object.freeze({ ...record });
}

function blockEvent(
  id: string,
  timeMs: number,
  beatIndex: number,
  arc: EpConductionArcDefinition,
  status: EpPropagationStatus,
): EpPhysiologicalEvent {
  return Object.freeze({
    id,
    kind: 'conduction-block',
    timeMs,
    beatIndex,
    siteId: arc.toNodeId,
    attributes: Object.freeze({
      arcId: arc.id,
      fromNodeId: arc.fromNodeId,
      toNodeId: arc.toNodeId,
      status,
    }),
  });
}

function captureEvent(
  id: string,
  stimulus: EpPacingStimulus,
  targetNodeId: string,
  timeMs: number,
  captured: boolean,
  effectiveThresholdMa: number,
  failureReason?: EpCaptureFailureReason,
): EpPhysiologicalEvent {
  return Object.freeze({
    id,
    kind: 'capture-transition',
    timeMs,
    beatIndex: stimulus.beatIndex,
    siteId: targetNodeId,
    attributes: frozenAttributes(
      {
        stimulusId: stimulus.id,
        captured,
        amplitudeMa: stimulus.amplitudeMa,
        pulseWidthMs: stimulus.pulseWidthMs,
        effectiveThresholdMa,
      },
      failureReason === undefined ? undefined : { failureReason },
    ),
  });
}

function nodeEvent(
  id: string,
  node: EpConductionNodeDefinition,
  activation: EpActivationRecord,
  attributes?: Readonly<Record<string, string | number | boolean>>,
): EpPhysiologicalEvent {
  return Object.freeze({
    id,
    kind: node.eventKind,
    timeMs: activation.timeMs,
    beatIndex: activation.beatIndex,
    siteId: node.siteId ?? node.id,
    channelIds: node.channelIds,
    attributes: frozenAttributes(
      node.attributes,
      attributes,
      {
        activationId: activation.id,
        nodeId: node.id,
        sourceKind: activation.sourceKind,
        sourceId: activation.sourceId,
      },
    ),
  });
}

function pacingCaptureResult(
  pacing: PendingPacingCapture,
  captureTimeMs: number,
  effectiveThresholdMa: number,
  captured: boolean,
  failureReason?: EpCaptureFailureReason,
): EpPacingCaptureResult {
  return Object.freeze({
    stimulusId: pacing.stimulus.id,
    targetNodeId: pacing.target.nodeId,
    captureTimeMs,
    nominalThresholdMa: pacing.nominalThresholdMa,
    effectiveThresholdMa,
    captured,
    ...(failureReason === undefined ? {} : { failureReason }),
  });
}

export function simulateConduction(
  request: EpConductionSimulationRequest,
): EpConductionTimeline {
  assertValidConductionSimulationRequest(request);

  const nodesById = new Map(request.network.nodes.map((node) => [node.id, node]));
  const arcsById = new Map(request.network.arcs.map((arc) => [arc.id, arc]));
  const outgoingByNode = new Map<string, EpConductionArcDefinition[]>();
  request.network.nodes.forEach((node) => outgoingByNode.set(node.id, []));
  request.network.arcs.forEach((arc) => {
    const outgoing = outgoingByNode.get(arc.fromNodeId);
    outgoing?.push(arc);
  });
  outgoingByNode.forEach((arcs) => arcs.sort((first, second) => first.id.localeCompare(second.id)));

  const nodeStates = new Map<string, MutableNodeState>();
  request.network.nodes.forEach((node) => {
    nodeStates.set(node.id, {
      lastActivationMs: node.initialLastActivationMs ?? null,
      activationCount: 0,
    });
  });
  const arcStates = new Map<string, MutableArcState>();
  request.network.arcs.forEach((arc) => {
    arcStates.set(arc.id, {
      lastDepartureMs: arc.initialLastDepartureMs ?? null,
      propagationCount: 0,
      fatigueMs: arc.initialFatigueMs ?? 0,
    });
  });

  const queue = new StableActivationQueue();
  const activations: EpActivationRecord[] = [];
  const rejectedActivations: EpActivationRejection[] = [];
  const mutablePropagations: MutablePropagationRecord[] = [];
  const propagationById = new Map<string, MutablePropagationRecord>();
  const captures: EpPacingCaptureResult[] = [];
  const physiologicalEvents: EpPhysiologicalEvent[] = [];
  let queueOrder = 0;
  let activationCounter = 0;
  let rejectionCounter = 0;
  let propagationCounter = 0;
  let eventCounter = 0;

  const nextEventId = (prefix: string): string => {
    eventCounter += 1;
    return `${prefix}.${eventCounter.toString().padStart(6, '0')}`;
  };

  [...request.scheduledActivations]
    .sort((first, second) => first.timeMs - second.timeMs || first.id.localeCompare(second.id))
    .forEach((scheduled) => {
      queueOrder += 1;
      queue.push({
        timeMs: scheduled.timeMs,
        order: queueOrder,
        nodeId: scheduled.nodeId,
        beatIndex: scheduled.beatIndex,
        sourceKind: 'scheduled',
        sourceId: scheduled.id,
        attributes: frozenAttributes(scheduled.attributes, { origin: scheduled.origin }),
      });
    });

  [...request.pacingStimuli]
    .sort((first, second) => first.timeMs - second.timeMs || first.id.localeCompare(second.id))
    .forEach((stimulus) => {
      physiologicalEvents.push(Object.freeze({
        id: nextEventId('stimulus'),
        kind: 'pacing-stimulus',
        timeMs: stimulus.timeMs,
        beatIndex: stimulus.beatIndex,
        siteId: stimulus.siteId,
        channelIds: stimulus.channelIds,
        attributes: frozenAttributes(stimulus.attributes, {
          stimulusId: stimulus.id,
          amplitudeMa: stimulus.amplitudeMa,
          pulseWidthMs: stimulus.pulseWidthMs,
        }),
      }));

      [...stimulus.targets]
        .sort((first, second) => first.nodeId.localeCompare(second.nodeId))
        .forEach((target) => {
          const nominalThresholdMa = strengthDurationThresholdMa(target.threshold, stimulus.pulseWidthMs);
          const captureTimeMs = stimulus.timeMs + target.latencyMs;
          if (captureTimeMs > request.durationMs) return;
          const pacing: PendingPacingCapture = { stimulus, target, nominalThresholdMa };
          if (stimulus.amplitudeMa + EPSILON_MS < nominalThresholdMa) {
            captures.push(pacingCaptureResult(
              pacing,
              captureTimeMs,
              nominalThresholdMa,
              false,
              'subthreshold',
            ));
            physiologicalEvents.push(captureEvent(
              nextEventId('capture'),
              stimulus,
              target.nodeId,
              captureTimeMs,
              false,
              nominalThresholdMa,
              'subthreshold',
            ));
            return;
          }
          queueOrder += 1;
          queue.push({
            timeMs: captureTimeMs,
            order: queueOrder,
            nodeId: target.nodeId,
            beatIndex: stimulus.beatIndex,
            sourceKind: 'pacing',
            sourceId: stimulus.id,
            pacing,
            attributes: frozenAttributes(stimulus.attributes, {
              amplitudeMa: stimulus.amplitudeMa,
              pulseWidthMs: stimulus.pulseWidthMs,
            }),
          });
        });
    });

  const maximumQueueItems = request.maxProcessedQueueItems ?? DEFAULT_MAX_QUEUE_ITEMS;
  let processedQueueItems = 0;

  while (queue.size > 0) {
    processedQueueItems += 1;
    if (processedQueueItems > maximumQueueItems) {
      throw new EpConductionSimulationLimitError(processedQueueItems, maximumQueueItems);
    }
    const pending = queue.pop();
    if (pending === undefined) break;
    if (pending.timeMs > request.durationMs) continue;

    const node = nodesById.get(pending.nodeId);
    const state = nodeStates.get(pending.nodeId);
    if (node === undefined || state === undefined) {
      throw new Error(`Validated conduction node disappeared during simulation: ${pending.nodeId}.`);
    }

    const elapsedSinceActivationMs = state.lastActivationMs === null
      ? Number.POSITIVE_INFINITY
      : pending.timeMs - state.lastActivationMs;
    const isSimultaneousCollision = state.lastActivationMs !== null
      && Math.abs(elapsedSinceActivationMs) <= EPSILON_MS;
    const isAbsolutelyRefractory = state.lastActivationMs !== null
      && elapsedSinceActivationMs < node.refractory.absoluteRefractoryPeriodMs - EPSILON_MS;

    let rejectionReason: EpActivationRejectionReason | undefined;
    let pacingFailureReason: EpCaptureFailureReason | undefined;
    let effectiveCaptureThresholdMa = pending.pacing?.nominalThresholdMa ?? 0;

    if (isSimultaneousCollision) {
      rejectionReason = 'simultaneous-collision';
      pacingFailureReason = 'node-refractory';
    } else if (isAbsolutelyRefractory) {
      rejectionReason = 'node-refractory';
      pacingFailureReason = 'node-refractory';
    } else if (
      pending.pacing !== undefined
      && state.lastActivationMs !== null
      && node.refractory.relativeRefractoryPeriodMs !== undefined
      && elapsedSinceActivationMs < node.refractory.relativeRefractoryPeriodMs - EPSILON_MS
    ) {
      const multiplier = node.refractory.relativeCaptureThresholdMultiplier ?? 1;
      effectiveCaptureThresholdMa = pending.pacing.nominalThresholdMa * multiplier;
      if (pending.pacing.stimulus.amplitudeMa + EPSILON_MS < effectiveCaptureThresholdMa) {
        rejectionReason = 'relative-refractory-capture-threshold';
        pacingFailureReason = 'relative-refractory-threshold';
      }
    }

    if (rejectionReason !== undefined) {
      rejectionCounter += 1;
      const rejection: EpActivationRejection = Object.freeze({
        id: `rejection.${rejectionCounter.toString().padStart(6, '0')}`,
        nodeId: pending.nodeId,
        timeMs: pending.timeMs,
        beatIndex: pending.beatIndex,
        sourceKind: pending.sourceKind,
        sourceId: pending.sourceId,
        reason: rejectionReason,
        ...(pending.parentPropagationId === undefined
          ? {}
          : { parentPropagationId: pending.parentPropagationId }),
      });
      rejectedActivations.push(rejection);

      if (pending.parentPropagationId !== undefined) {
        const propagation = propagationById.get(pending.parentPropagationId);
        const arc = propagation === undefined ? undefined : arcsById.get(propagation.arcId);
        if (propagation !== undefined && arc !== undefined) {
          propagation.status = rejectionReason === 'simultaneous-collision'
            ? 'collision'
            : 'blocked-target-refractory';
          physiologicalEvents.push(blockEvent(
            nextEventId('block'),
            pending.timeMs,
            pending.beatIndex,
            arc,
            propagation.status,
          ));
        }
      }

      if (pending.pacing !== undefined && pacingFailureReason !== undefined) {
        captures.push(pacingCaptureResult(
          pending.pacing,
          pending.timeMs,
          effectiveCaptureThresholdMa,
          false,
          pacingFailureReason,
        ));
        physiologicalEvents.push(captureEvent(
          nextEventId('capture'),
          pending.pacing.stimulus,
          pending.nodeId,
          pending.timeMs,
          false,
          effectiveCaptureThresholdMa,
          pacingFailureReason,
        ));
      }
      continue;
    }

    activationCounter += 1;
    const activation: EpActivationRecord = Object.freeze({
      id: `activation.${activationCounter.toString().padStart(6, '0')}`,
      nodeId: pending.nodeId,
      timeMs: pending.timeMs,
      beatIndex: pending.beatIndex,
      sourceKind: pending.sourceKind,
      sourceId: pending.sourceId,
      ...(pending.parentPropagationId === undefined
        ? {}
        : { parentPropagationId: pending.parentPropagationId }),
    });
    activations.push(activation);
    state.lastActivationMs = pending.timeMs;
    state.activationCount += 1;

    if (pending.parentPropagationId !== undefined) {
      const propagation = propagationById.get(pending.parentPropagationId);
      if (propagation !== undefined) propagation.status = 'conducted';
    }

    if (pending.pacing !== undefined) {
      captures.push(pacingCaptureResult(
        pending.pacing,
        pending.timeMs,
        effectiveCaptureThresholdMa,
        true,
      ));
      physiologicalEvents.push(captureEvent(
        nextEventId('capture'),
        pending.pacing.stimulus,
        pending.nodeId,
        pending.timeMs,
        true,
        effectiveCaptureThresholdMa,
      ));
    }

    physiologicalEvents.push(nodeEvent(
      nextEventId('activation-event'),
      node,
      activation,
      pending.attributes,
    ));

    const outgoing = outgoingByNode.get(node.id) ?? [];
    outgoing.forEach((arc) => {
      const arcState = arcStates.get(arc.id);
      if (arcState === undefined) {
        throw new Error(`Validated conduction arc disappeared during simulation: ${arc.id}.`);
      }
      propagationCounter += 1;
      const propagationId = `propagation.${propagationCounter.toString().padStart(6, '0')}`;

      if (arc.enabled === false) {
        const blocked: MutablePropagationRecord = {
          id: propagationId,
          arcId: arc.id,
          sourceActivationId: activation.id,
          fromNodeId: arc.fromNodeId,
          toNodeId: arc.toNodeId,
          departureTimeMs: activation.timeMs,
          arrivalTimeMs: null,
          delayMs: null,
          status: 'blocked-disabled',
        };
        mutablePropagations.push(blocked);
        propagationById.set(blocked.id, blocked);
        physiologicalEvents.push(blockEvent(
          nextEventId('block'),
          activation.timeMs,
          activation.beatIndex,
          arc,
          blocked.status,
        ));
        return;
      }

      const intervalSinceDepartureMs = recoveryIntervalMs(arcState, activation.timeMs);
      if (intervalSinceDepartureMs < arc.effectiveRefractoryPeriodMs - EPSILON_MS) {
        const blocked: MutablePropagationRecord = {
          id: propagationId,
          arcId: arc.id,
          sourceActivationId: activation.id,
          fromNodeId: arc.fromNodeId,
          toNodeId: arc.toNodeId,
          departureTimeMs: activation.timeMs,
          arrivalTimeMs: null,
          delayMs: null,
          status: 'blocked-pathway-refractory',
        };
        mutablePropagations.push(blocked);
        propagationById.set(blocked.id, blocked);
        physiologicalEvents.push(blockEvent(
          nextEventId('block'),
          activation.timeMs,
          activation.beatIndex,
          arc,
          blocked.status,
        ));
        return;
      }

      const delay = delayForArc(arc, arcState, activation.timeMs);
      const arrivalTimeMs = activation.timeMs + delay.delayMs;
      arcState.lastDepartureMs = activation.timeMs;
      arcState.propagationCount += 1;
      arcState.fatigueMs = delay.nextFatigueMs;

      const propagation: MutablePropagationRecord = {
        id: propagationId,
        arcId: arc.id,
        sourceActivationId: activation.id,
        fromNodeId: arc.fromNodeId,
        toNodeId: arc.toNodeId,
        departureTimeMs: activation.timeMs,
        arrivalTimeMs,
        delayMs: delay.delayMs,
        status: arrivalTimeMs > request.durationMs
          ? 'outside-recording-window'
          : 'conducted',
      };
      mutablePropagations.push(propagation);
      propagationById.set(propagation.id, propagation);

      if (arrivalTimeMs > request.durationMs) return;
      queueOrder += 1;
      queue.push({
        timeMs: arrivalTimeMs,
        order: queueOrder,
        nodeId: arc.toNodeId,
        beatIndex: activation.beatIndex,
        sourceKind: 'propagated',
        sourceId: arc.id,
        parentPropagationId: propagation.id,
        attributes: frozenAttributes(arc.attributes, {
          arcId: arc.id,
          pathwayId: arc.pathwayId ?? arc.id,
        }),
      });
    });
  }

  const finalNodeStates: EpConductionNodeStateSnapshot[] = request.network.nodes.map((node) => {
    const state = nodeStates.get(node.id);
    if (state === undefined) throw new Error(`Missing node state for ${node.id}.`);
    return Object.freeze({
      nodeId: node.id,
      lastActivationMs: state.lastActivationMs,
      activationCount: state.activationCount,
    });
  });
  const finalArcStates: EpConductionArcStateSnapshot[] = request.network.arcs.map((arc) => {
    const state = arcStates.get(arc.id);
    if (state === undefined) throw new Error(`Missing arc state for ${arc.id}.`);
    return Object.freeze({
      arcId: arc.id,
      lastDepartureMs: state.lastDepartureMs,
      propagationCount: state.propagationCount,
      fatigueMs: state.fatigueMs,
    });
  });

  return Object.freeze({
    networkId: request.network.id,
    networkVersion: request.network.networkVersion,
    durationMs: request.durationMs,
    activations: Object.freeze(activations),
    rejectedActivations: Object.freeze(rejectedActivations),
    propagations: Object.freeze(mutablePropagations.map(immutablePropagation)),
    captures: Object.freeze(captures.sort((first, second) => (
      first.captureTimeMs - second.captureTimeMs
      || first.stimulusId.localeCompare(second.stimulusId)
      || first.targetNodeId.localeCompare(second.targetNodeId)
    ))),
    physiologicalEvents: Object.freeze(physiologicalEvents.sort((first, second) => (
      first.timeMs - second.timeMs || first.id.localeCompare(second.id)
    ))),
    finalNodeStates: Object.freeze(finalNodeStates),
    finalArcStates: Object.freeze(finalArcStates),
    processedQueueItems,
  });
}
