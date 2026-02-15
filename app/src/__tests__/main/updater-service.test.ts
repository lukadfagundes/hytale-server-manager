// Mock modules before any imports
const mockAutoUpdaterOn = jest.fn();
const mockCheckForUpdates = jest.fn();
const mockDownloadUpdate = jest.fn();
const mockQuitAndInstall = jest.fn();
const mockWebContentsSend = jest.fn();

// Create a mutable mock object for autoUpdater
const mockAutoUpdater = {
  on: mockAutoUpdaterOn,
  checkForUpdates: mockCheckForUpdates,
  downloadUpdate: mockDownloadUpdate,
  quitAndInstall: mockQuitAndInstall,
  autoDownload: false as boolean,
  autoInstallOnAppQuit: false as boolean,
};

jest.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

const mockGetAllWindows = jest.fn();

jest.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '1.0.0',
  },
  BrowserWindow: {
    getAllWindows: mockGetAllWindows,
  },
}));

import { IPC } from '../../shared/constants';

describe('updater-service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let eventHandlers: Record<string, (...args: any[]) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    eventHandlers = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAutoUpdaterOn.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      eventHandlers[event] = handler;
    });

    mockCheckForUpdates.mockResolvedValue({});
    mockDownloadUpdate.mockResolvedValue({});

    // Reset autoUpdater state
    mockAutoUpdater.autoDownload = false;
    mockAutoUpdater.autoInstallOnAppQuit = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to reload the module
  function loadUpdaterService() {
    jest.resetModules();
    // Re-setup the mock after resetModules
    jest.doMock('electron-updater', () => ({
      autoUpdater: mockAutoUpdater,
    }));
    jest.doMock('electron', () => ({
      app: {
        isPackaged: true,
        getVersion: () => '1.0.0',
      },
      BrowserWindow: {
        getAllWindows: mockGetAllWindows,
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../main/updater-service');
  }

  describe('initialize', () => {
    it('should return early when app is not packaged', () => {
      jest.resetModules();
      jest.doMock('electron-updater', () => ({
        autoUpdater: mockAutoUpdater,
      }));
      jest.doMock('electron', () => ({
        app: {
          isPackaged: false,
          getVersion: () => '1.0.0',
        },
        BrowserWindow: {
          getAllWindows: mockGetAllWindows,
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const unpackagedUpdater = require('../../main/updater-service');

      unpackagedUpdater.initialize();

      expect(mockAutoUpdaterOn).not.toHaveBeenCalled();
    });

    it('should configure autoUpdater', () => {
      const updaterService = loadUpdaterService();

      updaterService.initialize();

      expect(mockAutoUpdater.autoDownload).toBe(false);
      expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
    });

    it('should register all required event listeners', () => {
      const updaterService = loadUpdaterService();

      updaterService.initialize();

      expect(eventHandlers['checking-for-update']).toBeDefined();
      expect(eventHandlers['update-available']).toBeDefined();
      expect(eventHandlers['update-not-available']).toBeDefined();
      expect(eventHandlers['download-progress']).toBeDefined();
      expect(eventHandlers['update-downloaded']).toBeDefined();
      expect(eventHandlers['error']).toBeDefined();
    });

    it('should schedule checkForUpdates after 5000ms', () => {
      const updaterService = loadUpdaterService();

      updaterService.initialize();

      expect(mockCheckForUpdates).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      expect(mockCheckForUpdates).toHaveBeenCalled();
    });

    it('should catch errors from scheduled checkForUpdates', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

      const updaterService = loadUpdaterService();

      updaterService.initialize();

      jest.advanceTimersByTime(5000);

      // Allow the promise rejection to be handled
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('[Updater] Initial check failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('event broadcasting', () => {
    let mockWindow: { webContents: { send: jest.Mock }; isDestroyed: jest.Mock };
    let updaterService: typeof import('../../main/updater-service');

    beforeEach(() => {
      mockWindow = {
        webContents: { send: mockWebContentsSend },
        isDestroyed: jest.fn().mockReturnValue(false),
      };
      mockGetAllWindows.mockReturnValue([mockWindow]);
      updaterService = loadUpdaterService();
      updaterService.initialize();
    });

    it('should send UPDATER_CHECKING on checking-for-update event', () => {
      eventHandlers['checking-for-update']();

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_CHECKING);
    });

    it('should send UPDATER_AVAILABLE with version info on update-available event', () => {
      eventHandlers['update-available']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'New features',
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_AVAILABLE, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'New features',
      });
    });

    it('should send UPDATER_NOT_AVAILABLE on update-not-available event', () => {
      eventHandlers['update-not-available']();

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_NOT_AVAILABLE);
    });

    it('should send UPDATER_PROGRESS with progress info on download-progress event', () => {
      eventHandlers['download-progress']({
        percent: 50,
        bytesPerSecond: 1024,
        transferred: 512,
        total: 1024,
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_PROGRESS, {
        percent: 50,
        bytesPerSecond: 1024,
        transferred: 512,
        total: 1024,
      });
    });

    it('should send UPDATER_DOWNLOADED with version info on update-downloaded event', () => {
      eventHandlers['update-downloaded']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'Fixed bugs',
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_DOWNLOADED, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'Fixed bugs',
      });
    });

    it('should send UPDATER_ERROR with message on error event', () => {
      eventHandlers['error'](new Error('Download failed'));

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_ERROR, {
        message: 'Download failed',
      });
    });

    it('should not send to destroyed window', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      eventHandlers['checking-for-update']();

      expect(mockWebContentsSend).not.toHaveBeenCalled();
    });

    it('should broadcast to all open windows', () => {
      const mockWindow2 = {
        webContents: { send: jest.fn() },
        isDestroyed: jest.fn().mockReturnValue(false),
      };
      mockGetAllWindows.mockReturnValue([mockWindow, mockWindow2]);

      eventHandlers['checking-for-update']();

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_CHECKING);
      expect(mockWindow2.webContents.send).toHaveBeenCalledWith(IPC.UPDATER_CHECKING);
    });
  });

  describe('extractReleaseNotes (via event callbacks)', () => {
    let mockWindow: { webContents: { send: jest.Mock }; isDestroyed: jest.Mock };
    let updaterService: typeof import('../../main/updater-service');

    beforeEach(() => {
      mockWindow = {
        webContents: { send: mockWebContentsSend },
        isDestroyed: jest.fn().mockReturnValue(false),
      };
      mockGetAllWindows.mockReturnValue([mockWindow]);
      updaterService = loadUpdaterService();
      updaterService.initialize();
    });

    it('should handle null releaseNotes', () => {
      eventHandlers['update-available']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: null,
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_AVAILABLE, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: undefined,
      });
    });

    it('should handle undefined releaseNotes', () => {
      eventHandlers['update-available']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: undefined,
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_AVAILABLE, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: undefined,
      });
    });

    it('should handle string releaseNotes', () => {
      eventHandlers['update-available']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'Simple release notes',
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_AVAILABLE, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: 'Simple release notes',
      });
    });

    it('should handle array of version notes', () => {
      eventHandlers['update-available']({
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: [
          { version: '2.0.0', note: 'Major update' },
          { version: '1.5.0', note: 'Minor fixes' },
        ],
      });

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.UPDATER_AVAILABLE, {
        version: '2.0.0',
        releaseDate: '2026-02-14',
        releaseNotes: '2.0.0: Major update\n1.5.0: Minor fixes',
      });
    });
  });

  describe('checkForUpdates', () => {
    it('should call autoUpdater.checkForUpdates', () => {
      const updaterService = loadUpdaterService();

      updaterService.checkForUpdates();

      expect(mockCheckForUpdates).toHaveBeenCalled();
    });

    it('should catch and log errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCheckForUpdates.mockRejectedValue(new Error('Check failed'));

      const updaterService = loadUpdaterService();

      updaterService.checkForUpdates();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('[Updater] Check failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('downloadUpdate', () => {
    it('should call autoUpdater.downloadUpdate', () => {
      const updaterService = loadUpdaterService();

      updaterService.downloadUpdate();

      expect(mockDownloadUpdate).toHaveBeenCalled();
    });

    it('should catch and log errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDownloadUpdate.mockRejectedValue(new Error('Download failed'));

      const updaterService = loadUpdaterService();

      updaterService.downloadUpdate();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('[Updater] Download failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('quitAndInstall', () => {
    it('should call autoUpdater.quitAndInstall with correct arguments', () => {
      const updaterService = loadUpdaterService();

      updaterService.quitAndInstall();

      expect(mockQuitAndInstall).toHaveBeenCalledWith(false, true);
    });
  });

  describe('getVersion', () => {
    it('should return app version', () => {
      const updaterService = loadUpdaterService();

      const version = updaterService.getVersion();

      expect(version).toBe('1.0.0');
    });
  });
});
