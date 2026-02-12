import { formatTranslationKey, formatItemId } from '../../renderer/utils/translation';

describe('formatTranslationKey', () => {
  it('should extract NPC name with underscores replaced by spaces', () => {
    expect(formatTranslationKey('server.npcRoles.Goblin_Hermit.name')).toBe('Goblin Hermit');
  });

  it('should pick second-to-last segment for keys with 3+ parts', () => {
    // 4 parts: server.map.region.Zone3_Tier1 → picks 'region' (index length-2)
    expect(formatTranslationKey('server.map.region.Zone3_Tier1')).toBe('region');
  });

  it('should extract zone name when it is the second-to-last part', () => {
    expect(formatTranslationKey('server.map.Zone3_Tier1.name')).toBe('Zone3 Tier1');
  });

  it('should return single segment as-is (no dots)', () => {
    expect(formatTranslationKey('itemId')).toBe('itemId');
  });

  it('should extract last part when only two segments', () => {
    expect(formatTranslationKey('no.underscores')).toBe('underscores');
  });

  it('should handle empty string', () => {
    expect(formatTranslationKey('')).toBe('');
  });

  it('should handle names with no underscores', () => {
    expect(formatTranslationKey('server.npcRoles.Pufferfish.name')).toBe('Pufferfish');
  });

  it('should handle multiple underscores', () => {
    expect(formatTranslationKey('server.items.Long_Sword_Of_Fire.desc')).toBe('Long Sword Of Fire');
  });
});

describe('formatItemId', () => {
  it('should strip Weapon prefix and join with spaces', () => {
    expect(formatItemId('Weapon_Daggers_Adamantite')).toBe('Daggers Adamantite');
  });

  it('should strip Armor prefix', () => {
    expect(formatItemId('Armor_Cobalt_Head')).toBe('Cobalt Head');
  });

  it('should strip Tool prefix', () => {
    expect(formatItemId('Tool_Pickaxe_Iron')).toBe('Pickaxe Iron');
  });

  it('should strip Food prefix', () => {
    expect(formatItemId('Food_Apple')).toBe('Apple');
  });

  it('should strip Furniture prefix', () => {
    expect(formatItemId('Furniture_Wooden_Chair')).toBe('Wooden Chair');
  });

  it('should strip Potion prefix', () => {
    expect(formatItemId('Potion_Health_Large')).toBe('Health Large');
  });

  it('should strip EditorTool prefix', () => {
    expect(formatItemId('EditorTool_Brush')).toBe('Brush');
  });

  it('should keep non-prefixed items with spaces replacing underscores', () => {
    expect(formatItemId('SomeItem_Type')).toBe('SomeItem Type');
  });

  it('should return item with no underscores as-is', () => {
    expect(formatItemId('Diamond')).toBe('Diamond');
  });
});
