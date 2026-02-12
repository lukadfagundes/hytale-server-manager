import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC } from '../shared/constants';
import { readAllPlayers, readPlayerMemories } from './data-readers/player-reader';
import { readGlobalMemories } from './data-readers/memory-reader';
import { readWarps } from './data-readers/warp-reader';
import { readWorldMap } from './data-readers/world-reader';
import { readAllMods } from './data-readers/mod-reader';
import { toggleMod } from './mod-manager';
import * as serverProcess from './server-process';

function getServerDir(): string {
  return path.resolve(__dirname, '..', '..', '..', 'Server');
}

function getDisabledModsDir(): string {
  return path.resolve(__dirname, '..', '..', 'disabled-mods');
}

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

  ipcMain.handle(IPC.DATA_MEMORIES, async () => {
    const globalResult = readGlobalMemories(getServerDir());
    const perPlayer = readPlayerMemories(getServerDir());
    const errors: string[] = [];
    if (globalResult.error) errors.push(globalResult.error);
    return {
      data: { global: globalResult.data, perPlayer },
      errors,
    };
  });

  ipcMain.handle(IPC.DATA_WARPS, async () => {
    const result = readWarps(getServerDir());
    return { data: result.data, error: result.error };
  });

  ipcMain.handle(IPC.DATA_WORLD_MAP, async () => {
    const playersResult = readAllPlayers(getServerDir());
    const warpsResult = readWarps(getServerDir());

    const playerPositions = playersResult.data.map(p => ({
      name: p.name,
      position: p.position,
    }));

    const warpPositions = warpsResult.data
      .filter(w => w.world === 'default')
      .map(w => ({
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
}
