import type { PlayerData } from '../types/player';
import type { ModInfo } from '../types/mod';
import type { WorldMapData } from '../types/world';
import type { Memory } from '../types/memory';
import type { Warp } from '../types/warp';

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export async function startServer(): Promise<void> {
  await window.electronAPI.invoke('server:start');
}

export async function stopServer(): Promise<void> {
  await window.electronAPI.invoke('server:stop');
}

export async function getPlayers(): Promise<PlayerData[]> {
  return (await window.electronAPI.invoke('data:players')) as PlayerData[];
}

export async function getMemories(): Promise<{ global: Memory[]; perPlayer: Record<string, Memory[]> }> {
  return (await window.electronAPI.invoke('data:memories')) as { global: Memory[]; perPlayer: Record<string, Memory[]> };
}

export async function getWarps(): Promise<Warp[]> {
  return (await window.electronAPI.invoke('data:warps')) as Warp[];
}

export async function getWorldMap(): Promise<WorldMapData> {
  return (await window.electronAPI.invoke('data:world-map')) as WorldMapData;
}

export async function getServerConfig(): Promise<Record<string, unknown>> {
  return (await window.electronAPI.invoke('data:server-config')) as Record<string, unknown>;
}

export async function getMods(): Promise<ModInfo[]> {
  return (await window.electronAPI.invoke('mods:list')) as ModInfo[];
}

export async function toggleMod(modName: string, enabled: boolean): Promise<void> {
  await window.electronAPI.invoke('mods:toggle', { modName, enabled });
}

export function onServerStatusChanged(callback: (status: string) => void): () => void {
  return window.electronAPI.on('server:status-changed', (status) => callback(status as string));
}

export function onServerLog(callback: (entry: { line: string; stream: string; timestamp: number }) => void): () => void {
  return window.electronAPI.on('server:log', (entry) => callback(entry as { line: string; stream: string; timestamp: number }));
}

export function onDataRefresh(callback: (category: string) => void): () => void {
  return window.electronAPI.on('data:refresh', (data) => callback((data as { category: string }).category));
}
