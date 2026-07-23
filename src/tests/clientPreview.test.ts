import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ClientPreviewHome } from '../clientPreview/ClientPreviewHome';
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

  it('advertises completed Tasks 1-4 and keeps Task 5 planned', () => {
    const assessment = clientModules.find((module) => module.id === 'assessment');
    const delivered = assessment?.capabilities.join(' ') ?? '';
    const planned = plannedClientCapabilities.join(' ');
    expect(delivered).toContain('Task 1');
    expect(delivered).toContain('Task 2');
    expect(delivered).toContain('Task 3');
    expect(delivered).toContain('Task 4');
    expect(delivered).toContain('structured client feedback');
    expect(planned).not.toContain('Arrhythmia and ECG pattern-recognition');
    expect(planned).not.toContain('Task 4 and Task 5');
    expect(planned).toContain('Task 5');
    expect(planned).toContain('Weekly quizzes');
  });

  it('links the review guide to the completed Task 4 feedback panel', () => {
    const markup = renderToStaticMarkup(createElement(ClientPreviewHome));
    expect(markup).toContain('/?mode=assessment&amp;task=4#feedback');
    expect(markup).toContain('Open Task 4 feedback panel');
  });
});
