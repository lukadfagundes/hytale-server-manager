# IPC Client Module

**Source:** `app/src/renderer/services/ipc-client.ts`

Type-safe wrapper for Electron IPC communication between the renderer process and main process.

---

## Overview

The IPC Client module provides a type-safe abstraction over `window.electronAPI`, the context bridge exposed by the preload script. All renderer-side communication with the main process flows through this module.

**Key responsibilities:**

- Expose typed invoke functions for request/response IPC calls
- Expose typed event listener functions for push-based IPC events
- Define the `DataResult<T>` pattern for consistent error handling
- Declare the global `window.electronAPI` TypeScript interface

**Design principle:** Components and stores must call `ipc-client` functions, never `window.electronAPI` directly.

---

## DataResult<T> Pattern

All data-fetching invoke functions return a `DataResult<T>` object:

```typescript
export interface DataResult<T> {
  data: T;
  errors: string[];
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `data` | `T` | The fetched data (may be empty array/null on partial failure) |
| `errors` | `string[]` | Array of error messages (empty if fully successful) |

**Pattern rationale:**

- Supports partial success scenarios (e.g., 10 players loaded, 2 files failed)
- Errors are surfaced to the UI via toast notifications
- Stores track errors per category for display in components

**Example usage:**

```typescript
const result = await getPlayers();
if (result.errors.length > 0) {
  // Show warnings but still use result.data
  result.errors.forEach(err => console.warn(err));
}
// result.data is always defined (may be empty array)
```

---

## Invoke Functions (17 channels)

### Server Control

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `startServer()` | `server:start` | none | `Promise<void>` | Start the game server |
| `stopServer()` | `server:stop` | none | `Promise<void>` | Stop the game server |

### Data Queries

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `getPlayers()` | `data:players` | none | `Promise<DataResult<PlayerData[]>>` | Fetch all player data |
| `getWarps()` | `data:warps` | none | `Promise<DataResult<Warp[]>>` | Fetch all warp points |
| `getWorldMap()` | `data:world-map` | none | `Promise<DataResult<WorldMapData>>` | Fetch world map data |

### Mod Management

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `getMods()` | `mods:list` | none | `Promise<DataResult<ModInfo[]>>` | Fetch all mods |
| `toggleMod()` | `mods:toggle` | `modName: string, enabled: boolean` | `Promise<void>` | Enable/disable a mod |

### Configuration

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `getServerPath()` | `config:get-server-path` | none | `Promise<ServerPathInfo>` | Get current server path and validity |
| `setServerPath()` | `config:set-server-path` | `newPath: string` | `Promise<{ success: boolean; error?: string }>` | Set server directory path |
| `selectServerDir()` | `config:select-server-dir` | none | `Promise<SelectDirResult>` | Open directory picker dialog |

### Assets

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `extractAssets()` | `assets:extract` | none | `Promise<{ success: boolean; error?: string }>` | Extract game assets |
| `getAssetStatus()` | `assets:status` | none | `Promise<{ cached: boolean }>` | Check if assets are cached |

### Updater

| Function | Channel | Parameters | Return Type | Description |
|----------|---------|------------|-------------|-------------|
| `checkForUpdates()` | `updater:check` | none | `Promise<void>` | Check for app updates |
| `downloadUpdate()` | `updater:download` | none | `Promise<void>` | Download available update |
| `installUpdate()` | `updater:install` | none | `Promise<void>` | Install downloaded update |
| `getAppVersion()` | `updater:get-version` | none | `Promise<string>` | Get current app version |

---

## Event Listener Functions (13 channels)

All event listener functions return an unsubscribe function: `() => void`

### Server Events

| Function | Channel | Callback Parameter | Description |
|----------|---------|-------------------|-------------|
| `onServerStatusChanged()` | `server:status-changed` | `status: string` | Server status transitions |
| `onServerLog()` | `server:log` | `entry: LogEntry` | New log entry from server |

### Data Events

| Function | Channel | Callback Parameter | Description |
|----------|---------|-------------------|-------------|
| `onDataRefresh()` | `data:refresh` | `category: string` | Data category needs refresh |

### Configuration Events

| Function | Channel | Callback Parameter | Description |
|----------|---------|-------------------|-------------|
| `onServerPathChanged()` | `config:server-path-changed` | `info: ServerPathInfo` | Server path configuration changed |

### Asset Events

| Function | Channel | Callback Parameter | Description |
|----------|---------|-------------------|-------------|
| `onAssetsExtracting()` | `assets:extracting` | none | Asset extraction started |
| `onAssetsReady()` | `assets:ready` | none | Assets ready for use |
| `onAssetsError()` | `assets:error` | `error: { message: string }` | Asset extraction failed |

### Updater Events

| Function | Channel | Callback Parameter | Description |
|----------|---------|-------------------|-------------|
| `onUpdaterChecking()` | `updater:checking` | none | Checking for updates |
| `onUpdaterAvailable()` | `updater:available` | `info: UpdateInfo` | Update available |
| `onUpdaterNotAvailable()` | `updater:not-available` | none | No update available |
| `onUpdaterProgress()` | `updater:progress` | `progress: DownloadProgress` | Download progress |
| `onUpdaterDownloaded()` | `updater:downloaded` | `info: UpdateInfo` | Update downloaded |
| `onUpdaterError()` | `updater:error` | `error: { message: string }` | Update error |

---

## Type Definitions

### ServerPathInfo

```typescript
export interface ServerPathInfo {
  path: string;    // Absolute path to server directory
  valid: boolean;  // Whether path contains valid server files
}
```

### SelectDirResult

```typescript
export interface SelectDirResult {
  selected: boolean;  // User selected a directory (not cancelled)
  path?: string;      // Selected path (if selected)
  valid?: boolean;    // Path validity (if selected)
}
```

### UpdateInfo

```typescript
export interface UpdateInfo {
  version: string;        // Semantic version (e.g., "1.2.3")
  releaseDate: string;    // ISO 8601 date string
  releaseNotes?: string;  // Markdown release notes
}
```

### DownloadProgress

```typescript
export interface DownloadProgress {
  percent: number;       // 0-100 download percentage
  bytesPerSecond: number; // Current download speed
  transferred: number;   // Bytes downloaded so far
  total: number;         // Total bytes to download
}
```

### LogEntry (imported)

```typescript
interface LogEntry {
  line: string;              // Log line content
  stream: 'stdout' | 'stderr'; // Output stream source
  timestamp: number;         // Unix timestamp (ms)
}
```

---

## Error Handling Patterns

### Invoke Functions

Invoke functions throw on transport errors (IPC failure). Application-level errors are returned in the `errors` array or `error` field:

```typescript
// DataResult pattern - errors in array
const result = await getPlayers();
if (result.errors.length > 0) {
  result.errors.forEach(err => showWarning(err));
}

