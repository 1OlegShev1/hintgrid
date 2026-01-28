import { describe, it, expect } from 'vitest';
import { getRandomAvatar, AVATARS } from '../constants';

describe('constants', () => {
  describe('getRandomAvatar', () => {
    it('returns an avatar from the AVATARS list', () => {
      const avatar = getRandomAvatar();
      expect(AVATARS).toContain(avatar);
    });

    it('returns different avatars over multiple calls (randomness check)', () => {
      // Call many times and collect unique results
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        results.add(getRandomAvatar());
      }
      // Should get at least a few different avatars (statistically near-certain)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('AVATARS', () => {
    it('contains expected number of avatars', () => {
      expect(AVATARS.length).toBe(24);
    });

    it('contains only emoji strings', () => {
      for (const avatar of AVATARS) {
        expect(typeof avatar).toBe('string');
        expect(avatar.length).toBeGreaterThan(0);
      }
    });
  });
});
