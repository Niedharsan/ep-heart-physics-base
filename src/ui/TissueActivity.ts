import type { EngineSnapshot, ScenarioId } from '../engine/core/types';

export type TissueActivityState =
  | 'initializing'
  | 'resting'
  | 'activation-front'
  | 'depolarized';

export interface TissueActivitySummary {
  readonly state: TissueActivityState;
  readonly label: string;
  readonly tissueCellCount: number;
  readonly activationFrontCellCount: number;
  readonly depolarizedCellCount: number;
  readonly visibleActiveCellCount: number;
  readonly peakVoltage: number;
}

const ACTIVATION_FRONT_MINIMUM = 0.18;
const DEPOLARIZED_MINIMUM = 0.72;

export function summarizeTissueActivity(
  snapshot: EngineSnapshot | null,
): TissueActivitySummary {
  if (!snapshot) {
    return Object.freeze({
      state: 'initializing',
      label: 'Initializing tissue',
      tissueCellCount: 0,
      activationFrontCellCount: 0,
      depolarizedCellCount: 0,
      visibleActiveCellCount: 0,
      peakVoltage: 0,
    });
  }

  let tissueCellCount = 0;
  let activationFrontCellCount = 0;
  let depolarizedCellCount = 0;
  let peakVoltage = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < snapshot.voltage.length; index += 1) {
    if (snapshot.tissueMask[index] === 0) continue;
    const voltage = snapshot.voltage[index] ?? 0;
    tissueCellCount += 1;
    peakVoltage = Math.max(peakVoltage, voltage);

    if (voltage >= DEPOLARIZED_MINIMUM) {
      depolarizedCellCount += 1;
    } else if (voltage >= ACTIVATION_FRONT_MINIMUM) {
      activationFrontCellCount += 1;
    }
  }

  const visibleActiveCellCount = activationFrontCellCount + depolarizedCellCount;
  const state: TissueActivityState = visibleActiveCellCount === 0
    ? 'resting'
    : activationFrontCellCount > 0
      ? 'activation-front'
      : 'depolarized';

  const labels: Readonly<Record<TissueActivityState, string>> = Object.freeze({
    initializing: 'Initializing tissue',
    resting: 'Resting / low voltage',
    'activation-front': 'Activation front visible',
    depolarized: 'Depolarized tissue visible',
  });

  return Object.freeze({
    state,
    label: labels[state],
    tissueCellCount,
    activationFrontCellCount,
    depolarizedCellCount,
    visibleActiveCellCount,
    peakVoltage: Number.isFinite(peakVoltage) ? peakVoltage : 0,
  });
}

export interface SimulatorGuidanceInput {
  readonly scenario: ScenarioId;
  readonly interactionMode: 'stimulate' | 'ablate';
  readonly running: boolean;
  readonly pacingSiteCount: number;
  readonly pacingSitesArmed: boolean;
  readonly activity: TissueActivitySummary;
}

export interface SimulatorGuidance {
  readonly step: string;
  readonly title: string;
  readonly detail: string;
  readonly tone: 'neutral' | 'ready' | 'active';
}

export function resolveSimulatorGuidance(
  input: SimulatorGuidanceInput,
): SimulatorGuidance {
  if (input.activity.state === 'initializing') {
    return Object.freeze({
      step: 'ENGINE',
      title: 'Preparing the tissue field',
      detail: 'The worker is creating the first voltage snapshot.',
      tone: 'neutral',
    });
  }

  if (input.interactionMode === 'ablate') {
    return Object.freeze({
      step: 'LESION MODE',
      title: 'Click the tissue to create a lesion',
      detail: 'Switch back to stimulation mode when you want to pace the tissue.',
      tone: 'ready',
    });
  }

  if (input.scenario === 'manual-pacing') {
    if (input.pacingSiteCount === 0) {
      return Object.freeze({
        step: 'STEP 1',
        title: 'Place a pacing site',
        detail: 'Click anywhere in the tissue field. A numbered marker will confirm the site.',
        tone: 'ready',
      });
    }

    if (input.pacingSitesArmed) {
      return Object.freeze({
        step: 'STEP 2',
        title: 'Pulse the placed sites',
        detail: 'Press “Pulse & run” to stimulate every numbered site simultaneously.',
        tone: 'ready',
      });
    }

    if (input.activity.visibleActiveCellCount > 0) {
      return Object.freeze({
        step: 'LIVE',
        title: 'Wave propagation is visible',
        detail: 'Bright cyan marks the activation front; warm tissue is at higher voltage behind it.',
        tone: 'active',
      });
    }

    if (input.running) {
      return Object.freeze({
        step: 'READY',
        title: 'The tissue is running at rest',
        detail: 'Press “Pulse sites” to launch another wave from the numbered locations.',
        tone: 'neutral',
      });
    }

    return Object.freeze({
      step: 'PAUSED',
      title: 'Simulation paused',
      detail: 'Press Start to continue, or pulse the placed sites to run immediately.',
      tone: 'neutral',
    });
  }

  if (input.activity.visibleActiveCellCount > 0) {
    return Object.freeze({
      step: 'LIVE',
      title: 'Scenario activity is visible',
      detail: 'Use Pause to inspect the current wave pattern.',
      tone: 'active',
    });
  }

  return Object.freeze({
    step: input.running ? 'RUNNING' : 'PAUSED',
    title: input.running ? 'Scenario is running' : 'Scenario is paused',
    detail: input.running
      ? 'The selected scenario will stimulate the tissue according to its configured schedule.'
      : 'Press Start to continue the selected scenario.',
    tone: 'neutral',
  });
}
