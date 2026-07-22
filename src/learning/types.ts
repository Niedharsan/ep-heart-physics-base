import type { DefinitionIdentityV1, DefinitionReferenceV1 } from '../engine/definitions/types';

export interface LessonDefinitionV1 extends DefinitionIdentityV1 {
  readonly title: string;
  readonly summary: string;
  readonly scenario: DefinitionReferenceV1;
  readonly measurements: readonly DefinitionReferenceV1[];
  readonly learningObjectives: readonly string[];
}
