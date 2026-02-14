# IPC Development Guide

This guide explains the inter-process communication (IPC) architecture in the Hytale Server Manager and provides step-by-step instructions for adding new channels.

## Architecture Overview

Electron enforces process isolation between the Node.js **main process** and the Chromium **renderer process**. All communication between them passes through IPC channels mediated by a **preload script** that acts as a security boundary.

```
Renderer (React)          Preload (Context Bridge)          Main (Node.js)
─────────────────         ──────────────────────           ─────────────────
ipc-client.ts       →     window.electronAPI.invoke()  →   ipcMain.handle()
  (typed wrappers)         (whitelist-gated)                (handlers)

store listeners     ←     window.electronAPI.on()      ←   webContents.send()
  (state updates)          (whitelist-gated)                (broadcasts)
```

### Two Channel Types

**Invoke channels** (renderer to main, request/response):
The renderer calls an invoke channel and awaits a response, similar to an HTTP request/response cycle. There are 17 invoke channels.

**Event channels** (main to renderer, push):
The main process broadcasts events to all renderer windows, similar to WebSocket push messages. There are 13 event channels.

### The Security Boundary

The preload script (`app/src/preload/index.ts`) exposes exactly two methods on `window.electronAPI`:

```typescript
// Only channels in the whitelist arrays are allowed
invoke(channel, ...args)  // gated by ALLOWED_INVOKE_CHANNELS
on(channel, callback)     // gated by ALLOWED_ON_CHANNELS
```

Any channel string not present in the corresponding whitelist array throws an error at runtime. This prevents arbitrary IPC access from the renderer.

## The Three-File Contract

Every IPC channel must be defined in three files. Missing any one of them causes silent failures or runtime errors.

| File | Purpose |
|------|---------|
| `app/src/shared/constants.ts` | Single source of truth for channel name strings |
| `app/src/preload/index.ts` | Whitelist arrays that gate access |
| `app/src/main/ipc-handlers.ts` or `app/src/renderer/services/ipc-client.ts` | Handler registration or typed client wrapper |

## Adding a New Invoke Channel

This example adds a `data:server-stats` invoke channel that returns server resource usage.

### Step 1: Define the Channel Constant

Add the channel string to the `IPC` object in `app/src/shared/constants.ts`:

```typescript
export const IPC = {
  // ... existing channels ...
  DATA_SERVER_STATS: 'data:server-stats',
} as const;
```

### Step 2: Whitelist in Preload

Add the channel string to `ALLOWED_INVOKE_CHANNELS` in `app/src/preload/index.ts`:

```typescript
const ALLOWED_INVOKE_CHANNELS = [
  // ... existing channels ...
  'data:server-stats',
] as const;
```

### Step 3: Register the Handler

Add an `ipcMain.handle()` call in `app/src/main/ipc-handlers.ts`:

```typescript
ipcMain.handle(IPC.DATA_SERVER_STATS, async () => {
  try {
    const stats = readServerStats(getServerDir());
    return { data: stats, errors: [] };
  } catch (err) {
    return { data: null, errors: [(err as Error).message] };
  }
});
```

### Step 4: Add a Typed Client Wrapper

Add an exported function in `app/src/renderer/services/ipc-client.ts`:

```typescript
export interface ServerStats {
  cpuPercent: number;
  memoryMB: number;
  uptimeSeconds: number;
}

export async function getServerStats(): Promise<DataResult<ServerStats>> {
  const result = (await window.electronAPI.invoke('data:server-stats')) as {
    data: ServerStats;
    errors: string[];
  };
  return { data: result.data, errors: result.errors };
}
```

### Step 5: Call from a Store or Component

Use the typed wrapper in a Zustand store or React component:

```typescript
import { getServerStats } from '../services/ipc-client';

// In a store action:
async fetchStats() {
  const result = await getServerStats();
  if (result.errors.length === 0) {
    set({ stats: result.data });
  }
}
```

## Adding a New Event Channel

This example adds a `server:resource-alert` event channel that the main process pushes when resources exceed a threshold.

### Step 1: Define the Channel Constant

```typescript
export const IPC = {
  // ... existing channels ...
  SERVER_RESOURCE_ALERT: 'server:resource-alert',
} as const;
```

### Step 2: Whitelist in Preload

Add the string to `ALLOWED_ON_CHANNELS`:

```typescript
const ALLOWED_ON_CHANNELS = [
  // ... existing channels ...
  'server:resource-alert',
] as const;
```

### Step 3: Broadcast from Main Process

In the main process module that detects the condition:

```typescript
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';

function checkResources(): void {
  const usage = getResourceUsage();
  if (usage.memoryPercent > 90) {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.SERVER_RESOURCE_ALERT, {
        type: 'memory',
        percent: usage.memoryPercent,
      });
    }
  }
}
```

### Step 4: Add a Listener Wrapper in ipc-client

```typescript
export interface ResourceAlert {
  type: string;
  percent: number;
}

export function onResourceAlert(callback: (alert: ResourceAlert) => void): () => void {
  return window.electronAPI.on('server:resource-alert', (data) =>
    callback(data as ResourceAlert)
  );
}
```

### Step 5: Subscribe in a Store

Subscribe in the store's `init()` method and return the unsubscribe function for cleanup:

