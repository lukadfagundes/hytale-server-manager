// Mock Electron APIs before any imports
const mockWebContentsSend = jest.fn();
const mockGetAllWindows = jest.fn();

jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => mockGetAllWindows(),
  },
}));

// Mock chokidar for dynamic import
const mockWatcherOn = jest.fn();
const mockWatcherClose = jest.fn();
const mockWatch = jest.fn();

jest.mock('chokidar', () => ({
  watch: (...args: unknown[]) => mockWatch(...args),
}));

import { IPC } from '../../shared/constants';

describe('file-watcher', () => {
  let startWatcher: (serverDir: string) => Promise<void>;
  let stopWatcher: () => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset module state by clearing the cache
    jest.resetModules();

    // Setup mock window
    mockGetAllWindows.mockReturnValue([{ webContents: { send: mockWebContentsSend } }]);

    // Setup mock watcher
    mockWatcherClose.mockResolvedValue(undefined);
    mockWatch.mockReturnValue({
      on: mockWatcherOn.mockReturnThis(),
      close: mockWatcherClose,
    });

    // Re-import after mocks are set up
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fileWatcher = require('../../main/file-watcher');
    startWatcher = fileWatcher.startWatcher;
    stopWatcher = fileWatcher.stopWatcher;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('categorizeChange (via startWatcher callback)', () => {
    async function setupAndGetCallback(): Promise<(event: string, filePath: string) => void> {
      await startWatcher('/mock/Server');

      // Find the 'all' event handler
      const allCall = mockWatcherOn.mock.calls.find(
        (call: [string, (event: string, path: string) => void]) => call[0] === 'all'
      );
      return allCall[1];
    }

    it('should categorize player files as "players"', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/universe/players/abc-123.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
    });

    it('should categorize warps.json as "warps"', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/universe/warps.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'warps' });
    });

    it('should categorize region files as "worldMap"', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/chunks/0.0.region.bin');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'worldMap' });
    });

    it('should categorize BlockMapMarkers.json as "worldMap"', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/BlockMapMarkers.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'worldMap' });
    });

    it('should categorize mod files as "mods"', async () => {
      const callback = await setupAndGetCallback();

      callback('add', '/mock/Server/mods/TestMod/manifest.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'mods' });
    });

    it('should normalize Windows backslash paths', async () => {
      const callback = await setupAndGetCallback();

      callback('change', 'C:\\mock\\Server\\universe\\players\\abc-123.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
    });

    it('should not broadcast for unrelated paths', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/config.json');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).not.toHaveBeenCalled();
    });

    it('should not broadcast for paths that do not match any category', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/logs/server.log');
      jest.advanceTimersByTime(500);

      expect(mockWebContentsSend).not.toHaveBeenCalled();
    });
  });

  describe('debounce behavior', () => {
    async function setupAndGetCallback(): Promise<(event: string, filePath: string) => void> {
      await startWatcher('/mock/Server');

      const allCall = mockWatcherOn.mock.calls.find(
        (call: [string, (event: string, path: string) => void]) => call[0] === 'all'
      );
      return allCall[1];
    }

    it('should debounce multiple rapid events for the same category', async () => {
      const callback = await setupAndGetCallback();

      // Trigger multiple player file changes rapidly
      callback('change', '/mock/Server/universe/players/abc.json');
      callback('change', '/mock/Server/universe/players/def.json');
      callback('change', '/mock/Server/universe/players/ghi.json');

      // Before debounce timeout
      expect(mockWebContentsSend).not.toHaveBeenCalled();

      // After debounce timeout (500ms)
      jest.advanceTimersByTime(500);

      // Should only broadcast once
      expect(mockWebContentsSend).toHaveBeenCalledTimes(1);
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
    });

    it('should debounce events independently per category', async () => {
      const callback = await setupAndGetCallback();

      // Trigger events for different categories
      callback('change', '/mock/Server/universe/players/abc.json');
      callback('change', '/mock/Server/universe/warps.json');
      callback('change', '/mock/Server/mods/TestMod/info.json');

      // Before debounce timeout
      expect(mockWebContentsSend).not.toHaveBeenCalled();

      // After debounce timeout
      jest.advanceTimersByTime(500);

      // Should broadcast once per category
      expect(mockWebContentsSend).toHaveBeenCalledTimes(3);
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'warps' });
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'mods' });
    });

    it('should reset debounce timer on new event for same category', async () => {
      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/universe/players/abc.json');

      // Advance 300ms (less than 500ms debounce)
      jest.advanceTimersByTime(300);

      // Another event for same category
      callback('change', '/mock/Server/universe/players/def.json');

      // Advance another 300ms (600ms total, but timer was reset)
      jest.advanceTimersByTime(300);

      // Should not have broadcast yet (timer was reset)
      expect(mockWebContentsSend).not.toHaveBeenCalled();

      // Advance remaining 200ms
      jest.advanceTimersByTime(200);

      // Now it should broadcast
      expect(mockWebContentsSend).toHaveBeenCalledTimes(1);
    });

    it('should broadcast to all windows', async () => {
      const mockSend1 = jest.fn();
      const mockSend2 = jest.fn();
      mockGetAllWindows.mockReturnValue([
        { webContents: { send: mockSend1 } },
        { webContents: { send: mockSend2 } },
      ]);

      const callback = await setupAndGetCallback();

      callback('change', '/mock/Server/universe/players/abc.json');
      jest.advanceTimersByTime(500);

      expect(mockSend1).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
      expect(mockSend2).toHaveBeenCalledWith(IPC.DATA_REFRESH, { category: 'players' });
    });
  });

  describe('startWatcher', () => {
    it('should call chokidar.watch with correct paths', async () => {
      await startWatcher('/mock/Server');

      expect(mockWatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('universe'),
          expect.stringContaining('players'),
        ]),
        expect.any(Object)
      );
    });

    it('should set ignoreInitial to true', async () => {
      await startWatcher('/mock/Server');

      const options = mockWatch.mock.calls[0][1];
      expect(options.ignoreInitial).toBe(true);
    });

    it('should set awaitWriteFinish option', async () => {
      await startWatcher('/mock/Server');

      const options = mockWatch.mock.calls[0][1];
      expect(options.awaitWriteFinish).toBeDefined();
      expect(options.awaitWriteFinish.stabilityThreshold).toBe(300);
    });

    it('should register "all" event handler', async () => {
      await startWatcher('/mock/Server');

      expect(mockWatcherOn).toHaveBeenCalledWith('all', expect.any(Function));
    });

    it('should register "error" event handler', async () => {
      await startWatcher('/mock/Server');

      expect(mockWatcherOn).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('stopWatcher', () => {
    it('should close the watcher when active', async () => {
      await startWatcher('/mock/Server');
      await stopWatcher();

      expect(mockWatcherClose).toHaveBeenCalled();
    });

    it('should clear all debounce timers', async () => {
      const callback = await (async () => {
        await startWatcher('/mock/Server');
        const allCall = mockWatcherOn.mock.calls.find(
          (call: [string, (event: string, path: string) => void]) => call[0] === 'all'
        );
        return allCall[1];
      })();

      // Trigger an event to create a pending debounce timer
      callback('change', '/mock/Server/universe/players/abc.json');

      // Stop watcher before debounce fires
      await stopWatcher();

      // Advance time past debounce
      jest.advanceTimersByTime(1000);

      // Should not have broadcast because timer was cleared
      expect(mockWebContentsSend).not.toHaveBeenCalled();
    });

    it('should be safe to call when no watcher is active', async () => {
      // stopWatcher on fresh module (no watcher started)
      await expect(stopWatcher()).resolves.not.toThrow();
    });

    it('should be safe to call multiple times', async () => {
      await startWatcher('/mock/Server');
      await stopWatcher();
      await stopWatcher();

      // close should only be called once (second call is a no-op)
      expect(mockWatcherClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should log errors to console.error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await startWatcher('/mock/Server');

      // Find and call the error handler
      const errorCall = mockWatcherOn.mock.calls.find(
        (call: [string, (error: Error) => void]) => call[0] === 'error'
      );
      const errorHandler = errorCall[1];

      errorHandler(new Error('Watch failed'));

      expect(consoleSpy).toHaveBeenCalledWith('[FileWatcher] Error:', 'Watch failed');

      consoleSpy.mockRestore();
    });
  });
});
