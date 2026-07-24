import { describe, expect, it } from 'vitest';
import type { EngineSnapshot } from '../engine/core/types';
import {
  resolveSimulatorGuidance,
  summarizeTissueActivity,
} from '../ui/TissueActivity';

function snapshot(voltage: readonly number[]): EngineSnapshot {
  return {
    width: voltage.length,
    height: 1,
    dx: 1,
    time: 1,
    solverStepIndex: 1,
    voltage: new Float32Array(voltage),
    tissueMask: new Uint8Array(voltage.map(() => 1)),
    lesions: [],
    simulationStepsPerSecond: 100,
    diagnostics: {
      denominatorGuardCount: 0,
      voltageClipLowCount: 0,
      voltageClipHighCount: 0,
      recoveryClipLowCount: 0,
      recoveryClipHighCount: 0,
      nonFiniteStateCount: 0,
    },
  };
}

describe('tissue activity summary', () => {
  it('reports initializing before the first snapshot', () => {
    expect(summarizeTissueActivity(null).state).toBe('initializing');
  });

  it('distinguishes resting, activation-front and depolarized cells', () => {
    const summary = summarizeTissueActivity(snapshot([0, 0.1, 0.25, 0.5, 0.8, 1]));

    expect(summary.state).toBe('activation-front');
    expect(summary.tissueCellCount).toBe(6);
    expect(summary.activationFrontCellCount).toBe(2);
    expect(summary.depolarizedCellCount).toBe(2);
    expect(summary.visibleActiveCellCount).toBe(4);
    expect(summary.peakVoltage).toBeCloseTo(1);
  });

  it('reports fully resting tissue without inventing activity', () => {
    const summary = summarizeTissueActivity(snapshot([0, 0.02, 0.1]));

    expect(summary.state).toBe('resting');
    expect(summary.visibleActiveCellCount).toBe(0);
  });
});

describe('simulator guidance', () => {
  const resting = summarizeTissueActivity(snapshot([0, 0.02, 0.1]));
  const active = summarizeTissueActivity(snapshot([0, 0.4, 0.9]));

  it('guides manual pacing through site placement and pulse delivery', () => {
    const place = resolveSimulatorGuidance({
      scenario: 'manual-pacing',
      interactionMode: 'stimulate',
      running: false,
      pacingSiteCount: 0,
      pacingSitesArmed: false,
      activity: resting,
    });
    const pulse = resolveSimulatorGuidance({
      scenario: 'manual-pacing',
      interactionMode: 'stimulate',
      running: false,
      pacingSiteCount: 2,
      pacingSitesArmed: true,
      activity: resting,
    });

    expect(place.title).toBe('Place a pacing site');
    expect(pulse.title).toBe('Pulse the placed sites');
    expect(pulse.detail).toContain('Pulse & run');
  });

  it('announces visible wave activity after pacing', () => {
    const guidance = resolveSimulatorGuidance({
      scenario: 'manual-pacing',
      interactionMode: 'stimulate',
      running: true,
      pacingSiteCount: 1,
      pacingSitesArmed: false,
      activity: active,
    });

    expect(guidance.tone).toBe('active');
    expect(guidance.title).toContain('propagation');
  });

  it('keeps lesion mode distinct from pacing guidance', () => {
    const guidance = resolveSimulatorGuidance({
      scenario: 'manual-pacing',
      interactionMode: 'ablate',
      running: false,
      pacingSiteCount: 0,
      pacingSitesArmed: false,
      activity: resting,
    });

    expect(guidance.step).toBe('LESION MODE');
    expect(guidance.title).toContain('lesion');
  });
});
