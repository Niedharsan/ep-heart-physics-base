import type {
  ElectrodeDefinitionV1,
  MeasurementDefinitionV1,
  ScenarioActionV1,
  ScenarioDefinitionV1,
} from './types';
import { numericalSafeguards } from '../core/numericalDiagnostics';

export interface EngineDefinitionCatalogV1 {
  readonly scenarios: readonly ScenarioDefinitionV1[];
  readonly electrodes: readonly ElectrodeDefinitionV1[];
  readonly measurements: readonly MeasurementDefinitionV1[];
}

export function validateEngineDefinitionCatalog(catalog: EngineDefinitionCatalogV1): EngineDefinitionCatalogV1 {
  validateUniqueDefinitions(catalog.scenarios, 'scenario');
  validateUniqueDefinitions(catalog.electrodes, 'electrode');
  validateUniqueDefinitions(catalog.measurements, 'measurement');

  catalog.scenarios.forEach((definition) => {
    validateIdentity(definition, 'Scenario');
    definition.setup.forEach(validateAction);
    definition.schedule.forEach((scheduled) => {
      validateAction(scheduled.action);
      validateFiniteNonNegative(scheduled.startModelTime, 'Scheduled start model time');
      if (scheduled.repeatEveryModelTime !== undefined) {
        validateFinitePositive(scheduled.repeatEveryModelTime, 'Scheduled repeat model time');
      }
    });
  });

  catalog.electrodes.forEach((definition) => {
    validateIdentity(definition, 'Electrode');
    if (!Number.isFinite(definition.normalizedXWeight) || !Number.isFinite(definition.normalizedYWeight)) {
      throw new Error('Electrode weights must be finite.');
    }
  });

  const electrodeKeys = new Set(catalog.electrodes.map(definitionKey));
  catalog.measurements.forEach((definition) => {
    validateIdentity(definition, 'Measurement');
    if (!Number.isInteger(definition.sampleEverySolverSteps) || definition.sampleEverySolverSteps < 1) {
      throw new Error('Measurement sample cadence must be a positive integer solver-step count.');
    }
    if (!electrodeKeys.has(referenceKey(definition.electrode))) {
      throw new Error(`Measurement ${definition.id} references a missing electrode definition.`);
    }
  });

  return deepFreeze(catalog);
}

function validateAction(action: ScenarioActionV1): void {
  if (action.type === 'rectangular-direct-stimulus') {
    validateNormalized(action.normalizedMinimumX, 'Rectangle minimum x');
    validateNormalized(action.normalizedMaximumX, 'Rectangle maximum x');
    validateNormalized(action.normalizedMinimumY, 'Rectangle minimum y');
    validateNormalized(action.normalizedMaximumY, 'Rectangle maximum y');
    if (action.normalizedMaximumX < action.normalizedMinimumX
      || action.normalizedMaximumY < action.normalizedMinimumY) {
      throw new Error('Normalized rectangle coordinates must be ordered.');
    }
    validateStimulusAmplitude(action.amplitude);
    return;
  }

  validateNormalized(action.normalizedX, 'Circular action x');
  validateNormalized(action.normalizedY, 'Circular action y');
  validateFinitePositive(action.radiusFractionOfMinimumExtent, 'Circular action radius fraction');
  if (action.radiusFractionOfMinimumExtent > 1) {
    throw new Error('Circular action radius fraction must not exceed one grid extent.');
  }
  if (action.type === 'circular-direct-stimulus') {
    validateStimulusAmplitude(action.amplitude);
  }
}

function validateStimulusAmplitude(value: number): void {
  validateFinitePositive(value, 'Scenario stimulus amplitude');
  if (value > numericalSafeguards.voltageMaximum) {
    throw new Error(`Scenario stimulus amplitude must not exceed ${numericalSafeguards.voltageMaximum}.`);
  }
}

function validateIdentity(value: { schemaVersion: number; id: string; definitionVersion: number }, label: string): void {
  if (value.schemaVersion !== 1 || value.definitionVersion !== 1) {
    throw new Error(`${label} must use supported schema and definition version 1.`);
  }
  if (value.id.trim().length === 0) throw new Error(`${label} id must not be empty.`);
}

function validateUniqueDefinitions(
  definitions: readonly { id: string; definitionVersion: number }[],
  label: string,
): void {
  const keys = new Set<string>();
  definitions.forEach((definition) => {
    const key = definitionKey(definition);
    if (keys.has(key)) throw new Error(`Duplicate ${label} definition ${key}.`);
    keys.add(key);
  });
}

function definitionKey(value: { id: string; definitionVersion: number }): string {
  return `${value.id}@${value.definitionVersion}`;
}

function referenceKey(value: { id: string; definitionVersion: number }): string {
  return definitionKey(value);
}

function validateNormalized(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be in [0, 1].`);
}

function validateFinitePositive(value: number, label: string): void {
  if (!(value > 0) || !Number.isFinite(value)) throw new Error(`${label} must be finite and positive.`);
}

function validateFiniteNonNegative(value: number, label: string): void {
  if (!(value >= 0) || !Number.isFinite(value)) throw new Error(`${label} must be finite and non-negative.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
}
