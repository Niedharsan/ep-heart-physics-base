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
  it('uses the root route as the unified landing page', () => {
    expect(resolveClientPreviewRoute({ pathname: '/', search: '' })).toBe('home');
    expect(resolveClientPreviewRoute({ pathname: '/nested/', search: '' })).toBe('home');
  });

  it('resolves the retired simulator route to assessments', () => {
    expect(resolveClientPreviewRoute({ pathname: '/', search: '?mode=simulator' })).toBe('assessment');
    expect(resolveClientPreviewRoute({ pathname: '/', search: '?mode=assessment' })).toBe('assessment');
  });

  it('keeps the assessment path alias for direct module links', () => {
    expect(resolveClientPreviewRoute({ pathname: '/assessment/', search: '' })).toBe('assessment');
    expect(resolveClientPreviewRoute({ pathname: '/simulator', search: '' })).toBe('assessment');
  });

  it('publishes only working modules as available', () => {
    expect(clientModules.map((module) => module.id)).toEqual(['assessment']);
    expect(clientModules.every((module) => module.status === 'Available')).toBe(true);
    expect(clientModules.every((module) => module.href.startsWith('/?mode='))).toBe(true);
  });

  it('keeps Tasks 1-8 delivered while authentication remains planned', () => {
    const assessment = clientModules.find((module) => module.id === 'assessment');
    const delivered = assessment?.capabilities.join(' ') ?? '';
    const planned = plannedClientCapabilities.join(' ');
    for (const task of ['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5', 'Tasks 6-8']) {
      expect(delivered).toContain(task);
    }
    expect(assessment?.summary).toContain('Tasks 1-8');
    expect(planned).toContain('User login');
  });

  it('renders the compact landing page without obsolete preview copy', () => {
    const markup = renderToStaticMarkup(createElement(ClientPreviewHome));
    expect(markup).toContain('Learn EP through measurement and interpretation');
    expect(markup).toContain('Open assessments');
    expect(markup).not.toContain('Login-free preview');
    expect(markup).not.toContain('One place to review every available module');
    expect(markup).not.toContain('Planned assessment coverage');
  });
});
