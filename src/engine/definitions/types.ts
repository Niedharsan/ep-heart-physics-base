import type { ScenarioId } from '../core/types';

export interface DefinitionIdentityV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly definitionVersion: 1;
}

export interface DefinitionReferenceV1 {
  readonly id: string;
  readonly definitionVersion: 1;
}

export type ScenarioActionV1 =
  | {
    readonly type: 'circular-obstacle';
    readonly normalizedX: number;
    readonly normalizedY: number;
    readonly radiusFractionOfMinimumExtent: number;
  }
  | {
    readonly type: 'circular-direct-stimulus';
    readonly normalizedX: number;
    readonly normalizedY: number;
    readonly radiusFractionOfMinimumExtent: number;
    readonly amplitude: number;
  }
  | {
    readonly type: 'rectangular-direct-stimulus';
    readonly normalizedMinimumX: number;
    readonly normalizedMaximumX: number;
    readonly normalizedMinimumY: number;
    readonly normalizedMaximumY: number;
    readonly amplitude: number;
  };

export interface ScheduledScenarioActionV1 {
  readonly action: ScenarioActionV1;
  readonly startModelTime: number;
  readonly repeatEveryModelTime?: number;
}

export interface ScenarioDefinitionV1 extends DefinitionIdentityV1 {
  readonly id: ScenarioId;
  readonly title: string;
  readonly description: string;
  readonly setup: readonly ScenarioActionV1[];
  readonly schedule: readonly ScheduledScenarioActionV1[];
}

export interface ElectrodeDefinitionV1 extends DefinitionIdentityV1 {
  readonly kind: 'distributed-linear-pseudo-lead';
  readonly title: string;
  readonly normalizedXWeight: number;
  readonly normalizedYWeight: number;
}

export interface MeasurementDefinitionV1 extends DefinitionIdentityV1 {
  readonly kind: 'pseudo-ecg';
  readonly title: string;
  readonly electrode: DefinitionReferenceV1;
  readonly sampleEverySolverSteps: number;
  readonly unit: 'arbitrary-unit';
}
