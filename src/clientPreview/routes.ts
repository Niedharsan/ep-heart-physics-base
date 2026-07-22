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
    title: 'Running EGM interval trainer',
    summary: 'Freeze synthetic intracardiac traces, place calipers and receive landmark-aware interval marking without an account.',
    href: '/?mode=assessment',
    status: 'Available',
    capabilities: Object.freeze([
      'AH, HV, PR, RR/cycle-length and VA exercises',
      'Anatomical landmark validation',
      'Local attempt history and client feedback package',
    ]),
    limitation: 'Synthetic traces; only approved normal ranges are scored.',
  }),
]);

export const plannedClientCapabilities = Object.freeze([
  'Catheter placement and coronary-sinus labelling assessment',
  'Arrhythmia and ECG pattern-recognition scenarios',
  'SNRT, refractory-period and pacing-manoeuvre exercises',
  'Weekly quizzes, instructor publishing and shared result review',
]);

export function resolveClientPreviewRoute(location: ClientLocation): ClientPreviewRoute {
  const normalizedPath = location.pathname.replace(/\/+$/, '');
  const mode = new URLSearchParams(location.search).get('mode');

  if (normalizedPath.endsWith('/assessment') || mode === 'assessment') return 'assessment';
  if (normalizedPath.endsWith('/simulator') || mode === 'simulator') return 'simulator';
  return 'home';
}
