import { describe, expect, it } from 'vitest';

import { featureDefinitions } from '@shared/content/features';
import type { FeatureKey } from '@shared/types/features';

/** Mirrors `routeForFeature` in FeaturesStoryHubPage — keep in sync. */
function routeForFeature(key: FeatureKey, storyId: string): string {
  const u = new URLSearchParams();
  u.set('storyId', storyId);
  if (key === 'audiobook') {
    return `/audiobook/player?${u.toString()}`;
  }
  const base = featureDefinitions.find((f) => f.key === key)?.route ?? '/';
  return `${base}?${u.toString()}`;
}

describe('features hub deep links', () => {
  const sid = 'abc-123';

  it('passes storyId for every feature route', () => {
    const keys: FeatureKey[] = ['phonics', 'comprehension', 'visualization', 'audiobook'];
    for (const k of keys) {
      expect(routeForFeature(k, sid)).toContain('storyId=abc-123');
    }
  });

  it('sends audiobook to the player route (not the input page)', () => {
    expect(routeForFeature('audiobook', sid)).toMatch(/^\/audiobook\/player\?/);
  });

  it('uses a stable hub path for back navigation targets', () => {
    expect(`/features/${encodeURIComponent(sid)}`).toBe('/features/abc-123');
  });
});
