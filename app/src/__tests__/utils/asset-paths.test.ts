import {
  getItemIconPath,
  getNpcPortraitPath,
  getMapMarkerPath,
  resetIconMap,
} from '../../renderer/utils/asset-paths';

beforeEach(() => {
  resetIconMap();
});

describe('getItemIconPath', () => {
  it('should return correct asset:// path for standard item ID', () => {
    expect(getItemIconPath('Iron_Sword')).toBe('asset:///items/Iron_Sword.png');
  });

  it('should handle item IDs with numbers', () => {
    expect(getItemIconPath('Tier3_Shield')).toBe('asset:///items/Tier3_Shield.png');
  });

  it('should handle single-word item IDs', () => {
    expect(getItemIconPath('Diamond')).toBe('asset:///items/Diamond.png');
  });

  it('should return path for empty string without crashing', () => {
    expect(getItemIconPath('')).toBe('asset:///items/.png');
  });
});

describe('getNpcPortraitPath', () => {
  it('should return correct asset:// path for NPC role', () => {
    expect(getNpcPortraitPath('Goblin_Hermit')).toBe('asset:///npcs/Goblin_Hermit.png');
  });

  it('should handle single-word roles', () => {
    expect(getNpcPortraitPath('Pufferfish')).toBe('asset:///npcs/Pufferfish.png');
  });
});

describe('getMapMarkerPath', () => {
  it('should return correct asset:// path for marker type', () => {
    expect(getMapMarkerPath('Player')).toBe('asset:///map-markers/Player.png');
  });

  it('should handle compound marker names', () => {
    expect(getMapMarkerPath('Temple_Gateway')).toBe('asset:///map-markers/Temple_Gateway.png');
  });
});

describe('resetIconMap', () => {
  it('should clear cached icon map', () => {
    // After reset, getItemIconPath should return the raw ID (no map redirect)
    resetIconMap();
    expect(getItemIconPath('SomeItem')).toBe('asset:///items/SomeItem.png');
  });
});
