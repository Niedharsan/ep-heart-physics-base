import type {
  ElectrodeDefinitionV1,
  MeasurementDefinitionV1,
  ScenarioDefinitionV1,
} from './types';
import { validateEngineDefinitionCatalog } from './validation';

const scenarios = [
  {
    schemaVersion: 1,
    id: 'manual-pacing',
    definitionVersion: 1,
    title: 'Manual pacing',
    description: 'No automatic source. User-defined pacing sites receive simultaneous finite-duration current pulses.',
    setup: [],
    schedule: [],
  },
  {
    schemaVersion: 1,
    id: 'focal-rhythm',
    definitionVersion: 1,
    title: 'Focal rhythm',
    description: 'Repeated focal activation in a homogeneous rectangular sheet.',
    setup: [],
    schedule: [{
      action: {
        type: 'circular-direct-stimulus',
        normalizedX: 0.2,
        normalizedY: 0.34,
        radiusFractionOfMinimumExtent: 3 / 104,
        amplitude: 1,
      },
      startModelTime: 0,
      repeatEveryModelTime: 65,
    }],
  },
  {
    schemaVersion: 1,
    id: 'planar-wave',
    definitionVersion: 1,
    title: 'Planar wave',
    description: 'A left-edge direct stimulus initiates an approximately planar wave.',
    setup: [{
      type: 'rectangular-direct-stimulus',
      normalizedMinimumX: 0,
      normalizedMaximumX: 2 / 160,
      normalizedMinimumY: 0,
      normalizedMaximumY: 1,
      amplitude: 1,
    }],
    schedule: [],
  },
  {
    schemaVersion: 1,
    id: 'obstacle-reentry',
    definitionVersion: 1,
    title: 'Obstacle / re-entry scaffold',
    description: 'A focal wave encounters a central non-conductive circular obstacle.',
    setup: [
      {
        type: 'circular-obstacle',
        normalizedX: 0.5,
        normalizedY: 0.5,
        radiusFractionOfMinimumExtent: 0.12,
      },
      {
        type: 'circular-direct-stimulus',
        normalizedX: 0.22,
        normalizedY: 0.5,
        radiusFractionOfMinimumExtent: 4 / 104,
        amplitude: 1,
      },
    ],
    schedule: [],
  },
] as const satisfies readonly ScenarioDefinitionV1[];

const electrodes = [{
  schemaVersion: 1,
  id: 'distributed-linear-pseudo-lead',
  definitionVersion: 1,
  kind: 'distributed-linear-pseudo-lead',
  title: 'Approximate distributed linear pseudo-lead',
  normalizedXWeight: 1.4,
  normalizedYWeight: 0.35,
}] as const satisfies readonly ElectrodeDefinitionV1[];

const measurements = [{
  schemaVersion: 1,
  id: 'pseudo-ecg-primary',
  definitionVersion: 1,
  kind: 'pseudo-ecg',
  title: 'Primary pseudo-ECG',
  electrode: { id: 'distributed-linear-pseudo-lead', definitionVersion: 1 },
  sampleEverySolverSteps: 1,
  unit: 'arbitrary-unit',
}] as const satisfies readonly MeasurementDefinitionV1[];

export const engineDefinitionCatalog = validateEngineDefinitionCatalog({
  scenarios,
  electrodes,
  measurements,
});
