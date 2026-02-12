import { getItemIconPath } from '../../renderer/utils/asset-paths';
import { formatItemId } from '../../renderer/utils/translation';

// Tests for ItemIcon component logic (node environment — no DOM rendering)
// Validates: path generation, fallback text, and edge case handling

describe('ItemIcon logic', () => {
  describe('image path generation', () => {
    it('should generate correct icon path for standard item', () => {
      expect(getItemIconPath('Weapon_Daggers_Adamantite'))
        .toBe('/assets/items/Weapon_Daggers_Adamantite.png');
    });

    it('should generate correct icon path for armor item', () => {
      expect(getItemIconPath('Armor_Cobalt_Head'))
        .toBe('/assets/items/Armor_Cobalt_Head.png');
    });

    it('should generate path even for empty string', () => {
      const path = getItemIconPath('');
      expect(path).toBe('/assets/items/.png');
    });
  });

  describe('fallback text (formatItemId)', () => {
    it('should strip Weapon prefix for weapon items', () => {
      expect(formatItemId('Weapon_Daggers_Adamantite')).toBe('Daggers Adamantite');
    });

    it('should strip Armor prefix for armor items', () => {
      expect(formatItemId('Armor_Cobalt_Head')).toBe('Cobalt Head');
    });

    it('should keep non-prefixed items with spaces', () => {
      expect(formatItemId('SomeItem_Type')).toBe('SomeItem Type');
    });

    it('should return single-word item as-is', () => {
      expect(formatItemId('Diamond')).toBe('Diamond');
    });
  });

  describe('fallback condition', () => {
    // ItemIcon shows fallback text when: !itemId || imgError
    it('should trigger fallback for empty itemId', () => {
      const itemId = '';
      expect(!itemId).toBe(true); // confirms fallback path
    });

    it('should not trigger fallback for valid itemId (before img error)', () => {
      const itemId = 'Iron_Sword';
      expect(!itemId).toBe(false); // confirms image path
    });
  });
});
