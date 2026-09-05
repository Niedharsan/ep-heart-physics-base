import type { ScenarioId } from '../engine/core/types';

export type TutorActionType = 'start' | 'pause' | 'reset' | 'load_scenario';

export type TutorActionV1 =
  | Readonly<{ type: 'start' | 'pause' | 'reset'; scenario: null }>
  | Readonly<{ type: 'load_scenario'; scenario: ScenarioId }>;

const allowedScenarios: readonly ScenarioId[] = Object.freeze([
  'manual-pacing',
  'planar-wave',
  'focal-rhythm',
  'obstacle-reentry',
]);

function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && allowedScenarios.includes(value as ScenarioId);
}

export function isTutorActionV1(value: unknown): value is TutorActionV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown; scenario?: unknown };

  if (candidate.type === 'load_scenario') {
    return isScenarioId(candidate.scenario);
  }

  if (candidate.type === 'start' || candidate.type === 'pause' || candidate.type === 'reset') {
    return candidate.scenario === null;
  }

  return false;
}

export function tutorActionLabel(action: TutorActionV1): string {
  if (action.type === 'start') return 'Start simulation';
  if (action.type === 'pause') return 'Pause simulation';
  if (action.type === 'reset') return 'Reset current scenario';

  const labels: Readonly<Record<ScenarioId, string>> = Object.freeze({
    'manual-pacing': 'Manual pacing',
    'planar-wave': 'Planar wave',
    'focal-rhythm': 'Automatic focal rhythm',
    'obstacle-reentry': 'Obstacle / re-entry scaffold',
  });
  return `Load ${labels[action.scenario]}`;
}
