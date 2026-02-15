import { formatTranslationKey } from '../../shared/translation';

describe('formatTranslationKey', () => {
  it('should extract penultimate segment for keys with 3+ parts ending in .name', () => {
    expect(formatTranslationKey('server.npcRoles.Goblin_Hermit.name')).toBe('Goblin Hermit');
  });

  it('should extract penultimate segment for keys with 3+ parts', () => {
    expect(formatTranslationKey('server.map.region.Zone3_Tier1')).toBe('region');
  });

  it('should extract last segment for keys with exactly 2 parts', () => {
    expect(formatTranslationKey('item.Sword')).toBe('Sword');
  });

  it('should extract last segment for keys with exactly 1 part', () => {
    expect(formatTranslationKey('SinglePart')).toBe('SinglePart');
  });

  it('should replace underscores with spaces', () => {
    // For 3+ segments, returns penultimate (second-to-last) with underscores replaced
    expect(formatTranslationKey('server.npcRoles.Goblin_Hermit.name')).toBe('Goblin Hermit');
    expect(formatTranslationKey('a.Sub_Category_Name.z')).toBe('Sub Category Name');
  });

  it('should return empty string for empty input', () => {
    expect(formatTranslationKey('')).toBe('');
  });

  it('should handle keys with many segments', () => {
    expect(formatTranslationKey('a.b.c.d.e.f.Target_Name.final')).toBe('Target Name');
  });

  it('should handle keys with no underscores', () => {
    // For 3+ segments, returns penultimate segment
    expect(formatTranslationKey('server.items.DiamondSword')).toBe('items');
    // For 2 segments, returns last segment
    expect(formatTranslationKey('items.DiamondSword')).toBe('DiamondSword');
  });
});
