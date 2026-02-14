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
  const result = (await window.electronAPI.invoke('data:players')) as {
    data: PlayerData[];
    errors: string[];
  };
  return { data: result.data, errors: result.errors };
}

export async function getWarps(): Promise<DataResult<Warp[]>> {
  const result = (await window.electronAPI.invoke('data:warps')) as {
    data: Warp[];
    error: string | null;
  };
  return { data: result.data, errors: result.error ? [result.error] : [] };
}

export async function getWorldMap(): Promise<DataResult<WorldMapData>> {
  const result = (await window.electronAPI.invoke('data:world-map')) as {
    data: WorldMapData;
    errors: string[];
  };
  return { data: result.data, errors: result.errors };
}

export async function getServerConfig(): Promise<Record<string, unknown>> {
  return (await window.electronAPI.invoke('data:server-config')) as Record<string, unknown>;
}

export async function getMods(): Promise<DataResult<ModInfo[]>> {
  const result = (await window.electronAPI.invoke('mods:list')) as {
    data: ModInfo[];
    errors: string[];
  };
  return { data: result.data, errors: result.errors };
}

export async function toggleMod(modName: string, enabled: boolean): Promise<void> {
  await window.electronAPI.invoke('mods:toggle', { modName, enabled });
}

export function onServerStatusChanged(callback: (status: string) => void): () => void {
  return window.electronAPI.on('server:status-changed', (status) => callback(status as string));
}

export function onServerLog(
  callback: (entry: { line: string; stream: string; timestamp: number }) => void
): () => void {
  return window.electronAPI.on('server:log', (entry) =>
    callback(entry as { line: string; stream: string; timestamp: number })
  );
}

export function onDataRefresh(callback: (category: string) => void): () => void {
  return window.electronAPI.on('data:refresh', (data) =>
    callback((data as { category: string }).category)
  );
}

// --- Config ---

export interface ServerPathInfo {
  path: string;
  valid: boolean;
}

export interface SelectDirResult {
  selected: boolean;
  path?: string;
  valid?: boolean;
}

export async function getServerPath(): Promise<ServerPathInfo> {
  return (await window.electronAPI.invoke('config:get-server-path')) as ServerPathInfo;
}

export async function setServerPath(
  newPath: string
): Promise<{ success: boolean; error?: string }> {
  return (await window.electronAPI.invoke('config:set-server-path', newPath)) as {
    success: boolean;
    error?: string;
  };
}

export async function selectServerDir(): Promise<SelectDirResult> {
  return (await window.electronAPI.invoke('config:select-server-dir')) as SelectDirResult;
}

export function onServerPathChanged(callback: (info: ServerPathInfo) => void): () => void {
  return window.electronAPI.on('config:server-path-changed', (info) =>
    callback(info as ServerPathInfo)
  );
}

// --- Assets ---

export async function extractAssets(): Promise<{ success: boolean; error?: string }> {
  return (await window.electronAPI.invoke('assets:extract')) as {
    success: boolean;
    error?: string;
  };
}

export async function getAssetStatus(): Promise<{ cached: boolean }> {
  return (await window.electronAPI.invoke('assets:status')) as { cached: boolean };
}

export function onAssetsExtracting(callback: () => void): () => void {
  return window.electronAPI.on('assets:extracting', callback);
}

export function onAssetsReady(callback: () => void): () => void {
  return window.electronAPI.on('assets:ready', callback);
}

export function onAssetsError(callback: (error: { message: string }) => void): () => void {
  return window.electronAPI.on('assets:error', (error) => callback(error as { message: string }));
}

// --- Updater ---

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export async function checkForUpdates(): Promise<void> {
  await window.electronAPI.invoke('updater:check');
}

export async function downloadUpdate(): Promise<void> {
  await window.electronAPI.invoke('updater:download');
}

export async function installUpdate(): Promise<void> {
  await window.electronAPI.invoke('updater:install');
}

export async function getAppVersion(): Promise<string> {
  return (await window.electronAPI.invoke('updater:get-version')) as string;
}

export function onUpdaterChecking(callback: () => void): () => void {
  return window.electronAPI.on('updater:checking', callback);
}

export function onUpdaterAvailable(callback: (info: UpdateInfo) => void): () => void {
  return window.electronAPI.on('updater:available', (info) => callback(info as UpdateInfo));
}

export function onUpdaterNotAvailable(callback: () => void): () => void {
  return window.electronAPI.on('updater:not-available', callback);
}

export function onUpdaterProgress(callback: (progress: DownloadProgress) => void): () => void {
  return window.electronAPI.on('updater:progress', (progress) =>
    callback(progress as DownloadProgress)
  );
}

export function onUpdaterDownloaded(callback: (info: UpdateInfo) => void): () => void {
  return window.electronAPI.on('updater:downloaded', (info) => callback(info as UpdateInfo));
}

export function onUpdaterError(callback: (error: { message: string }) => void): () => void {
  return window.electronAPI.on('updater:error', (error) => callback(error as { message: string }));
}
