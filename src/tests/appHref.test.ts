import { describe, expect, it } from 'vitest';
import { buildAppHref } from '../appHref';

describe('deployment-safe application links', () => {
  it('keeps navigation inside a GitHub Pages repository subpath', () => {
    expect(buildAppHref('/ep-heart-physics-base/', 'mode=assessment'))
      .toBe('/ep-heart-physics-base/?mode=assessment');
    expect(buildAppHref('/ep-heart-physics-base', 'mode=simulator'))
      .toBe('/ep-heart-physics-base/?mode=simulator');
  });

  it('builds root-hosted links for Vercel and preserves fragments', () => {
    expect(buildAppHref('/', '?mode=assessment', '#feedback'))
      .toBe('/?mode=assessment#feedback');
    expect(buildAppHref('/', '', 'feedback')).toBe('/#feedback');
  });
});
