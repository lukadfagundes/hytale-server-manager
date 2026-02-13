import type { PlayerData } from '../types/player';
import type { ModInfo } from '../types/mod';
import type { WorldMapData } from '../types/world';
import type { Warp } from '../types/warp';

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

export interface DataResult<T> {
  data: T;
  errors: string[];
}

export async function startServer(): Promise<void> {
  await window.electronAPI.invoke('server:start');
}

export async function stopServer(): Promise<void> {
  await window.electronAPI.invoke('server:stop');
}

export async function getPlayers(): Promise<DataResult<PlayerData[]>> {
  const result = (await window.electronAPI.invoke('data:players')) as { data: PlayerData[]; errors: string[] };
  return { data: result.data, errors: result.errors };
}

export async function getWarps(): Promise<DataResult<Warp[]>> {
  const result = (await window.electronAPI.invoke('data:warps')) as { data: Warp[]; error: string | null };
  return { data: result.data, errors: result.error ? [result.error] : [] };
}

export async function getWorldMap(): Promise<DataResult<WorldMapData>> {
  const result = (await window.electronAPI.invoke('data:world-map')) as { data: WorldMapData; errors: string[] };
  return { data: result.data, errors: result.errors };
}

export async function getServerConfig(): Promise<Record<string, unknown>> {
  return (await window.electronAPI.invoke('data:server-config')) as Record<string, unknown>;
}

export async function getMods(): Promise<DataResult<ModInfo[]>> {
  const result = (await window.electronAPI.invoke('mods:list')) as { data: ModInfo[]; errors: string[] };
  return { data: result.data, errors: result.errors };
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
