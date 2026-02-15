# File Watcher Module

**Module:** `app/src/main/file-watcher.ts`
**Purpose:** Chokidar-based filesystem monitoring for live data refresh
**Process:** Electron Main Process (Node.js)

---

## Overview

The `file-watcher` module provides real-time filesystem monitoring for the Hytale server directory. It uses [Chokidar](https://github.com/paulmillr/chokidar) to watch specific paths and broadcasts categorized refresh events to all renderer windows when changes are detected.

This enables the application to automatically update player data, warp lists, world maps, and mod information when the server modifies these files during gameplay.

---

## Exported Functions

### `startWatcher(serverDir: string): Promise<void>`

Initializes the filesystem watcher on the specified server directory.

**Parameters:**
- `serverDir: string` - Absolute path to the Server directory

**Returns:** `Promise<void>` - Resolves when watcher is initialized

**Behavior:**
1. Dynamically imports Chokidar (avoids bundling into renderer)
2. Constructs watch paths based on `serverDir`
3. Initializes watcher with configuration options
4. Attaches event handlers for file changes and errors

**Example:**
```typescript
import { startWatcher } from './file-watcher';
import { getServerDir } from './server-path';

const serverDir = getServerDir();
if (serverDir) {
  await startWatcher(serverDir);
  console.log('File watcher started');
}
```

---

### `stopWatcher(): Promise<void>`

Stops the filesystem watcher and cleans up resources.

**Returns:** `Promise<void>` - Resolves when watcher is closed

**Behavior:**
1. Clears all pending debounce timers
2. Closes the Chokidar watcher instance
3. Resets watcher reference to `null`

**Example:**
```typescript
import { stopWatcher } from './file-watcher';

await stopWatcher();
console.log('File watcher stopped');
```

---

## Watched Paths

The watcher monitors five specific paths within the server directory:

| Path | Category | Description |
|------|----------|-------------|
| `universe/players/` | `players` | Player JSON files (stats, inventory, position) |
| `universe/warps.json` | `warps` | Warp points configuration |
| `universe/worlds/default/chunks/` | `worldMap` | Region binary files (`*.region.bin`) |
| `universe/worlds/default/resources/BlockMapMarkers.json` | `worldMap` | Map marker definitions |
| `mods/` | `mods` | Mod directories and files |

---

## Refresh Categories

File changes are categorized for targeted UI updates:

| Category | Triggers | Files Matched |
|----------|----------|---------------|
| `players` | Player data changed | `*/universe/players/*.json` |
| `warps` | Warp list changed | `*/universe/warps.json` |
| `worldMap` | World data changed | `*/chunks/*.region.bin` or `*/BlockMapMarkers.json` |
| `mods` | Mod files changed | `*/mods/*` |

---

## Category Mapping Logic

The `categorizeChange()` function maps file paths to categories:

```typescript
function categorizeChange(filePath: string): RefreshCategory | null {
  const normalized = filePath.replace(/\\/g, '/');

  // Player JSON files
  if (normalized.includes('/universe/players/') && normalized.endsWith('.json')) {
    return 'players';
  }

  // Warps configuration
  if (normalized.includes('/universe/warps.json')) {
    return 'warps';
  }

  // Region chunk files
  if (normalized.includes('/chunks/') && normalized.endsWith('.region.bin')) {
    return 'worldMap';
  }

  // Map markers
  if (normalized.includes('/BlockMapMarkers.json')) {
    return 'worldMap';
  }

  // Mod files
  if (normalized.includes('/mods/')) {
    return 'mods';
  }

  return null; // Ignore other files
}
```

---

## Debounce Behavior

File changes are debounced per category to prevent event flooding:

| Setting | Value |
|---------|-------|
| Debounce delay | 500ms |
| Debounce scope | Per category |

**Behavior:**
- Multiple changes to the same category within 500ms result in a single refresh event
- Different categories debounce independently
- Timer is reset on each new change within the debounce window

**Implementation:**
```typescript
const DEBOUNCE_MS = 500;
let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function pushRefresh(category: RefreshCategory): void {
  if (debounceTimers[category]) {
    clearTimeout(debounceTimers[category]);
  }
  debounceTimers[category] = setTimeout(() => {
    // Broadcast to all windows
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.DATA_REFRESH, { category });
    }
    delete debounceTimers[category];
  }, DEBOUNCE_MS);
}
```

---

## Chokidar Configuration

The watcher is initialized with the following options:

| Option | Value | Description |
|--------|-------|-------------|
| `ignoreInitial` | `true` | Do not emit events for existing files on startup |
| `awaitWriteFinish.stabilityThreshold` | `300` | Wait 300ms after last write before emitting event |
| `ignored` | `[/(^|[/\\])\../, /\.bak$/]` | Ignore dotfiles and `.bak` backup files |

**Stability Threshold:** The `awaitWriteFinish` option ensures events are emitted only after a file has finished writing, preventing partial-read issues with large files.

---

## Event Broadcasting

When a file change is detected and categorized:

1. The `pushRefresh()` function is called with the category
2. After debounce delay, `IPC.DATA_REFRESH` (`data:refresh`) is sent to all windows
3. Payload: `{ category: RefreshCategory }`

**IPC Channel:** `data:refresh`

**Payload Structure:**
```typescript
{
  category: 'players' | 'warps' | 'worldMap' | 'mods'
}
```

---

## Error Handling

Watcher errors are logged to the console but do not throw:

```typescript
watcher.on('error', (err: unknown) => {
  console.error('[FileWatcher] Error:', err instanceof Error ? err.message : String(err));
});
```

Common error scenarios:
- Permission denied on watched directory
- Watched path deleted during operation
- Too many open file handles (system limit)

---

## Lifecycle Integration

The file watcher should be started after the server path is configured and stopped before application exit:

```typescript
// In index.ts (app lifecycle)
app.whenReady().then(async () => {
  const serverDir = getServerDir();
  if (serverDir) {
    await startWatcher(serverDir);
  }
});

app.on('before-quit', async () => {
  await stopWatcher();
});
```

---

## Type Definitions

```typescript
type RefreshCategory = 'players' | 'warps' | 'worldMap' | 'mods';
```

---

## Module State

| Variable | Type | Description |
|----------|------|-------------|
| `watcher` | `FSWatcher \| null` | Chokidar watcher instance |
| `debounceTimers` | `Record<string, Timeout>` | Per-category debounce timers |

---

## Related Modules

- **`server-path.ts`** - Provides server directory path for watcher initialization
- **`ipc-handlers.ts`** - Data query handlers that re-read files after refresh events
- **`shared/constants.ts`** - Defines `IPC.DATA_REFRESH` channel
- **`data-readers/`** - Modules that read the watched files

---

## Performance Considerations

- **Dynamic import:** Chokidar is dynamically imported to avoid bundling into the renderer process
- **Debouncing:** 500ms debounce prevents excessive IPC messages during bulk file operations
- **Stability threshold:** 300ms write-finish delay prevents reading incomplete files
- **Selective watching:** Only specific paths are watched (not the entire server directory)

---

**Last Updated:** 2026-02-15
**Trinity Version:** 2.1.0
