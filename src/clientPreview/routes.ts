export type ClientPreviewRoute = 'home' | 'simulator' | 'assessment';

export interface ClientLocation {
  readonly pathname: string;
  readonly search: string;
}

export interface ClientModuleDefinition {
  readonly id: Exclude<ClientPreviewRoute, 'home'>;
  readonly title: string;
  readonly summary: string;
  readonly href: string;
  readonly status: 'Available';
  readonly capabilities: readonly string[];
  readonly limitation: string;
}

export const clientModules: readonly ClientModuleDefinition[] = Object.freeze([
  Object.freeze({
    id: 'simulator',
    title: '2D tissue simulator',
    summary: 'Explore deterministic excitation, finite-current pacing and signal-derived pseudo-ECG in a homogeneous two-dimensional sheet.',
    href: '/?mode=simulator',
    status: 'Available',
    capabilities: Object.freeze([
      'Manual multi-site finite-current pacing',
      'Planar, focal and obstacle scenarios',
      'Activation-wave and voltage-map displays',
    ]),
    limitation: 'Educational/research prototype; not anatomical whole-heart propagation.',
  }),
  Object.freeze({
    id: 'assessment',
    title: 'EP assessment workspace',
    summary: 'Review channel-aware EGM measurements plus complete 15-mark Task 1, 22-mark Task 2 and 23-mark Task 3 workflows without an account.',
    href: '/?mode=assessment',
    status: 'Available',
    capabilities: Object.freeze([
      'Channel-aware PA, AH, HV, PR, RR and VA measurements',
      'Task 1 catheter placement, CS labelling and activation interpretation',
      'Task 2 SNRT, refractory-period, AVNRT, Wenckebach and ECG recognition',
      'Task 3 atrial tachycardia, AH-threshold, cannon-wave, adenosine and AVNRT assessment',
      'Local attempt history and structured client feedback packages',
    ]),
    limitation: 'Synthetic educational traces; not patient data or a diagnostic device.',
  }),
]);

export const plannedClientCapabilities = Object.freeze([
  'Task 4 and Task 5 assessment workflows',
  'Weekly quizzes, instructor publishing and shared result review',
]);

export function resolveClientPreviewRoute(location: ClientLocation): ClientPreviewRoute {
  const normalizedPath = location.pathname.replace(/\/+$/, '');
  const mode = new URLSearchParams(location.search).get('mode');

  if (normalizedPath.endsWith('/assessment') || mode === 'assessment') return 'assessment';
  if (normalizedPath.endsWith('/simulator') || mode === 'simulator') return 'simulator';
  return 'home';
}
