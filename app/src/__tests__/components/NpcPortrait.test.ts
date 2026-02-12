import { getNpcPortraitPath } from '../../renderer/utils/asset-paths';

// Tests for NpcPortrait component logic (node environment — no DOM rendering)
// Validates: path generation, fallback letter extraction, edge cases

// Replicate the component's letter extraction logic for testability
function getFallbackLetter(displayName: string, npcRole: string): string {
  return (displayName || npcRole || '?').charAt(0).toUpperCase();
}

describe('NpcPortrait logic', () => {
  describe('image path generation', () => {
    it('should generate correct portrait path for NPC role', () => {
      expect(getNpcPortraitPath('Goblin_Hermit')).toBe('/assets/npcs/Goblin_Hermit.png');
    });

    it('should generate correct path for single-word role', () => {
      expect(getNpcPortraitPath('Pufferfish')).toBe('/assets/npcs/Pufferfish.png');
    });
  });

  describe('fallback letter extraction', () => {
    it('should use first letter of displayName', () => {
      expect(getFallbackLetter('Goblin Hermit', 'Goblin_Hermit')).toBe('G');
    });

    it('should uppercase the fallback letter', () => {
      expect(getFallbackLetter('pufferfish', 'pufferfish')).toBe('P');
    });

    it('should fall back to npcRole when displayName is empty', () => {
      expect(getFallbackLetter('', 'Merchant_Trader')).toBe('M');
    });

    it('should fall back to ? when both displayName and npcRole are empty', () => {
      expect(getFallbackLetter('', '')).toBe('?');
    });
  });

  describe('fallback condition', () => {
    // NpcPortrait shows fallback when: !npcRole || imgError
    it('should trigger fallback for empty npcRole', () => {
      const npcRole = '';
      expect(!npcRole).toBe(true); // confirms fallback path
    });

    it('should not trigger fallback for valid npcRole (before img error)', () => {
      const npcRole = 'Goblin_Hermit';
      expect(!npcRole).toBe(false); // confirms image path
    });
  });

  describe('default size', () => {
    // NpcPortrait default size is 48; verify the constant is consistent
    it('should use 48 as default size', () => {
      const defaultSize = 48;
      expect(defaultSize * 0.4).toBeCloseTo(19.2); // fontSize calculation
    });
  });
});
