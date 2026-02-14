import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC } from '../shared/constants';
import { readAllPlayers } from './data-readers/player-reader';
import { readWarps } from './data-readers/warp-reader';
import { readWorldMap } from './data-readers/world-reader';
import { readAllMods } from './data-readers/mod-reader';
import { toggleMod } from './mod-manager';
import * as serverProcess from './server-process';
import * as updaterService from './updater-service';
import { getServerDir, getDisabledModsDir, setServerDir, isServerDirValid } from './server-path';
import { stopWatcher, startWatcher } from './file-watcher';
import { extractAssets, areAssetsCached } from './asset-extractor';

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.SERVER_START, async () => {
    try {
      await serverProcess.start();
    } catch (err) {
      throw new Error((err as Error).message);
    }
  });

  ipcMain.handle(IPC.SERVER_STOP, async () => {
    try {
      await serverProcess.stop();
    } catch (err) {
      throw new Error((err as Error).message);
    }
  });

  ipcMain.handle(IPC.DATA_PLAYERS, async () => {
    const result = readAllPlayers(getServerDir());
    return { data: result.data, errors: result.errors };
  });

  ipcMain.handle(IPC.DATA_WARPS, async () => {
    const result = readWarps(getServerDir());
    return { data: result.data, error: result.error };
  });

  ipcMain.handle(IPC.DATA_WORLD_MAP, async () => {
    const playersResult = readAllPlayers(getServerDir());
    const warpsResult = readWarps(getServerDir());

    const playerPositions = playersResult.data.map((p) => ({
      name: p.name,
      position: p.position,
    }));

    const warpPositions = warpsResult.data
      .filter((w) => w.world === 'default')
      .map((w) => ({
        name: w.id,
        position: w.position,
      }));

    const result = readWorldMap(getServerDir(), playerPositions, warpPositions);
    return { data: result.data, errors: result.errors };
  });

  ipcMain.handle(IPC.DATA_SERVER_CONFIG, async () => {
    try {
      const configPath = path.join(getServerDir(), 'config.json');
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  });

  ipcMain.handle(IPC.MODS_LIST, async () => {
    const result = readAllMods(getServerDir(), getDisabledModsDir());
    return { data: result.data, errors: result.errors };
  });

  ipcMain.handle(IPC.MODS_TOGGLE, async (_event, args: { modName: string; enabled: boolean }) => {
    try {
      toggleMod(getServerDir(), getDisabledModsDir(), args.modName, args.enabled);
    } catch (err) {
      throw new Error((err as Error).message);
    }
  });

  // Config handlers
  ipcMain.handle(IPC.CONFIG_GET_SERVER_PATH, () => {
    const dir = getServerDir();
    return { path: dir, valid: isServerDirValid(dir) };
  });

  ipcMain.handle(IPC.CONFIG_SET_SERVER_PATH, async (_event, newPath: string) => {
    const result = setServerDir(newPath);
    if (result !== true) {
      return { success: false, error: result };
    }

    // Restart file watcher for the new path
    await stopWatcher();
    const dir = getServerDir();
    if (isServerDirValid(dir)) {
      try {
        await startWatcher(dir);
      } catch (err) {
        console.error('[Config] Failed to restart file watcher:', err);
      }
    }

    // Notify all renderer windows
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.CONFIG_SERVER_PATH_CHANGED, { path: dir, valid: true });
    }

    // Trigger asset extraction for the new path
    if (isServerDirValid(dir)) {
      broadcastAssetExtraction(dir);
    }

    return { success: true };
  });

  ipcMain.handle(IPC.CONFIG_SELECT_SERVER_DIR, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focusedWindow ?? BrowserWindow.getAllWindows()[0], {
      title: 'Select Hytale Server Directory',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { selected: false };
    }

    const selectedPath = result.filePaths[0];
    const valid = isServerDirValid(selectedPath);
    return { selected: true, path: selectedPath, valid };
  });

  // Asset handlers
  ipcMain.handle(IPC.ASSETS_EXTRACT, async () => {
    const dir = getServerDir();
    if (!isServerDirValid(dir)) {
      return { success: false, error: 'Server directory is not valid' };
    }
    return broadcastAssetExtraction(dir);
  });

  ipcMain.handle(IPC.ASSETS_STATUS, () => {
    return { cached: areAssetsCached() };
  });

  // Updater handlers
  ipcMain.handle(IPC.UPDATER_CHECK, () => updaterService.checkForUpdates());
  ipcMain.handle(IPC.UPDATER_DOWNLOAD, () => updaterService.downloadUpdate());
  ipcMain.handle(IPC.UPDATER_INSTALL, () => updaterService.quitAndInstall());
  ipcMain.handle(IPC.UPDATER_GET_VERSION, () => updaterService.getVersion());
}

async function broadcastAssetExtraction(
  serverDir: string
): Promise<{ success: boolean; error?: string }> {
  const windows = BrowserWindow.getAllWindows();

  for (const win of windows) {
    win.webContents.send(IPC.ASSETS_EXTRACTING);
  }

  const result = await extractAssets(serverDir);

  for (const win of BrowserWindow.getAllWindows()) {
    if (result.success) {
      win.webContents.send(IPC.ASSETS_READY);
    } else {
      win.webContents.send(IPC.ASSETS_ERROR, { message: result.error });
    }
  }

  return { success: result.success, error: result.error };
}