```typescript
import { onResourceAlert } from '../services/ipc-client';

init() {
  const unsubAlert = onResourceAlert((alert) => {
    set({ lastAlert: alert });
  });

  // Return cleanup function (called by App.tsx useEffect cleanup)
  return () => {
    unsubAlert();
  };
}
```

## Patterns

### DataResult Pattern

Most invoke handlers return a consistent shape for data queries:

```typescript
export interface DataResult<T> {
  data: T;
  errors: string[];
}
```

The `data` field contains the payload and `errors` contains an array of non-fatal error messages (e.g., individual files that failed to parse). This allows partial results -- the renderer can display what succeeded and surface what failed.

### Store Init/Cleanup Lifecycle

Every Zustand store that listens to IPC events follows this pattern:

```typescript
// In the store definition:
init(): () => void {
  const unsub1 = onSomeEvent((data) => set({ field: data }));
  const unsub2 = onAnotherEvent((data) => set({ other: data }));

  // Return a single cleanup function
  return () => {
    unsub1();
    unsub2();
  };
}
```

The `App.tsx` root component calls `init()` in a `useEffect` and stores the returned cleanup function:

```typescript
useEffect(() => {
  const cleanupConfig = useConfigStore.getState().init();
  const cleanupAssets = useAssetStore.getState().init();
  return () => {
    cleanupConfig();
    cleanupAssets();
  };
}, []);
```

### Broadcast Pattern for Async Operations

Long-running operations (asset extraction, server start/stop) follow a broadcast lifecycle so the renderer can show progress:

```
Main broadcasts:  OPERATION_STARTING  →  OPERATION_SUCCESS or OPERATION_ERROR
Renderer store:   status: 'loading'   →  status: 'ready'   or status: 'error'
```

Every code path that triggers the operation -- whether at startup or on-demand -- must broadcast the full lifecycle. Missing broadcasts leave the renderer store stuck in a stale state.

## Common Pitfalls

### Missing Preload Whitelist Entry

If you add a channel to `constants.ts` and `ipc-handlers.ts` but forget the preload whitelist, the call will **silently fail** in the renderer. The preload's `invoke()` method throws an error, but if the caller does not handle the rejection it may go unnoticed. Always update all three files.

### Incomplete Lifecycle Broadcasts

If your main process handler broadcasts a "starting" event but one error path skips the "error" event, the renderer store will remain in the loading state indefinitely. Wrap operations in try/catch and always broadcast a terminal event:

```typescript
for (const win of BrowserWindow.getAllWindows()) {
  win.webContents.send(IPC.OPERATION_STARTING);
}
try {
  const result = await doWork();
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.OPERATION_SUCCESS, result);
  }
} catch (err) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.OPERATION_ERROR, { message: (err as Error).message });
  }
}
```

### Cross-Process Imports

Never import a file from `app/src/main/` inside `app/src/renderer/` or vice versa. The main process runs in Node.js (CommonJS), while the renderer runs in Chromium (ESM via Vite). Mixing them causes build failures or runtime errors. Only `app/src/shared/` may be imported by both.

### Forgetting Cleanup in Store Init

If `init()` subscribes to IPC events but does not return an unsubscribe function, listeners accumulate on hot-reload during development. Always return a cleanup function.

## Channel Reference

### Invoke Channels (Renderer to Main)

| Channel | Domain | Purpose |
|---------|--------|---------|
| `server:start` | Server | Start the Hytale server process |
| `server:stop` | Server | Stop the running server |
| `data:players` | Data | Read all player JSON files |
| `data:warps` | Data | Read warps.json |
| `data:world-map` | Data | Read world regions + map markers |
| `data:server-config` | Data | Read server config.json |
| `mods:list` | Mods | List all mods with enabled/disabled state |
| `mods:toggle` | Mods | Enable or disable a mod |
| `config:get-server-path` | Config | Get current server directory path |
| `config:set-server-path` | Config | Set a new server directory path |
| `config:select-server-dir` | Config | Open native directory picker dialog |
| `assets:extract` | Assets | Trigger asset extraction from Assets.zip |
| `assets:status` | Assets | Check if assets are cached |
| `updater:check` | Updater | Check for application updates |
| `updater:download` | Updater | Download available update |
| `updater:install` | Updater | Quit and install downloaded update |
| `updater:get-version` | Updater | Get current application version |

### Event Channels (Main to Renderer)

| Channel | Domain | Purpose |
|---------|--------|---------|
| `server:status-changed` | Server | Server status transitions (starting/running/stopped) |
| `server:log` | Server | Stdout/stderr log lines from server process |
| `data:refresh` | Data | File watcher detected changes (categorized) |
| `config:server-path-changed` | Config | Server path was updated |
| `assets:extracting` | Assets | Asset extraction started |
| `assets:ready` | Assets | Asset extraction completed successfully |
| `assets:error` | Assets | Asset extraction failed |
| `updater:checking` | Updater | Checking for updates |
| `updater:available` | Updater | Update available (includes version info) |
| `updater:not-available` | Updater | No update available |
| `updater:progress` | Updater | Download progress (percent, speed, bytes) |
| `updater:downloaded` | Updater | Update downloaded, ready to install |
| `updater:error` | Updater | Updater encountered an error |
