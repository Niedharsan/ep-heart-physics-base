import type { IntervalId } from '../types';

export type CatheterId = 'hra' | 'hbe' | 'rva' | 'cs';
export type CatheterTargetId =
  | 'high-right-atrium'
  | 'his-bundle-region'
  | 'right-ventricular-apex'
  | 'coronary-sinus';

export interface CatheterDefinition {
  readonly id: CatheterId;
  readonly label: string;
  readonly shortLabel: string;
  readonly correctTargetId: CatheterTargetId;
}

export interface CatheterTargetDefinition {
  readonly id: CatheterTargetId;
  readonly label: string;
  readonly xPercent: number;
  readonly yPercent: number;
}

export const catheterDefinitions: readonly CatheterDefinition[] = Object.freeze([
  Object.freeze({ id: 'hra', label: 'High right atrial catheter', shortLabel: 'HRA', correctTargetId: 'high-right-atrium' }),
  Object.freeze({ id: 'hbe', label: 'His-bundle catheter', shortLabel: 'HBE', correctTargetId: 'his-bundle-region' }),
  Object.freeze({ id: 'rva', label: 'Right-ventricular catheter', shortLabel: 'RVA', correctTargetId: 'right-ventricular-apex' }),
  Object.freeze({ id: 'cs', label: 'Coronary-sinus catheter', shortLabel: 'CS', correctTargetId: 'coronary-sinus' }),
]);

export const catheterTargets: readonly CatheterTargetDefinition[] = Object.freeze([
  Object.freeze({ id: 'high-right-atrium', label: 'High right atrium / SVC–RA junction', xPercent: 29, yPercent: 24 }),
  Object.freeze({ id: 'his-bundle-region', label: 'His-bundle region', xPercent: 47, yPercent: 52 }),
  Object.freeze({ id: 'right-ventricular-apex', label: 'Right ventricular apex', xPercent: 43, yPercent: 83 }),
  Object.freeze({ id: 'coronary-sinus', label: 'Coronary sinus', xPercent: 66, yPercent: 53 }),
]);

export const taskOneMeasurementIds = Object.freeze([
  'PA', 'AH', 'HV', 'PR', 'RR',
] satisfies readonly IntervalId[]);
