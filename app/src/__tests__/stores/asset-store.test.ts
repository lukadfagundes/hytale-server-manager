const mockGetAssetStatus = jest.fn();
const mockExtractAssets = jest.fn();
const mockOnAssetsExtracting = jest.fn();
const mockOnAssetsReady = jest.fn();
const mockOnAssetsError = jest.fn();

jest.mock('../../renderer/services/ipc-client', () => ({
  getAssetStatus: (...args: any[]) => mockGetAssetStatus(...args),
  extractAssets: (...args: any[]) => mockExtractAssets(...args),
  onAssetsExtracting: (...args: any[]) => mockOnAssetsExtracting(...args),
  onAssetsReady: (...args: any[]) => mockOnAssetsReady(...args),
  onAssetsError: (...args: any[]) => mockOnAssetsError(...args),
}));

import { useAssetStore } from '../../renderer/stores/asset-store';

describe('asset-store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    useAssetStore.setState({
      status: 'unknown',
      error: null,
    });
  });

  describe('initial state', () => {
    it('should start with unknown status', () => {
      const state = useAssetStore.getState();
      expect(state.status).toBe('unknown');
      expect(state.error).toBeNull();
    });
  });

  describe('init', () => {
    it('should check cached status and set ready when cached', async () => {
      mockGetAssetStatus.mockResolvedValue({ cached: true });
      const mockUnsub = jest.fn();
      mockOnAssetsExtracting.mockReturnValue(mockUnsub);
      mockOnAssetsReady.mockReturnValue(mockUnsub);
      mockOnAssetsError.mockReturnValue(mockUnsub);

      useAssetStore.getState().init();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useAssetStore.getState().status).toBe('ready');
    });

    it('should remain unknown when not cached', async () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      const mockUnsub = jest.fn();
      mockOnAssetsExtracting.mockReturnValue(mockUnsub);
      mockOnAssetsReady.mockReturnValue(mockUnsub);
      mockOnAssetsError.mockReturnValue(mockUnsub);

      useAssetStore.getState().init();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useAssetStore.getState().status).toBe('unknown');
    });

    it('should remain unknown when getAssetStatus fails', async () => {
      mockGetAssetStatus.mockRejectedValue(new Error('IPC error'));
      const mockUnsub = jest.fn();
      mockOnAssetsExtracting.mockReturnValue(mockUnsub);
      mockOnAssetsReady.mockReturnValue(mockUnsub);
      mockOnAssetsError.mockReturnValue(mockUnsub);

      useAssetStore.getState().init();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useAssetStore.getState().status).toBe('unknown');
    });

    it('should subscribe to IPC events', () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      mockOnAssetsExtracting.mockReturnValue(jest.fn());
      mockOnAssetsReady.mockReturnValue(jest.fn());
      mockOnAssetsError.mockReturnValue(jest.fn());

      useAssetStore.getState().init();

      expect(mockOnAssetsExtracting).toHaveBeenCalled();
      expect(mockOnAssetsReady).toHaveBeenCalled();
      expect(mockOnAssetsError).toHaveBeenCalled();
    });

    it('should transition to extracting on extracting event', async () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      let extractingCallback: () => void;
      mockOnAssetsExtracting.mockImplementation((cb: () => void) => {
        extractingCallback = cb;
        return jest.fn();
      });
      mockOnAssetsReady.mockReturnValue(jest.fn());
      mockOnAssetsError.mockReturnValue(jest.fn());

      useAssetStore.getState().init();
      extractingCallback!();

      expect(useAssetStore.getState().status).toBe('extracting');
    });

    it('should transition to ready on ready event', async () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      mockOnAssetsExtracting.mockReturnValue(jest.fn());
      let readyCallback: () => void;
      mockOnAssetsReady.mockImplementation((cb: () => void) => {
        readyCallback = cb;
        return jest.fn();
      });
      mockOnAssetsError.mockReturnValue(jest.fn());

      useAssetStore.getState().init();
      readyCallback!();

      expect(useAssetStore.getState().status).toBe('ready');
      expect(useAssetStore.getState().error).toBeNull();
    });

    it('should transition to error on error event', async () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      mockOnAssetsExtracting.mockReturnValue(jest.fn());
      mockOnAssetsReady.mockReturnValue(jest.fn());
      let errorCallback: (err: { message: string }) => void;
      mockOnAssetsError.mockImplementation((cb: (err: { message: string }) => void) => {
        errorCallback = cb;
        return jest.fn();
      });

      useAssetStore.getState().init();
      errorCallback!({ message: 'Assets.zip not found' });

      expect(useAssetStore.getState().status).toBe('error');
      expect(useAssetStore.getState().error).toBe('Assets.zip not found');
    });

    it('should unsubscribe from all events on cleanup', () => {
      mockGetAssetStatus.mockResolvedValue({ cached: false });
      const mockUnsub1 = jest.fn();
      const mockUnsub2 = jest.fn();
      const mockUnsub3 = jest.fn();
      mockOnAssetsExtracting.mockReturnValue(mockUnsub1);
      mockOnAssetsReady.mockReturnValue(mockUnsub2);
      mockOnAssetsError.mockReturnValue(mockUnsub3);

      const cleanup = useAssetStore.getState().init();
      cleanup();

      expect(mockUnsub1).toHaveBeenCalled();
      expect(mockUnsub2).toHaveBeenCalled();
      expect(mockUnsub3).toHaveBeenCalled();
    });
  });

  describe('triggerExtraction', () => {
    it('should set extracting status and call IPC', async () => {
      mockExtractAssets.mockResolvedValue({ success: true });

      await useAssetStore.getState().triggerExtraction();

      expect(mockExtractAssets).toHaveBeenCalled();
    });

    it('should set error when extraction fails', async () => {
      mockExtractAssets.mockResolvedValue({ success: false, error: 'No zip found' });

      await useAssetStore.getState().triggerExtraction();

      expect(useAssetStore.getState().status).toBe('error');
      expect(useAssetStore.getState().error).toBe('No zip found');
    });

    it('should set error when IPC call throws', async () => {
      mockExtractAssets.mockRejectedValue(new Error('IPC failure'));

      await useAssetStore.getState().triggerExtraction();

      expect(useAssetStore.getState().status).toBe('error');
      expect(useAssetStore.getState().error).toBe('IPC failure');
    });
  });
});
