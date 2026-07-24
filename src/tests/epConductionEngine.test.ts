import { describe, expect, it } from 'vitest';
import {
  EP_CONDUCTION_SCHEMA_VERSION,
  EpConductionSimulationLimitError,
  EpConductionValidationError,
  assertValidConductionNetwork,
  simulateConduction,
  strengthDurationThresholdMa,
  validateConductionNetwork,
  validateConductionSimulationRequest,
} from '../epSignal';
import type {
  EpConductionArcDefinition,
  EpConductionNetworkDefinition,
  EpConductionNodeDefinition,
  EpConductionSimulationRequest,
} from '../epSignal';

function node(
  id: string,
  kind: EpConductionNodeDefinition['kind'],
  eventKind: EpConductionNodeDefinition['eventKind'],
  absoluteRefractoryPeriodMs: number,
  relativeRefractoryPeriodMs?: number,
  relativeCaptureThresholdMultiplier?: number,
): EpConductionNodeDefinition {
  return {
    id,
    label: id,
    kind,
    eventKind,
    refractory: {
      absoluteRefractoryPeriodMs,
      ...(relativeRefractoryPeriodMs === undefined ? {} : { relativeRefractoryPeriodMs }),
      ...(relativeCaptureThresholdMultiplier === undefined
        ? {}
        : { relativeCaptureThresholdMultiplier }),
    },
  };
}

function fixedArc(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  delayMs: number,
  effectiveRefractoryPeriodMs: number,
): EpConductionArcDefinition {
  return {
    id,
    label: id,
    fromNodeId,
    toNodeId,
    effectiveRefractoryPeriodMs,
    delay: { kind: 'fixed', delayMs },
  };
}

function network(
  nodes: readonly EpConductionNodeDefinition[],
  arcs: readonly EpConductionArcDefinition[],
): EpConductionNetworkDefinition {
  return {
    schemaVersion: EP_CONDUCTION_SCHEMA_VERSION,
    id: 'phase2.test-network',
    title: 'Phase 2 test network',
    networkVersion: '1.0.0',
    nodes,
    arcs,
  };
}

function requestFor(
  conductionNetwork: EpConductionNetworkDefinition,
  scheduledActivations: EpConductionSimulationRequest['scheduledActivations'],
  durationMs = 1200,
): EpConductionSimulationRequest {
  return {
    network: conductionNetwork,
    durationMs,
    scheduledActivations,
    pacingStimuli: [],
  };
}

function activationTimes(
  result: ReturnType<typeof simulateConduction>,
  nodeId: string,
): readonly number[] {
  return result.activations
    .filter((activation) => activation.nodeId === nodeId)
    .map((activation) => activation.timeMs);
}

