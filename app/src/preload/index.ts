import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_INVOKE_CHANNELS = [
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
] as const;

const ALLOWED_ON_CHANNELS = [
  'server:status-changed',
  'server:log',
  'data:refresh',
  'config:server-path-changed',
  'assets:extracting',
  'assets:ready',
  'assets:error',
  'updater:checking',
  'updater:available',
  'updater:not-available',
  'updater:progress',
  'updater:downloaded',
  'updater:error',
] as const;

type InvokeChannel = (typeof ALLOWED_INVOKE_CHANNELS)[number];
type OnChannel = (typeof ALLOWED_ON_CHANNELS)[number];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: InvokeChannel, ...args: unknown[]) => {
    if ((ALLOWED_INVOKE_CHANNELS as readonly string[]).includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`IPC channel not allowed: ${channel}`);
  },
  on: (channel: OnChannel, callback: (...args: unknown[]) => void) => {
    if ((ALLOWED_ON_CHANNELS as readonly string[]).includes(channel)) {
      const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    }
    throw new Error(`IPC channel not allowed: ${channel}`);
  },
});
