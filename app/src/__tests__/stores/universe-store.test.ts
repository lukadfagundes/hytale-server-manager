// Mock IPC client functions before imports
const mockGetPlayers = jest.fn();
const mockGetWarps = jest.fn();
const mockGetWorldMap = jest.fn();
const mockOnDataRefresh = jest.fn();

jest.mock('../../renderer/services/ipc-client', () => ({
  getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
  getWarps: (...args: unknown[]) => mockGetWarps(...args),
  getWorldMap: (...args: unknown[]) => mockGetWorldMap(...args),
  onDataRefresh: (...args: unknown[]) => mockOnDataRefresh(...args),
}));

// Mock toast store
const mockAddToast = jest.fn();
jest.mock('../../renderer/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({ addToast: mockAddToast }),
  },
}));

import { useUniverseStore } from '../../renderer/stores/universe-store';

describe('universe-store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Reset the zustand store state between tests
    useUniverseStore.setState({
      players: [],
      warps: [],
      worldMap: null,
      loading: {},
      errors: {},
    });
  });

  describe('initial state', () => {
    it('should start with empty players', () => {
      expect(useUniverseStore.getState().players).toEqual([]);
    });

    it('should start with empty warps', () => {
      expect(useUniverseStore.getState().warps).toEqual([]);
    });

    it('should start with null worldMap', () => {
      expect(useUniverseStore.getState().worldMap).toBeNull();
    });

    it('should start with empty loading state', () => {
      expect(useUniverseStore.getState().loading).toEqual({});
    });

    it('should start with empty errors state', () => {
      expect(useUniverseStore.getState().errors).toEqual({});
    });
  });

  describe('fetchPlayers', () => {
    it('should set loading.players to true before IPC call', async () => {
      let loadingDuringCall = false;
      mockGetPlayers.mockImplementation(async () => {
        loadingDuringCall = useUniverseStore.getState().loading.players === true;
        return { data: [], errors: [] };
      });

      await useUniverseStore.getState().fetchPlayers();

      expect(loadingDuringCall).toBe(true);
    });

    it('should set loading.players to false after completion', async () => {
      mockGetPlayers.mockResolvedValue({ data: [], errors: [] });

      await useUniverseStore.getState().fetchPlayers();

      expect(useUniverseStore.getState().loading.players).toBe(false);
    });

    it('should store returned data in players', async () => {
      const mockPlayers = [
        { uuid: 'abc', name: 'Player1' },
        { uuid: 'def', name: 'Player2' },
      ];
      mockGetPlayers.mockResolvedValue({ data: mockPlayers, errors: [] });

      await useUniverseStore.getState().fetchPlayers();

      expect(useUniverseStore.getState().players).toEqual(mockPlayers);
    });

    it('should report non-empty errors array via toast', async () => {
      mockGetPlayers.mockResolvedValue({
        data: [],
        errors: ['Error reading player1.json', 'Error reading player2.json'],
      });

      await useUniverseStore.getState().fetchPlayers();

      expect(mockAddToast).toHaveBeenCalledWith('Error reading player1.json', 'warning');
      expect(mockAddToast).toHaveBeenCalledWith('Error reading player2.json', 'warning');
    });

    it('should store errors in errors.players', async () => {
      mockGetPlayers.mockResolvedValue({
        data: [],
        errors: ['Parse error'],
      });

      await useUniverseStore.getState().fetchPlayers();

      expect(useUniverseStore.getState().errors.players).toEqual(['Parse error']);
    });

    it('should not show toast when errors array is empty', async () => {
      mockGetPlayers.mockResolvedValue({ data: [], errors: [] });

      await useUniverseStore.getState().fetchPlayers();

      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('should handle IPC throw by setting error string', async () => {
      mockGetPlayers.mockRejectedValue(new Error('IPC failure'));

      await useUniverseStore.getState().fetchPlayers();

      expect(useUniverseStore.getState().errors.players).toEqual(['Error: IPC failure']);
      expect(useUniverseStore.getState().loading.players).toBe(false);
    });
  });

  describe('fetchWarps', () => {
    it('should set loading.warps to true before IPC call', async () => {
      let loadingDuringCall = false;
      mockGetWarps.mockImplementation(async () => {
        loadingDuringCall = useUniverseStore.getState().loading.warps === true;
        return { data: [], errors: [] };
      });

      await useUniverseStore.getState().fetchWarps();

      expect(loadingDuringCall).toBe(true);
    });

    it('should set loading.warps to false after completion', async () => {
      mockGetWarps.mockResolvedValue({ data: [], errors: [] });

      await useUniverseStore.getState().fetchWarps();

      expect(useUniverseStore.getState().loading.warps).toBe(false);
    });

    it('should store returned data in warps', async () => {
      const mockWarps = [
        { name: 'spawn', position: { x: 0, y: 64, z: 0 } },
        { name: 'home', position: { x: 100, y: 70, z: 100 } },
      ];
      mockGetWarps.mockResolvedValue({ data: mockWarps, errors: [] });

      await useUniverseStore.getState().fetchWarps();

      expect(useUniverseStore.getState().warps).toEqual(mockWarps);
    });

    it('should report errors via toast', async () => {
      mockGetWarps.mockResolvedValue({
        data: [],
        errors: ['Failed to parse warps.json'],
      });

      await useUniverseStore.getState().fetchWarps();

      expect(mockAddToast).toHaveBeenCalledWith('Failed to parse warps.json', 'warning');
    });

    it('should handle IPC throw', async () => {
      mockGetWarps.mockRejectedValue(new Error('Network error'));

      await useUniverseStore.getState().fetchWarps();

      expect(useUniverseStore.getState().errors.warps).toEqual(['Error: Network error']);
      expect(useUniverseStore.getState().loading.warps).toBe(false);
    });
  });

  describe('fetchWorldMap', () => {
    it('should set loading.worldMap to true before IPC call', async () => {
      let loadingDuringCall = false;
      mockGetWorldMap.mockImplementation(async () => {
        loadingDuringCall = useUniverseStore.getState().loading.worldMap === true;
        return {
          data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
          errors: [],
        };
      });

      await useUniverseStore.getState().fetchWorldMap();

      expect(loadingDuringCall).toBe(true);
    });

    it('should set loading.worldMap to false after completion', async () => {
      mockGetWorldMap.mockResolvedValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: [],
      });

      await useUniverseStore.getState().fetchWorldMap();

      expect(useUniverseStore.getState().loading.worldMap).toBe(false);
    });

    it('should store returned data in worldMap', async () => {
      const mockWorldData = {
        regions: [{ x: 0, z: 0 }],
        markers: [{ id: 'marker1', type: 'cave', position: { x: 10, y: 20, z: 30 } }],
        playerPositions: [{ name: 'Player1', position: { x: 5, y: 64, z: 5 } }],
        warpPositions: [{ name: 'spawn', position: { x: 0, y: 64, z: 0 } }],
      };
      mockGetWorldMap.mockResolvedValue({ data: mockWorldData, errors: [] });

      await useUniverseStore.getState().fetchWorldMap();

      expect(useUniverseStore.getState().worldMap).toEqual(mockWorldData);
    });

    it('should report errors via toast', async () => {
      mockGetWorldMap.mockResolvedValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: ['Region 0,0 corrupted'],
      });

      await useUniverseStore.getState().fetchWorldMap();

      expect(mockAddToast).toHaveBeenCalledWith('Region 0,0 corrupted', 'warning');
    });

    it('should handle IPC throw', async () => {
      mockGetWorldMap.mockRejectedValue(new Error('Timeout'));

      await useUniverseStore.getState().fetchWorldMap();

      expect(useUniverseStore.getState().errors.worldMap).toEqual(['Error: Timeout']);
      expect(useUniverseStore.getState().loading.worldMap).toBe(false);
    });
  });

  describe('initRefreshListener', () => {
    it('should subscribe to onDataRefresh', () => {
      mockOnDataRefresh.mockReturnValue(jest.fn());

      useUniverseStore.getState().initRefreshListener();

      expect(mockOnDataRefresh).toHaveBeenCalled();
    });

    it('should trigger fetchPlayers on "players" category', async () => {
      let refreshCallback: (category: string) => void;
      mockOnDataRefresh.mockImplementation((cb: (category: string) => void) => {
        refreshCallback = cb;
        return jest.fn();
      });
      mockGetPlayers.mockResolvedValue({ data: [], errors: [] });

      useUniverseStore.getState().initRefreshListener();
      refreshCallback!('players');

      // Wait for async fetchPlayers to be called
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetPlayers).toHaveBeenCalled();
    });

    it('should trigger fetchWarps on "warps" category', async () => {
      let refreshCallback: (category: string) => void;
      mockOnDataRefresh.mockImplementation((cb: (category: string) => void) => {
        refreshCallback = cb;
        return jest.fn();
      });
      mockGetWarps.mockResolvedValue({ data: [], errors: [] });

      useUniverseStore.getState().initRefreshListener();
      refreshCallback!('warps');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetWarps).toHaveBeenCalled();
    });

    it('should trigger fetchWorldMap on "worldMap" category', async () => {
      let refreshCallback: (category: string) => void;
      mockOnDataRefresh.mockImplementation((cb: (category: string) => void) => {
        refreshCallback = cb;
        return jest.fn();
      });
      mockGetWorldMap.mockResolvedValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: [],
      });

      useUniverseStore.getState().initRefreshListener();
      refreshCallback!('worldMap');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockGetWorldMap).toHaveBeenCalled();
    });

    it('should ignore unknown categories without crashing', async () => {
      let refreshCallback: (category: string) => void;
      mockOnDataRefresh.mockImplementation((cb: (category: string) => void) => {
        refreshCallback = cb;
        return jest.fn();
      });

      useUniverseStore.getState().initRefreshListener();

      // Should not throw
      expect(() => refreshCallback!('unknownCategory')).not.toThrow();
    });

    it('should return unsubscribe function from onDataRefresh', () => {
      const mockUnsub = jest.fn();
      mockOnDataRefresh.mockReturnValue(mockUnsub);

      const cleanup = useUniverseStore.getState().initRefreshListener();

      expect(cleanup).toBe(mockUnsub);
    });
  });

  describe('loading state isolation', () => {
    it('should not affect other loading states when one category loads', async () => {
      useUniverseStore.setState({
        loading: { warps: true },
      });

      mockGetPlayers.mockResolvedValue({ data: [], errors: [] });

      await useUniverseStore.getState().fetchPlayers();

      // players loading should be false, but warps should remain true
      expect(useUniverseStore.getState().loading.players).toBe(false);
      expect(useUniverseStore.getState().loading.warps).toBe(true);
    });
  });

  describe('error state isolation', () => {
    it('should not affect other error states when one category errors', async () => {
      useUniverseStore.setState({
        errors: { warps: ['existing warp error'] },
      });

      mockGetPlayers.mockRejectedValue(new Error('player error'));

      await useUniverseStore.getState().fetchPlayers();

      expect(useUniverseStore.getState().errors.players).toEqual(['Error: player error']);
      expect(useUniverseStore.getState().errors.warps).toEqual(['existing warp error']);
    });
  });
});
