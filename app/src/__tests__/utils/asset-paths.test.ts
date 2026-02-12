import {
  getItemIconPath,
  getNpcPortraitPath,
  getMapMarkerPath,
} from '../../renderer/utils/asset-paths';

describe('getItemIconPath', () => {
  it('should return correct path for standard item ID', () => {
    expect(getItemIconPath('Iron_Sword')).toBe('/assets/items/Iron_Sword.png');
  });

  it('should handle item IDs with numbers', () => {
    expect(getItemIconPath('Tier3_Shield')).toBe('/assets/items/Tier3_Shield.png');
  });

  it('should handle single-word item IDs', () => {
    expect(getItemIconPath('Diamond')).toBe('/assets/items/Diamond.png');
  });

  it('should return path for empty string without crashing', () => {
    expect(getItemIconPath('')).toBe('/assets/items/.png');
  });
});

describe('getNpcPortraitPath', () => {
  it('should return correct path for NPC role', () => {
    expect(getNpcPortraitPath('Goblin_Hermit')).toBe('/assets/npcs/Goblin_Hermit.png');
  });

  it('should handle single-word roles', () => {
    expect(getNpcPortraitPath('Pufferfish')).toBe('/assets/npcs/Pufferfish.png');
  });
});

describe('getMapMarkerPath', () => {
  it('should return correct path for marker type', () => {
    expect(getMapMarkerPath('Player')).toBe('/assets/map-markers/Player.png');
  });

  it('should handle compound marker names', () => {
    expect(getMapMarkerPath('Temple_Gateway')).toBe('/assets/map-markers/Temple_Gateway.png');
  });
});