describe('EP conduction engine phase 2', () => {
  it('propagates a deterministic sinus-to-His-to-ventricle timeline', () => {
    const currentNetwork = network(
      [
        node('atrium', 'atrial-myocardium', 'atrial-activation', 180),
        node('his', 'his-bundle', 'his-activation', 200),
        node('ventricle', 'ventricular-myocardium', 'ventricular-activation', 220),
      ],
      [
        fixedArc('atrium-to-his', 'atrium', 'his', 80, 250),
        fixedArc('his-to-ventricle', 'his', 'ventricle', 45, 200),
      ],
    );
    const request = requestFor(currentNetwork, [
      { id: 'sinus-0', nodeId: 'atrium', timeMs: 100, beatIndex: 0, origin: 'sinus' },
      { id: 'sinus-1', nodeId: 'atrium', timeMs: 900, beatIndex: 1, origin: 'sinus' },
    ]);

    const first = simulateConduction(request);
    const second = simulateConduction(request);
    expect(activationTimes(first, 'atrium')).toEqual([100, 900]);
    expect(activationTimes(first, 'his')).toEqual([180, 980]);
    expect(activationTimes(first, 'ventricle')).toEqual([225, 1025]);
    expect(first).toEqual(second);
    expect(first.propagations.every((propagation) => propagation.status === 'conducted')).toBe(true);
  });

  it('switches from a fast to a slow AV pathway after a premature atrial activation', () => {
    const currentNetwork = network(
      [
        node('atrium', 'atrial-myocardium', 'atrial-activation', 180),
        node('his', 'his-bundle', 'his-activation', 200),
        node('ventricle', 'ventricular-myocardium', 'ventricular-activation', 220),
      ],
      [
        fixedArc('av-fast', 'atrium', 'his', 80, 320),
        fixedArc('av-slow', 'atrium', 'his', 150, 240),
        fixedArc('his-to-ventricle', 'his', 'ventricle', 45, 180),
      ],
    );
    const result = simulateConduction(requestFor(currentNetwork, [
      { id: 'a1', nodeId: 'atrium', timeMs: 100, beatIndex: 0, origin: 'induced' },
      { id: 'a2', nodeId: 'atrium', timeMs: 380, beatIndex: 1, origin: 'induced' },
    ], 800));

    expect(activationTimes(result, 'his')).toEqual([180, 530]);
    expect(result.propagations).toContainEqual(expect.objectContaining({
      arcId: 'av-fast',
      departureTimeMs: 380,
      status: 'blocked-pathway-refractory',
    }));
    expect(result.propagations).toContainEqual(expect.objectContaining({
      arcId: 'av-slow',
      departureTimeMs: 100,
      arrivalTimeMs: 250,
      status: 'blocked-target-refractory',
    }));
    expect(result.propagations).toContainEqual(expect.objectContaining({
      arcId: 'av-slow',
      departureTimeMs: 380,
      arrivalTimeMs: 530,
      status: 'conducted',
    }));
  });

  it('produces progressive history-dependent AV delay and a Wenckebach-like dropped response', () => {
    const avHistoryArc: EpConductionArcDefinition = {
      id: 'av-history',
      label: 'AV nodal history pathway',
      fromNodeId: 'atrium',
      toNodeId: 'his',
      effectiveRefractoryPeriodMs: 200,
      delay: {
        kind: 'av-nodal-history',
        minimumDelayMs: 80,
        maximumRecoveryDelayMs: 60,
        recoveryTimeConstantMs: 100,
        fatigueIncrementMs: 10,
        fatigueDecayTimeConstantMs: 600,
        maximumFatigueMs: 40,
        facilitationMagnitudeMs: 0,
        facilitationWindowMs: 300,
        maximumDelayMs: 180,
      },
    };
    const currentNetwork = network(
      [
        node('atrium', 'atrial-myocardium', 'atrial-activation', 150),
        node('his', 'his-bundle', 'his-activation', 250),
      ],
      [avHistoryArc],
    );
    const result = simulateConduction(requestFor(currentNetwork, [
      { id: 'paced-a1', nodeId: 'atrium', timeMs: 100, beatIndex: 0, origin: 'induced' },
      { id: 'paced-a2', nodeId: 'atrium', timeMs: 320, beatIndex: 1, origin: 'induced' },
      { id: 'paced-a3', nodeId: 'atrium', timeMs: 540, beatIndex: 2, origin: 'induced' },
      { id: 'paced-a4', nodeId: 'atrium', timeMs: 760, beatIndex: 3, origin: 'induced' },
    ], 1100));

    const avAttempts = result.propagations.filter((item) => item.arcId === 'av-history');
    const delays = avAttempts
      .map((item) => item.delayMs)
      .filter((value): value is number => value !== null);
    expect(delays[1]).toBeGreaterThan(delays[0]!);
    expect(delays[2]).toBeGreaterThan(delays[1]!);
    expect(avAttempts).toContainEqual(expect.objectContaining({
      departureTimeMs: 540,
      status: 'blocked-target-refractory',
    }));
    expect(activationTimes(result, 'his')).toHaveLength(3);
    expect(result.finalArcStates[0]).toEqual(expect.objectContaining({
      propagationCount: 4,
    }));
  });

  it('uses strength-duration and relative-refractory capture thresholds', () => {
    const currentNetwork = network(
      [node('ventricle', 'ventricular-myocardium', 'ventricular-activation', 200, 300, 2)],
      [],
    );
    const result = simulateConduction({
      network: currentNetwork,
      durationMs: 700,
      scheduledActivations: [
        { id: 'intrinsic-v', nodeId: 'ventricle', timeMs: 100, beatIndex: 0, origin: 'sinus' },
      ],
      pacingStimuli: [
        {
          id: 'stim-subthreshold',
          siteId: 'rva',
          timeMs: 250,
          beatIndex: 1,
          amplitudeMa: 1.5,
          pulseWidthMs: 0.5,
          targets: [{
            nodeId: 'ventricle',
            latencyMs: 0,
            threshold: { rheobaseMa: 1, chronaxieMs: 0.5 },
          }],
        },
        {
          id: 'stim-relative',
          siteId: 'rva',
          timeMs: 320,
          beatIndex: 2,
          amplitudeMa: 3,
          pulseWidthMs: 0.5,
          targets: [{
            nodeId: 'ventricle',
            latencyMs: 0,
            threshold: { rheobaseMa: 1, chronaxieMs: 0.5 },
          }],
        },
        {
          id: 'stim-capture',
          siteId: 'rva',
          timeMs: 450,
          beatIndex: 3,
          amplitudeMa: 2.1,
          pulseWidthMs: 0.5,
          targets: [{
            nodeId: 'ventricle',
            latencyMs: 0,
            threshold: { rheobaseMa: 1, chronaxieMs: 0.5 },
          }],
        },
      ],
    });

    expect(strengthDurationThresholdMa({ rheobaseMa: 1, chronaxieMs: 0.5 }, 0.5)).toBe(2);
    expect(result.captures).toEqual([
      expect.objectContaining({ stimulusId: 'stim-subthreshold', captured: false, failureReason: 'subthreshold' }),
      expect.objectContaining({ stimulusId: 'stim-relative', captured: false, failureReason: 'relative-refractory-threshold', effectiveThresholdMa: 4 }),
      expect.objectContaining({ stimulusId: 'stim-capture', captured: true }),
    ]);
    expect(activationTimes(result, 'ventricle')).toEqual([100, 450]);
  });

  it('terminates a re-entry loop through node refractoriness instead of recursing forever', () => {
    const currentNetwork = network(
      [
        node('loop-a', 'custom', 'custom', 120),
        node('loop-b', 'custom', 'custom', 120),
      ],
      [
        fixedArc('a-to-b', 'loop-a', 'loop-b', 50, 20),
        fixedArc('b-to-a', 'loop-b', 'loop-a', 50, 20),
      ],
    );
    const result = simulateConduction(requestFor(currentNetwork, [
      { id: 'loop-start', nodeId: 'loop-a', timeMs: 0, beatIndex: 0, origin: 'induced' },
    ], 1000));

    expect(activationTimes(result, 'loop-a')).toEqual([0]);
    expect(activationTimes(result, 'loop-b')).toEqual([50]);
    expect(result.rejectedActivations).toContainEqual(expect.objectContaining({
      nodeId: 'loop-a',
      timeMs: 100,
      reason: 'node-refractory',
    }));
    expect(result.processedQueueItems).toBe(3);
  });

  it('rejects malformed graphs and protects cyclic simulations with a queue limit', () => {
    const invalid = network(
      [node('only-node', 'custom', 'custom', 100)],
      [fixedArc('bad-loop', 'only-node', 'only-node', -1, -2)],
    );
    const issues = validateConductionNetwork(invalid);
    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      'self-loop-arc',
      'invalid-pathway-refractory-period',
      'invalid-fixed-delay',
    ]));
    expect(() => assertValidConductionNetwork(invalid)).toThrow(EpConductionValidationError);

    const currentNetwork = network(
      [
        node('a', 'custom', 'custom', 0),
        node('b', 'custom', 'custom', 0),
      ],
      [
        fixedArc('a-b', 'a', 'b', 1, 0),
        fixedArc('b-a', 'b', 'a', 1, 0),
      ],
    );
    const request: EpConductionSimulationRequest = {
      network: currentNetwork,
      durationMs: 1000,
      scheduledActivations: [{ id: 'start', nodeId: 'a', timeMs: 0, beatIndex: 0, origin: 'custom' }],
      pacingStimuli: [],
      maxProcessedQueueItems: 20,
    };
    expect(validateConductionSimulationRequest(request).filter((item) => item.severity === 'error')).toEqual([]);
    expect(() => simulateConduction(request)).toThrow(EpConductionSimulationLimitError);
  });
});
