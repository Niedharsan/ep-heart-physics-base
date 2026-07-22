import { describe, expect, it } from 'vitest';
import { engineDefinitionCatalog } from '../engine/definitions/catalog';
import {
  validateEngineDefinitionCatalog,
  type EngineDefinitionCatalogV1,
} from '../engine/definitions/validation';
import { lessonDefinitionCatalog } from '../learning/catalog';

describe('versioned learning definitions', () => {
  it('provides frozen JSON-safe scenario, electrode, measurement and lesson catalogs', () => {
    expect(engineDefinitionCatalog.scenarios.map((definition) => definition.id)).toEqual([
      'manual-pacing', 'focal-rhythm', 'planar-wave', 'obstacle-reentry',
    ]);
    expect(engineDefinitionCatalog.measurements[0]?.electrode.id)
      .toBe(engineDefinitionCatalog.electrodes[0]?.id);
    expect(lessonDefinitionCatalog[0]?.scenario.id).toBe('focal-rhythm');
    expect(lessonDefinitionCatalog[0]?.measurements[0]?.id).toBe('pseudo-ecg-primary');
    expect(Object.isFrozen(engineDefinitionCatalog)).toBe(true);
    expect(Object.isFrozen(engineDefinitionCatalog.scenarios[0]?.schedule)).toBe(true);
    expect(Object.isFrozen(lessonDefinitionCatalog[0]?.learningObjectives)).toBe(true);
    expect(() => JSON.stringify({ engineDefinitionCatalog, lessonDefinitionCatalog })).not.toThrow();
  });

  it('rejects duplicate definitions and unresolved versioned references', () => {
    const duplicateScenarioCatalog: EngineDefinitionCatalogV1 = {
      ...engineDefinitionCatalog,
      scenarios: [engineDefinitionCatalog.scenarios[0]!, engineDefinitionCatalog.scenarios[0]!],
    };
    expect(() => validateEngineDefinitionCatalog(duplicateScenarioCatalog)).toThrow(/Duplicate scenario/);

    const missingReferenceCatalog: EngineDefinitionCatalogV1 = {
      ...engineDefinitionCatalog,
      measurements: [{
        ...engineDefinitionCatalog.measurements[0]!,
        electrode: { id: 'missing-electrode', definitionVersion: 1 },
      }],
    };
    expect(() => validateEngineDefinitionCatalog(missingReferenceCatalog)).toThrow(/missing electrode/);
  });
});
