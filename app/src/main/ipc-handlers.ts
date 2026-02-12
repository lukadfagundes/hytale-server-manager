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
    await serverProcess.start();
  });

  ipcMain.handle(IPC.SERVER_STOP, async () => {
    await serverProcess.stop();
  });

  ipcMain.handle(IPC.DATA_PLAYERS, async () => {
    return readAllPlayers(getServerDir());
  });

  ipcMain.handle(IPC.DATA_MEMORIES, async () => {
    return {
      global: readGlobalMemories(getServerDir()),
      perPlayer: readPlayerMemories(getServerDir()),
    };
  });

  ipcMain.handle(IPC.DATA_WARPS, async () => {
    return readWarps(getServerDir());
  });

  ipcMain.handle(IPC.DATA_WORLD_MAP, async () => {
    const players = readAllPlayers(getServerDir());
    const warps = readWarps(getServerDir());

    const playerPositions = players.map(p => ({
      name: p.name,
      position: p.position,
    }));

    const warpPositions = warps
      .filter(w => w.world === 'default')
      .map(w => ({
        name: w.id,
        position: w.position,
      }));

    return readWorldMap(getServerDir(), playerPositions, warpPositions);
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
    return readAllMods(getServerDir(), getDisabledModsDir());
  });

  ipcMain.handle(IPC.MODS_TOGGLE, async (_event, args: { modName: string; enabled: boolean }) => {
    toggleMod(getServerDir(), getDisabledModsDir(), args.modName, args.enabled);
  });
}
