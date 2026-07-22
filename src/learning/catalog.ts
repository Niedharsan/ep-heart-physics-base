import { engineDefinitionCatalog } from '../engine/definitions/catalog';
import type { LessonDefinitionV1 } from './types';

const lessons = [{
  schemaVersion: 1,
  id: 'observe-focal-propagation',
  definitionVersion: 1,
  title: 'Observe focal propagation',
  summary: 'Relate a focal tissue wave to an explicitly approximate signal-derived output.',
  scenario: { id: 'focal-rhythm', definitionVersion: 1 },
  measurements: [{ id: 'pseudo-ecg-primary', definitionVersion: 1 }],
  learningObjectives: [
    'Identify the activation origin and outward propagation pattern.',
    'Relate changes in the tissue field to the approximate pseudo-ECG trace.',
    'State why this reduced model is not a clinically validated ECG simulation.',
  ],
}] as const satisfies readonly LessonDefinitionV1[];

export const lessonDefinitionCatalog = validateLessonDefinitions(lessons);

function validateLessonDefinitions(definitions: readonly LessonDefinitionV1[]): readonly LessonDefinitionV1[] {
  const scenarioKeys = new Set(engineDefinitionCatalog.scenarios.map(definitionKey));
  const measurementKeys = new Set(engineDefinitionCatalog.measurements.map(definitionKey));
  const lessonKeys = new Set<string>();

  definitions.forEach((lesson) => {
    if (lesson.schemaVersion !== 1 || lesson.definitionVersion !== 1 || lesson.id.trim().length === 0) {
      throw new Error('Lesson definitions require non-empty ids and supported version 1.');
    }
    const key = definitionKey(lesson);
    if (lessonKeys.has(key)) throw new Error(`Duplicate lesson definition ${key}.`);
    lessonKeys.add(key);
    if (!scenarioKeys.has(definitionKey(lesson.scenario))) {
      throw new Error(`Lesson ${lesson.id} references a missing scenario definition.`);
    }
    if (lesson.measurements.length === 0) throw new Error(`Lesson ${lesson.id} requires a measurement.`);
    lesson.measurements.forEach((reference) => {
      if (!measurementKeys.has(definitionKey(reference))) {
        throw new Error(`Lesson ${lesson.id} references a missing measurement definition.`);
      }
    });
    if (lesson.learningObjectives.length === 0
      || lesson.learningObjectives.some((objective) => objective.trim().length === 0)) {
      throw new Error(`Lesson ${lesson.id} requires non-empty learning objectives.`);
    }
  });

  return deepFreeze(definitions);
}

function definitionKey(value: { id: string; definitionVersion: number }): string {
  return `${value.id}@${value.definitionVersion}`;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
}
