import { describe, expect, it } from 'vitest';
import {
  clientModules,
  plannedClientCapabilities,
  resolveClientPreviewRoute,
} from '../clientPreview/routes';

describe('client preview integration', () => {
  it('uses the root route as the unified client landing page', () => {
    expect(resolveClientPreviewRoute({ pathname: '/', search: '' })).toBe('home');
    expect(resolveClientPreviewRoute({ pathname: '/nested/', search: '' })).toBe('home');
  });

  it('resolves simulator and assessment query routes deterministically', () => {
    expect(resolveClientPreviewRoute({ pathname: '/', search: '?mode=simulator' })).toBe('simulator');
    expect(resolveClientPreviewRoute({ pathname: '/', search: '?mode=assessment' })).toBe('assessment');
  });

  it('keeps compatible path aliases for direct module links', () => {
    expect(resolveClientPreviewRoute({ pathname: '/simulator', search: '' })).toBe('simulator');
    expect(resolveClientPreviewRoute({ pathname: '/assessment/', search: '' })).toBe('assessment');
  });

  it('publishes only working modules as available', () => {
    expect(clientModules.map((module) => module.id)).toEqual(['simulator', 'assessment']);
    expect(clientModules.every((module) => module.status === 'Available')).toBe(true);
    expect(clientModules.every((module) => module.href.startsWith('/?mode='))).toBe(true);
  });

  it('labels unfinished requirements as planned instead of implemented', () => {
    expect(plannedClientCapabilities.length).toBeGreaterThanOrEqual(4);
    expect(plannedClientCapabilities.join(' ')).toContain('Catheter placement');
    expect(plannedClientCapabilities.join(' ')).toContain('Weekly quizzes');
  });
});
