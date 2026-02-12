import path from 'path';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';

type RefreshCategory = 'players' | 'memories' | 'warps' | 'worldMap' | 'mods';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let watcher: any = null;
let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

const DEBOUNCE_MS = 500;

function pushRefresh(category: RefreshCategory): void {
  // Debounce per category
  if (debounceTimers[category]) {
    clearTimeout(debounceTimers[category]);
  }
  debounceTimers[category] = setTimeout(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.DATA_REFRESH, { category });
    }
    delete debounceTimers[category];
  }, DEBOUNCE_MS);
}

function categorizeChange(filePath: string): RefreshCategory | null {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized.includes('/universe/players/') && normalized.endsWith('.json')) {
    return 'players';
  }
  if (normalized.includes('/universe/memories.json')) {
    return 'memories';
  }
  if (normalized.includes('/universe/warps.json')) {
    return 'warps';
  }
  if (normalized.includes('/chunks/') && normalized.endsWith('.region.bin')) {
    return 'worldMap';
  }
  if (normalized.includes('/BlockMapMarkers.json')) {
    return 'worldMap';
  }
  if (normalized.includes('/mods/')) {
    return 'mods';
  }
  return null;
}

export async function startWatcher(serverDir: string): Promise<void> {
  // Dynamic import to avoid bundling chokidar into renderer
  const chokidar = await import('chokidar');

  const watchPaths = [
    path.join(serverDir, 'universe', 'players'),
    path.join(serverDir, 'universe', 'memories.json'),
    path.join(serverDir, 'universe', 'warps.json'),
    path.join(serverDir, 'universe', 'worlds', 'default', 'chunks'),
    path.join(serverDir, 'universe', 'worlds', 'default', 'resources', 'BlockMapMarkers.json'),
    path.join(serverDir, 'mods'),
  ];

  watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300 },
    ignored: [
      /(^|[/\\])\../, // dotfiles
      /\.bak$/,       // backup files
    ],
  });

  watcher.on('all', (_event: string, filePath: string) => {
    const category = categorizeChange(filePath);
    if (category) {
      pushRefresh(category);
    }
  });

  watcher.on('error', (err: Error) => {
    console.error('[FileWatcher] Error:', err.message);
  });
}

export async function stopWatcher(): Promise<void> {
  // Clear all pending debounce timers
  for (const key of Object.keys(debounceTimers)) {
    clearTimeout(debounceTimers[key]);
  }
  debounceTimers = {};

  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
