import { describe, expect, it } from 'vitest';

import { featureDefinitions } from '@shared/content/features';

describe('featureDefinitions', () => {
  it('lists all four learning modes with stable routes', () => {
    const keys = featureDefinitions.map((f) => f.key);
    expect(keys.sort()).toEqual(['audiobook', 'comprehension', 'phonics', 'visualization']);
    for (const f of featureDefinitions) {
      expect(f.route).toMatch(/^\//);
    }
  });
});