// Simple error pattern - error in field
const pathResult = await setServerPath('/new/path');
if (!pathResult.success) {
  showError(pathResult.error);
}
```

### Event Listeners

Event listeners automatically handle subscription cleanup via the returned unsubscribe function:

```typescript
// Subscribe on mount
const unsubscribe = onServerStatusChanged((status) => {
  setStatus(status);
});

// Cleanup on unmount
return () => {
  unsubscribe();
};
```

---

## Usage Examples

### With Zustand Store

```typescript
// server-store.ts
import { create } from 'zustand';
import {
  startServer,
  stopServer,
  onServerStatusChanged,
  onServerLog,
} from '../services/ipc-client';

export const useServerStore = create((set) => ({
  status: 'stopped',
  logs: [],

  start: async () => {
    await startServer();
  },

  stop: async () => {
    await stopServer();
  },

  init: () => {
    const unsubStatus = onServerStatusChanged((status) => {
      set({ status });
    });

    const unsubLog = onServerLog((entry) => {
      set((state) => ({
        logs: [...state.logs, entry].slice(-1000)
      }));
    });

    // Return cleanup function
    return () => {
      unsubStatus();
      unsubLog();
    };
  },
}));
```

### With React Component

```typescript
// Dashboard.tsx
import { useEffect } from 'react';
import { useServerStore } from '../stores/server-store';

export function Dashboard() {
  const { status, logs, start, stop, init } = useServerStore();

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log.line}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Fetching Data with Error Handling

```typescript
// universe-store.ts
import { getPlayers } from '../services/ipc-client';
import { useToastStore } from './toast-store';

async function fetchPlayers() {
  const result = await getPlayers();

  // Report any errors as toast warnings
  if (result.errors.length > 0) {
    const addToast = useToastStore.getState().addToast;
    result.errors.forEach(err => addToast(err, 'warning'));
  }

  // Store data (may be partial)
  set({
    players: result.data,
    errors: { players: result.errors }
  });
}
```

---

## Related Modules

- **Stores:** `server-store.ts`, `universe-store.ts`, `mod-store.ts`, `config-store.ts`, `asset-store.ts`, `updater-store.ts`
- **Preload:** `src/preload/index.ts` (defines allowed channels)
- **Constants:** `src/shared/constants.ts` (IPC channel names)
- **Types:** `src/renderer/types/` (PlayerData, Warp, ModInfo, etc.)
