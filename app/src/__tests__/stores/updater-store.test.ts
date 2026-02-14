// Mock localStorage before imports
const mockLocalStorage: Record<string, string> = {};
const mockLocalStorageGetItem = jest.fn((key: string) => mockLocalStorage[key] || null);
const mockLocalStorageSetItem = jest.fn((key: string, value: string) => {
  mockLocalStorage[key] = value;
});

// @ts-expect-error -- Mocking global localStorage
global.localStorage = {
  getItem: mockLocalStorageGetItem,
  setItem: mockLocalStorageSetItem,
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Mock IPC client functions before imports
const mockCheckForUpdates = jest.fn();
const mockDownloadUpdate = jest.fn();
const mockInstallUpdate = jest.fn();
const mockGetAppVersion = jest.fn();
const mockOnUpdaterChecking = jest.fn();
const mockOnUpdaterAvailable = jest.fn();
const mockOnUpdaterNotAvailable = jest.fn();
const mockOnUpdaterProgress = jest.fn();
const mockOnUpdaterDownloaded = jest.fn();
const mockOnUpdaterError = jest.fn();

jest.mock('../../renderer/services/ipc-client', () => ({
  checkForUpdates: (...args: unknown[]) => mockCheckForUpdates(...args),
  downloadUpdate: (...args: unknown[]) => mockDownloadUpdate(...args),
  installUpdate: (...args: unknown[]) => mockInstallUpdate(...args),
  getAppVersion: (...args: unknown[]) => mockGetAppVersion(...args),
  onUpdaterChecking: (...args: unknown[]) => mockOnUpdaterChecking(...args),
  onUpdaterAvailable: (...args: unknown[]) => mockOnUpdaterAvailable(...args),
  onUpdaterNotAvailable: (...args: unknown[]) => mockOnUpdaterNotAvailable(...args),
  onUpdaterProgress: (...args: unknown[]) => mockOnUpdaterProgress(...args),
  onUpdaterDownloaded: (...args: unknown[]) => mockOnUpdaterDownloaded(...args),
  onUpdaterError: (...args: unknown[]) => mockOnUpdaterError(...args),
}));

// Mock toast store
const mockAddToast = jest.fn();
jest.mock('../../renderer/stores/toast-store', () => ({
  useToastStore: {
    getState: () => ({ addToast: mockAddToast }),
  },
}));

import { useUpdaterStore } from '../../renderer/stores/updater-store';

describe('updater-store', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Clear mock localStorage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    // Reset the zustand store state between tests
    useUpdaterStore.setState({
      status: 'idle',
      updateInfo: null,
      downloadProgress: null,
      error: null,
      skippedVersion: null,
      dismissed: false,
      appVersion: '',
    });
  });

  describe('initial state', () => {
    it('should start with idle status', () => {
      expect(useUpdaterStore.getState().status).toBe('idle');
    });

    it('should start with null updateInfo', () => {
      expect(useUpdaterStore.getState().updateInfo).toBeNull();
    });

    it('should start with null downloadProgress', () => {
      expect(useUpdaterStore.getState().downloadProgress).toBeNull();
    });

    it('should start with null error', () => {
      expect(useUpdaterStore.getState().error).toBeNull();
    });

    it('should start with dismissed as false', () => {
      expect(useUpdaterStore.getState().dismissed).toBe(false);
    });

    it('should start with empty appVersion', () => {
      expect(useUpdaterStore.getState().appVersion).toBe('');
    });
  });

  describe('checkForUpdates', () => {
    it('should call IPC checkForUpdates', async () => {
      mockCheckForUpdates.mockResolvedValue(undefined);

      await useUpdaterStore.getState().checkForUpdates();

      expect(mockCheckForUpdates).toHaveBeenCalled();
    });

    it('should show toast on error', async () => {
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      await useUpdaterStore.getState().checkForUpdates();

      expect(mockAddToast).toHaveBeenCalledWith('Update check failed: Network error', 'error');
    });
  });

  describe('downloadUpdate', () => {
    it('should set status to downloading', async () => {
      mockDownloadUpdate.mockResolvedValue(undefined);

      await useUpdaterStore.getState().downloadUpdate();

      expect(useUpdaterStore.getState().status).toBe('downloading');
    });

    it('should clear downloadProgress', async () => {
      useUpdaterStore.setState({
        downloadProgress: { percent: 50, bytesPerSecond: 1000, transferred: 500, total: 1000 },
      });
      mockDownloadUpdate.mockResolvedValue(undefined);

      await useUpdaterStore.getState().downloadUpdate();

      expect(useUpdaterStore.getState().downloadProgress).toBeNull();
    });

    it('should call IPC downloadUpdate', async () => {
      mockDownloadUpdate.mockResolvedValue(undefined);

      await useUpdaterStore.getState().downloadUpdate();

      expect(mockDownloadUpdate).toHaveBeenCalled();
    });

    it('should show toast on error', async () => {
      mockDownloadUpdate.mockRejectedValue(new Error('Download failed'));

      await useUpdaterStore.getState().downloadUpdate();

      expect(mockAddToast).toHaveBeenCalledWith('Download failed: Download failed', 'error');
    });
  });

  describe('installUpdate', () => {
    it('should call IPC installUpdate', () => {
      useUpdaterStore.getState().installUpdate();

      expect(mockInstallUpdate).toHaveBeenCalled();
    });
  });

  describe('skipVersion', () => {
    it('should write to localStorage', () => {
      useUpdaterStore.getState().skipVersion('2.0.0');

      expect(mockLocalStorageSetItem).toHaveBeenCalledWith(
        'hytale-server:skipped-update-version',
        '2.0.0'
      );
    });

    it('should set skippedVersion in store', () => {
      useUpdaterStore.getState().skipVersion('2.0.0');

      expect(useUpdaterStore.getState().skippedVersion).toBe('2.0.0');
    });

    it('should set dismissed to true', () => {
      useUpdaterStore.getState().skipVersion('2.0.0');

      expect(useUpdaterStore.getState().dismissed).toBe(true);
    });

    it('should set status to idle', () => {
      useUpdaterStore.setState({ status: 'available' });

      useUpdaterStore.getState().skipVersion('2.0.0');

      expect(useUpdaterStore.getState().status).toBe('idle');
    });
  });

  describe('remindLater', () => {
    it('should set dismissed to true', () => {
      useUpdaterStore.getState().remindLater();

      expect(useUpdaterStore.getState().dismissed).toBe(true);
    });
  });

  describe('init', () => {
    beforeEach(() => {
      mockGetAppVersion.mockResolvedValue('1.0.0');
      mockOnUpdaterChecking.mockReturnValue(jest.fn());
      mockOnUpdaterAvailable.mockReturnValue(jest.fn());
      mockOnUpdaterNotAvailable.mockReturnValue(jest.fn());
      mockOnUpdaterProgress.mockReturnValue(jest.fn());
      mockOnUpdaterDownloaded.mockReturnValue(jest.fn());
      mockOnUpdaterError.mockReturnValue(jest.fn());
    });

    it('should fetch and set app version', async () => {
      mockGetAppVersion.mockResolvedValue('1.5.0');

      useUpdaterStore.getState().init();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(useUpdaterStore.getState().appVersion).toBe('1.5.0');
    });

    it('should subscribe to all 6 updater IPC events', () => {
      useUpdaterStore.getState().init();

      expect(mockOnUpdaterChecking).toHaveBeenCalled();
      expect(mockOnUpdaterAvailable).toHaveBeenCalled();
      expect(mockOnUpdaterNotAvailable).toHaveBeenCalled();
      expect(mockOnUpdaterProgress).toHaveBeenCalled();
      expect(mockOnUpdaterDownloaded).toHaveBeenCalled();
      expect(mockOnUpdaterError).toHaveBeenCalled();
    });

    describe('event handlers', () => {
      it('should set status to "checking" on checking event', () => {
        let checkingCallback: () => void;
        mockOnUpdaterChecking.mockImplementation((cb: () => void) => {
          checkingCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        checkingCallback!();

        expect(useUpdaterStore.getState().status).toBe('checking');
      });

      it('should set status to "available" and updateInfo on available event', () => {
        let availableCallback: (info: unknown) => void;
        mockOnUpdaterAvailable.mockImplementation((cb: (info: unknown) => void) => {
          availableCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        availableCallback!({ version: '2.0.0', releaseDate: '2026-02-14', releaseNotes: 'New' });

        expect(useUpdaterStore.getState().status).toBe('available');
        expect(useUpdaterStore.getState().updateInfo).toEqual({
          version: '2.0.0',
          releaseDate: '2026-02-14',
          releaseNotes: 'New',
        });
        expect(useUpdaterStore.getState().dismissed).toBe(false);
      });

      it('should set status to "not-available" when available version is skipped', () => {
        let availableCallback: (info: unknown) => void;
        mockOnUpdaterAvailable.mockImplementation((cb: (info: unknown) => void) => {
          availableCallback = cb;
          return jest.fn();
        });

        // Set skipped version first
        useUpdaterStore.setState({ skippedVersion: '2.0.0' });

        useUpdaterStore.getState().init();
        availableCallback!({ version: '2.0.0', releaseDate: '2026-02-14', releaseNotes: 'New' });

        expect(useUpdaterStore.getState().status).toBe('not-available');
      });

      it('should allow update when version is different from skipped', () => {
        let availableCallback: (info: unknown) => void;
        mockOnUpdaterAvailable.mockImplementation((cb: (info: unknown) => void) => {
          availableCallback = cb;
          return jest.fn();
        });

        // Set a different skipped version
        useUpdaterStore.setState({ skippedVersion: '1.9.0' });

        useUpdaterStore.getState().init();
        availableCallback!({ version: '2.0.0', releaseDate: '2026-02-14', releaseNotes: 'New' });

        expect(useUpdaterStore.getState().status).toBe('available');
      });

      it('should set status to "not-available" on not-available event', () => {
        let notAvailableCallback: () => void;
        mockOnUpdaterNotAvailable.mockImplementation((cb: () => void) => {
          notAvailableCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        notAvailableCallback!();

        expect(useUpdaterStore.getState().status).toBe('not-available');
      });

      it('should set status to "downloading" and downloadProgress on progress event', () => {
        let progressCallback: (progress: unknown) => void;
        mockOnUpdaterProgress.mockImplementation((cb: (progress: unknown) => void) => {
          progressCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        progressCallback!({ percent: 50, bytesPerSecond: 1024, transferred: 512, total: 1024 });

        expect(useUpdaterStore.getState().status).toBe('downloading');
        expect(useUpdaterStore.getState().downloadProgress).toEqual({
          percent: 50,
          bytesPerSecond: 1024,
          transferred: 512,
          total: 1024,
        });
      });

      it('should set status to "downloaded" and updateInfo on downloaded event', () => {
        let downloadedCallback: (info: unknown) => void;
        mockOnUpdaterDownloaded.mockImplementation((cb: (info: unknown) => void) => {
          downloadedCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        downloadedCallback!({ version: '2.0.0', releaseDate: '2026-02-14', releaseNotes: 'Ready' });

        expect(useUpdaterStore.getState().status).toBe('downloaded');
        expect(useUpdaterStore.getState().updateInfo).toEqual({
          version: '2.0.0',
          releaseDate: '2026-02-14',
          releaseNotes: 'Ready',
        });
        expect(useUpdaterStore.getState().dismissed).toBe(false);
      });

      it('should set status to "error" and error message on error event', () => {
        let errorCallback: (error: unknown) => void;
        mockOnUpdaterError.mockImplementation((cb: (error: unknown) => void) => {
          errorCallback = cb;
          return jest.fn();
        });

        useUpdaterStore.getState().init();
        errorCallback!({ message: 'Update error occurred' });

        expect(useUpdaterStore.getState().status).toBe('error');
        expect(useUpdaterStore.getState().error).toBe('Update error occurred');
        expect(useUpdaterStore.getState().dismissed).toBe(false);
      });
    });

    it('should return cleanup function that calls all 6 unsubscribe functions', () => {
      const mockUnsub1 = jest.fn();
      const mockUnsub2 = jest.fn();
      const mockUnsub3 = jest.fn();
      const mockUnsub4 = jest.fn();
      const mockUnsub5 = jest.fn();
      const mockUnsub6 = jest.fn();

      mockOnUpdaterChecking.mockReturnValue(mockUnsub1);
      mockOnUpdaterAvailable.mockReturnValue(mockUnsub2);
      mockOnUpdaterNotAvailable.mockReturnValue(mockUnsub3);
      mockOnUpdaterProgress.mockReturnValue(mockUnsub4);
      mockOnUpdaterDownloaded.mockReturnValue(mockUnsub5);
      mockOnUpdaterError.mockReturnValue(mockUnsub6);

      const cleanup = useUpdaterStore.getState().init();
      cleanup();

      expect(mockUnsub1).toHaveBeenCalled();
      expect(mockUnsub2).toHaveBeenCalled();
      expect(mockUnsub3).toHaveBeenCalled();
      expect(mockUnsub4).toHaveBeenCalled();
      expect(mockUnsub5).toHaveBeenCalled();
      expect(mockUnsub6).toHaveBeenCalled();
    });
  });

  describe('skippedVersion persistence', () => {
    it('should persist skipped version to localStorage when skipVersion is called', () => {
      // Clear call history
      mockLocalStorageSetItem.mockClear();

      useUpdaterStore.getState().skipVersion('3.0.0');

      expect(mockLocalStorageSetItem).toHaveBeenCalledWith(
        'hytale-server:skipped-update-version',
        '3.0.0'
      );
    });

    it('should use persisted skipped version to filter available updates', () => {
      // Set up the skipped version in store state (simulating read from localStorage)
      useUpdaterStore.setState({ skippedVersion: '2.0.0' });

      let availableCallback: (info: unknown) => void;
      mockOnUpdaterAvailable.mockImplementation((cb: (info: unknown) => void) => {
        availableCallback = cb;
        return jest.fn();
      });
      mockOnUpdaterChecking.mockReturnValue(jest.fn());
      mockOnUpdaterNotAvailable.mockReturnValue(jest.fn());
      mockOnUpdaterProgress.mockReturnValue(jest.fn());
      mockOnUpdaterDownloaded.mockReturnValue(jest.fn());
      mockOnUpdaterError.mockReturnValue(jest.fn());
      mockGetAppVersion.mockResolvedValue('1.0.0');

      useUpdaterStore.getState().init();
      availableCallback!({ version: '2.0.0', releaseDate: '2026-02-14', releaseNotes: 'Skipped' });

      // Should be suppressed because version matches skipped
      expect(useUpdaterStore.getState().status).toBe('not-available');
    });
  });
});
