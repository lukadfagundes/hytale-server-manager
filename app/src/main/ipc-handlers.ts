import { ipcMain } from 'electron';
import { IPC } from '../shared/constants';

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.SERVER_START, async () => {
    console.log('stub: server start');
  });

  ipcMain.handle(IPC.SERVER_STOP, async () => {
    console.log('stub: server stop');
  });

  ipcMain.handle(IPC.DATA_PLAYERS, async () => {
    return [];
  });

  ipcMain.handle(IPC.DATA_MEMORIES, async () => {
    return { global: [], perPlayer: {} };
  });

  ipcMain.handle(IPC.DATA_WARPS, async () => {
    return [];
  });

  ipcMain.handle(IPC.DATA_WORLD_MAP, async () => {
    return {
      regions: [],
      markers: [],
      playerPositions: [],
      warpPositions: [],
      bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
    };
  });

  ipcMain.handle(IPC.DATA_SERVER_CONFIG, async () => {
    return {};
  });

  ipcMain.handle(IPC.MODS_LIST, async () => {
    return [];
  });

  ipcMain.handle(IPC.MODS_TOGGLE, async (_event, _args: { modName: string; enabled: boolean }) => {
    console.log('stub: mod toggle');
  });
}
