// Collect all registered IPC handlers so we can invoke them in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (...args: any[]) => any> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockIpcMainHandle = jest.fn((channel: string, handler: (...args: any[]) => any) => {
  handlers[channel] = handler;
});

jest.mock('electron', () => ({
  ipcMain: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handle: (...args: any[]) => mockIpcMainHandle(...args),
  },
  dialog: {
    showOpenDialog: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
    getFocusedWindow: jest.fn().mockReturnValue(null),
  },
}));

jest.mock('fs');
jest.mock('../../main/data-readers/player-reader');
jest.mock('../../main/data-readers/warp-reader');
jest.mock('../../main/data-readers/world-reader');
jest.mock('../../main/data-readers/mod-reader');
jest.mock('../../main/mod-manager');
jest.mock('../../main/server-process');
jest.mock('../../main/updater-service');
jest.mock('../../main/server-path');
jest.mock('../../main/file-watcher');
jest.mock('../../main/asset-extractor');

import { dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { registerIpcHandlers } from '../../main/ipc-handlers';
import {
  getServerDir,
  getDisabledModsDir,
  setServerDir,
  isServerDirValid,
} from '../../main/server-path';
import { stopWatcher, startWatcher } from '../../main/file-watcher';
import { extractAssets, areAssetsCached } from '../../main/asset-extractor';
import { readAllPlayers } from '../../main/data-readers/player-reader';
import { readWarps } from '../../main/data-readers/warp-reader';
import { readWorldMap } from '../../main/data-readers/world-reader';
import { readAllMods } from '../../main/data-readers/mod-reader';
import * as serverProcess from '../../main/server-process';
import * as updaterService from '../../main/updater-service';

const mockGetServerDir = jest.mocked(getServerDir);
const mockGetDisabledModsDir = jest.mocked(getDisabledModsDir);
const mockSetServerDir = jest.mocked(setServerDir);
const mockIsServerDirValid = jest.mocked(isServerDirValid);
const mockStopWatcher = jest.mocked(stopWatcher);
const mockStartWatcher = jest.mocked(startWatcher);
const mockDialog = jest.mocked(dialog);
const mockBrowserWindow = jest.mocked(BrowserWindow);
const mockFs = jest.mocked(fs);
const mockExtractAssets = jest.mocked(extractAssets);
const mockAreAssetsCached = jest.mocked(areAssetsCached);
const mockReadAllPlayers = jest.mocked(readAllPlayers);
const mockReadWarps = jest.mocked(readWarps);
const mockReadWorldMap = jest.mocked(readWorldMap);
const mockReadAllMods = jest.mocked(readAllMods);
const mockServerProcess = jest.mocked(serverProcess);
const mockUpdaterService = jest.mocked(updaterService);

describe('ipc-handlers', () => {
  beforeEach(() => {
    // Clear call counts (but not implementations) so tests don't bleed into each other
    jest.clearAllMocks();
    // Clear handler map so each describe block starts fresh
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    mockGetServerDir.mockReturnValue('/mock/Server');
    mockGetDisabledModsDir.mockReturnValue('/mock/disabled-mods');
    mockStopWatcher.mockResolvedValue(undefined);
    mockStartWatcher.mockResolvedValue(undefined);
    mockBrowserWindow.getAllWindows.mockReturnValue([]);
    mockBrowserWindow.getFocusedWindow.mockReturnValue(null);
    mockExtractAssets.mockResolvedValue({ success: true, totalFiles: 0 });
    mockAreAssetsCached.mockReturnValue(false);
  });

  it('should register all expected IPC channels', () => {
    registerIpcHandlers();

    const expectedChannels = [
      'server:start',
      'server:stop',
      'data:players',
      'data:warps',
      'data:world-map',
      'data:server-config',
      'mods:list',
      'mods:toggle',
      'config:get-server-path',
      'config:set-server-path',
      'config:select-server-dir',
      'assets:extract',
      'assets:status',
      'updater:check',
      'updater:download',
      'updater:install',
      'updater:get-version',
    ];

    for (const channel of expectedChannels) {
      expect(handlers[channel]).toBeDefined();
    }
  });

  describe('data handlers use centralized getServerDir', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('DATA_PLAYERS should call readAllPlayers with getServerDir()', async () => {
      mockReadAllPlayers.mockReturnValue({ data: [], errors: [] });

      await handlers['data:players']();
      expect(mockReadAllPlayers).toHaveBeenCalledWith('/mock/Server');
    });

    it('DATA_WARPS should call readWarps with getServerDir()', async () => {
      mockReadWarps.mockReturnValue({ data: [], error: null });

      await handlers['data:warps']();
      expect(mockReadWarps).toHaveBeenCalledWith('/mock/Server');
    });

    it('MODS_LIST should call readAllMods with getServerDir() and getDisabledModsDir()', async () => {
      mockReadAllMods.mockReturnValue({ data: [], errors: [] });

      await handlers['mods:list']();
      expect(mockReadAllMods).toHaveBeenCalledWith('/mock/Server', '/mock/disabled-mods');
    });

    it('DATA_SERVER_CONFIG should read config.json from getServerDir()', async () => {
      mockFs.readFileSync.mockReturnValue('{"maxPlayers": 100}');

      const result = await handlers['data:server-config']();
      expect(result).toEqual({ maxPlayers: 100 });
    });

    it('DATA_SERVER_CONFIG should return empty object on error', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = await handlers['data:server-config']();
      expect(result).toEqual({});
    });
  });

  describe('CONFIG_GET_SERVER_PATH', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should return path and valid status', () => {
      mockIsServerDirValid.mockReturnValue(true);

      const result = handlers['config:get-server-path']();
      expect(result).toEqual({ path: '/mock/Server', valid: true });
    });

    it('should return valid: false when server dir is invalid', () => {
      mockIsServerDirValid.mockReturnValue(false);

      const result = handlers['config:get-server-path']();
      expect(result).toEqual({ path: '/mock/Server', valid: false });
    });
  });

  describe('CONFIG_SET_SERVER_PATH', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should return success: true and restart watcher on valid path', async () => {
      mockSetServerDir.mockReturnValue(true);
      mockIsServerDirValid.mockReturnValue(true);

      const result = await handlers['config:set-server-path']({}, '/new/Server');

      expect(result).toEqual({ success: true });
      expect(mockStopWatcher).toHaveBeenCalled();
      expect(mockStartWatcher).toHaveBeenCalledWith('/mock/Server');
    });

    it('should return error when setServerDir fails', async () => {
      mockSetServerDir.mockReturnValue('Invalid directory');

      const result = await handlers['config:set-server-path']({}, '/bad/path');

      expect(result).toEqual({ success: false, error: 'Invalid directory' });
      expect(mockStopWatcher).not.toHaveBeenCalled();
    });

    it('should not start watcher when new path is invalid', async () => {
      mockSetServerDir.mockReturnValue(true);
      mockIsServerDirValid.mockReturnValue(false);

      await handlers['config:set-server-path']({}, '/new/path');

      expect(mockStopWatcher).toHaveBeenCalled();
      expect(mockStartWatcher).not.toHaveBeenCalled();
    });

    it('should notify all windows on success', async () => {
      mockSetServerDir.mockReturnValue(true);
      mockIsServerDirValid.mockReturnValue(true);
      const mockSend = jest.fn();
      mockBrowserWindow.getAllWindows.mockReturnValue([
        { webContents: { send: mockSend } } as unknown,
      ]);

      await handlers['config:set-server-path']({}, '/new/Server');

      expect(mockSend).toHaveBeenCalledWith(
        'config:server-path-changed',
        expect.objectContaining({ path: '/mock/Server', valid: true })
      );
    });
  });

  describe('CONFIG_SELECT_SERVER_DIR', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should return selected: false when dialog is canceled', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
      mockBrowserWindow.getAllWindows.mockReturnValue([{ id: 1 } as unknown]);

      const result = await handlers['config:select-server-dir']();

      expect(result).toEqual({ selected: false });
    });

    it('should return selected path with validity check', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/chosen/Server'],
      });
      mockBrowserWindow.getAllWindows.mockReturnValue([{ id: 1 } as unknown]);
      mockIsServerDirValid.mockReturnValue(true);

      const result = await handlers['config:select-server-dir']();

      expect(result).toEqual({ selected: true, path: '/chosen/Server', valid: true });
    });

    it('should return valid: false for invalid selected directory', async () => {
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/empty/dir'] });
      mockBrowserWindow.getAllWindows.mockReturnValue([{ id: 1 } as unknown]);
      mockIsServerDirValid.mockReturnValue(false);

      const result = await handlers['config:select-server-dir']();

      expect(result).toEqual({ selected: true, path: '/empty/dir', valid: false });
    });

    it('should use focused window for dialog when available', async () => {
      const focusedWin = { id: 1 } as unknown;
      mockBrowserWindow.getFocusedWindow.mockReturnValue(focusedWin);
      mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

      await handlers['config:select-server-dir']();

      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(
        focusedWin,
        expect.objectContaining({ properties: ['openDirectory'] })
      );
    });
  });

  describe('ASSETS_EXTRACT', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call extractAssets and broadcast ready on success', async () => {
      mockIsServerDirValid.mockReturnValue(true);
      mockExtractAssets.mockResolvedValue({ success: true, totalFiles: 10 });
      const mockSend = jest.fn();
      mockBrowserWindow.getAllWindows.mockReturnValue([
        { webContents: { send: mockSend } } as unknown,
      ]);

      const result = await handlers['assets:extract']();

      expect(result).toEqual({ success: true });
      expect(mockExtractAssets).toHaveBeenCalledWith('/mock/Server');
      expect(mockSend).toHaveBeenCalledWith('assets:extracting');
      expect(mockSend).toHaveBeenCalledWith('assets:ready');
    });

    it('should return error when server dir is invalid', async () => {
      mockIsServerDirValid.mockReturnValue(false);

      const result = await handlers['assets:extract']();

      expect(result).toEqual({ success: false, error: 'Server directory is not valid' });
      expect(mockExtractAssets).not.toHaveBeenCalled();
    });

    it('should broadcast error when extraction fails', async () => {
      mockIsServerDirValid.mockReturnValue(true);
      mockExtractAssets.mockResolvedValue({ success: false, error: 'Assets.zip not found' });
      const mockSend = jest.fn();
      mockBrowserWindow.getAllWindows.mockReturnValue([
        { webContents: { send: mockSend } } as unknown,
      ]);

      const result = await handlers['assets:extract']();

      expect(result).toEqual({ success: false, error: 'Assets.zip not found' });
      expect(mockSend).toHaveBeenCalledWith('assets:error', { message: 'Assets.zip not found' });
    });
  });

  describe('ASSETS_STATUS', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should return cached: true when assets are cached', () => {
      mockAreAssetsCached.mockReturnValue(true);

      const result = handlers['assets:status']();
      expect(result).toEqual({ cached: true });
    });

    it('should return cached: false when assets are not cached', () => {
      mockAreAssetsCached.mockReturnValue(false);

      const result = handlers['assets:status']();
      expect(result).toEqual({ cached: false });
    });
  });

  describe('CONFIG_SET_SERVER_PATH triggers asset extraction', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should trigger asset extraction after watcher restart on valid path', async () => {
      mockSetServerDir.mockReturnValue(true);
      mockIsServerDirValid.mockReturnValue(true);
      mockExtractAssets.mockResolvedValue({ success: true, totalFiles: 5 });
      const mockSend = jest.fn();
      mockBrowserWindow.getAllWindows.mockReturnValue([
        { webContents: { send: mockSend } } as unknown,
      ]);

      await handlers['config:set-server-path']({}, '/new/Server');

      expect(mockExtractAssets).toHaveBeenCalledWith('/mock/Server');
    });

    it('should not trigger asset extraction when new path is invalid', async () => {
      mockSetServerDir.mockReturnValue(true);
      mockIsServerDirValid.mockReturnValue(false);

      await handlers['config:set-server-path']({}, '/new/path');

      expect(mockExtractAssets).not.toHaveBeenCalled();
    });
  });

  describe('SERVER_START', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call serverProcess.start on invocation', async () => {
      mockServerProcess.start.mockResolvedValue(undefined);

      await handlers['server:start']();

      expect(mockServerProcess.start).toHaveBeenCalled();
    });

    it('should throw error when serverProcess.start rejects', async () => {
      mockServerProcess.start.mockRejectedValue(new Error('Server already running'));

      await expect(handlers['server:start']()).rejects.toThrow('Server already running');
    });
  });

  describe('SERVER_STOP', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call serverProcess.stop on invocation', async () => {
      mockServerProcess.stop.mockResolvedValue(undefined);

      await handlers['server:stop']();

      expect(mockServerProcess.stop).toHaveBeenCalled();
    });

    it('should throw error when serverProcess.stop rejects', async () => {
      mockServerProcess.stop.mockRejectedValue(new Error('Server not running'));

      await expect(handlers['server:stop']()).rejects.toThrow('Server not running');
    });
  });

  describe('DATA_WORLD_MAP', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call readAllPlayers, readWarps, and readWorldMap with getServerDir()', async () => {
      mockReadAllPlayers.mockReturnValue({
        data: [{ uuid: 'abc', name: 'Player1', position: { x: 10, y: 64, z: 20 } }],
        errors: [],
      });
      mockReadWarps.mockReturnValue({
        data: [{ id: 'spawn', world: 'default', position: { x: 0, y: 64, z: 0 } }],
        error: null,
      });
      mockReadWorldMap.mockReturnValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: [],
      });

      await handlers['data:world-map']();

      expect(mockReadAllPlayers).toHaveBeenCalledWith('/mock/Server');
      expect(mockReadWarps).toHaveBeenCalledWith('/mock/Server');
      expect(mockReadWorldMap).toHaveBeenCalledWith(
        '/mock/Server',
        expect.any(Array),
        expect.any(Array)
      );
    });

    it('should return combined { data, errors } structure', async () => {
      mockReadAllPlayers.mockReturnValue({ data: [], errors: [] });
      mockReadWarps.mockReturnValue({ data: [], error: null });
      mockReadWorldMap.mockReturnValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: ['Region 0,0 corrupted'],
      });

      const result = await handlers['data:world-map']();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('errors');
      expect(result.errors).toEqual(['Region 0,0 corrupted']);
    });

    it('should map player positions correctly (name + position)', async () => {
      mockReadAllPlayers.mockReturnValue({
        data: [
          { uuid: 'abc', name: 'Player1', position: { x: 10, y: 64, z: 20 } },
          { uuid: 'def', name: 'Player2', position: { x: 50, y: 70, z: 100 } },
        ],
        errors: [],
      });
      mockReadWarps.mockReturnValue({ data: [], error: null });
      mockReadWorldMap.mockReturnValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: [],
      });

      await handlers['data:world-map']();

      expect(mockReadWorldMap).toHaveBeenCalledWith(
        '/mock/Server',
        [
          { name: 'Player1', position: { x: 10, y: 64, z: 20 } },
          { name: 'Player2', position: { x: 50, y: 70, z: 100 } },
        ],
        expect.any(Array)
      );
    });

    it('should filter warps to world === "default" only', async () => {
      mockReadAllPlayers.mockReturnValue({ data: [], errors: [] });
      mockReadWarps.mockReturnValue({
        data: [
          { id: 'spawn', world: 'default', position: { x: 0, y: 64, z: 0 } },
          { id: 'nether_hub', world: 'nether', position: { x: 100, y: 50, z: 100 } },
          { id: 'home', world: 'default', position: { x: 200, y: 70, z: 200 } },
        ],
        error: null,
      });
      mockReadWorldMap.mockReturnValue({
        data: { regions: [], markers: [], playerPositions: [], warpPositions: [] },
        errors: [],
      });

      await handlers['data:world-map']();

      expect(mockReadWorldMap).toHaveBeenCalledWith('/mock/Server', expect.any(Array), [
        { name: 'spawn', position: { x: 0, y: 64, z: 0 } },
        { name: 'home', position: { x: 200, y: 70, z: 200 } },
      ]);
    });
  });

  describe('UPDATER_CHECK', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call updaterService.checkForUpdates', () => {
      handlers['updater:check']();

      expect(mockUpdaterService.checkForUpdates).toHaveBeenCalled();
    });
  });

  describe('UPDATER_DOWNLOAD', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call updaterService.downloadUpdate', () => {
      handlers['updater:download']();

      expect(mockUpdaterService.downloadUpdate).toHaveBeenCalled();
    });
  });

  describe('UPDATER_INSTALL', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call updaterService.quitAndInstall', () => {
      handlers['updater:install']();

      expect(mockUpdaterService.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('UPDATER_GET_VERSION', () => {
    beforeEach(() => {
      registerIpcHandlers();
    });

    it('should call updaterService.getVersion and return version string', () => {
      mockUpdaterService.getVersion.mockReturnValue('1.2.3');

      const result = handlers['updater:get-version']();

      expect(mockUpdaterService.getVersion).toHaveBeenCalled();
      expect(result).toBe('1.2.3');
    });
  });
});
