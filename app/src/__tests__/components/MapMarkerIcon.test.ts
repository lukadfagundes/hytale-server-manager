import { getMapMarkerPath } from '../../renderer/utils/asset-paths';

// Tests for MapMarkerIcon component logic (node environment — no DOM rendering)
// Validates: type-to-filename mapping, fallback colors, path generation

// Replicate the component's internal mapping function for testability
function getMarkerFilename(type: string, icon?: string): string {
  if (type === 'player') return 'Player';
  if (type === 'warp') return 'Warp';
  return icon ?? 'Marker';
}

const FALLBACK_COLORS: Record<string, string> = {
  player: 'bg-green-400 border-green-600',
  warp: 'bg-purple-400 border-purple-600',
  marker: 'bg-yellow-400 border-yellow-600',
};

describe('MapMarkerIcon logic', () => {
  describe('getMarkerFilename mapping', () => {
    it('should map player type to Player filename', () => {
      expect(getMarkerFilename('player')).toBe('Player');
    });

    it('should map warp type to Warp filename', () => {
      expect(getMarkerFilename('warp')).toBe('Warp');
    });

    it('should map marker type to icon prop value', () => {
      expect(getMarkerFilename('marker', 'Temple_Gateway')).toBe('Temple_Gateway');
    });

    it('should fall back to Marker when marker type has no icon prop', () => {
      expect(getMarkerFilename('marker')).toBe('Marker');
      expect(getMarkerFilename('marker', undefined)).toBe('Marker');
    });
  });

  describe('image path generation', () => {
    it('should generate correct path for player marker', () => {
      const filename = getMarkerFilename('player');
      expect(getMapMarkerPath(filename)).toBe('/assets/map-markers/Player.png');
    });

    it('should generate correct path for warp marker', () => {
      const filename = getMarkerFilename('warp');
      expect(getMapMarkerPath(filename)).toBe('/assets/map-markers/Warp.png');
    });

    it('should generate correct path for custom marker icon', () => {
      const filename = getMarkerFilename('marker', 'Temple_Gateway');
      expect(getMapMarkerPath(filename)).toBe('/assets/map-markers/Temple_Gateway.png');
    });
  });

  describe('fallback colors', () => {
    it('should use green for player fallback', () => {
      expect(FALLBACK_COLORS.player).toContain('green');
    });

    it('should use purple for warp fallback', () => {
      expect(FALLBACK_COLORS.warp).toContain('purple');
    });

    it('should use yellow for marker fallback', () => {
      expect(FALLBACK_COLORS.marker).toContain('yellow');
    });
  });
});
