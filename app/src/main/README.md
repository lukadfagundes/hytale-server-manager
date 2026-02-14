# Electron Main Process

Node.js backend that manages the server lifecycle, reads game data, handles IPC, and serves assets. Compiled to CommonJS via `tsconfig.node.json`.

## Overview

The main process is responsible for all system-level operations: spawning the Java game server, reading player/warp/world data files, watching for file changes, extracting assets from zip archives, and serving cached assets via the custom `asset://` protocol.

## Structure

```
main/
├── index.ts              # App lifecycle, BrowserWindow, asset:// protocol
├── ipc-handlers.ts       # 17 ipcMain.handle() channel handlers
├── server-process.ts     # Server spawn/stop, crash detection, auto-restart
├── server-path.ts        # Config persistence (app-config.json), path validation
├── file-watcher.ts       # Chokidar watcher with 500ms debounce
├── asset-extractor.ts    # Assets.zip extraction, stamp-based caching
├── mod-manager.ts        # Mod toggle (mods/ <-> disabled-mods/)
├── updater-service.ts    # electron-updater lifecycle
└── data-readers/         # Game data parsers
    ├── player-reader.ts  # Player stats, inventory, armor, position
    ├── warp-reader.ts    # Warp names, positions, metadata
    ├── world-reader.ts   # Region files, map markers
    ├── mod-reader.ts     # Mod directory listing
    └── index.ts          # Re-exports all readers
```

## Key Components

| Module | Responsibility |
|--------|---------------|
| `index.ts` | App lifecycle, BrowserWindow creation, `asset://` protocol handler, startup orchestration |
| `ipc-handlers.ts` | Registers all 17 `ipcMain.handle()` handlers for server control, data queries, mod toggling, config changes, asset extraction, and updater commands |
| `server-process.ts` | Spawns `HytaleServer.jar` via `child_process.spawn()`, manages stdout/stderr parsing, crash detection (exit < 30s), graceful shutdown (SIGTERM then SIGKILL after 15s), auto-restart on exit code 8 |
| `server-path.ts` | Persists user-selected server directory to `app-config.json`, validates paths by checking for `HytaleServer.jar` |
| `file-watcher.ts` | Chokidar watcher on player JSON, warps, regions, map markers, and mods. Broadcasts `data:refresh` events by category |
| `asset-extractor.ts` | Extracts item icons, NPC portraits, and map markers from `Assets.zip` into `userData/asset-cache/`. Builds `item-icon-map.json`. Stamp-based cache invalidation with concurrency guard |
| `mod-manager.ts` | Enables/disables mods by moving directories between the server's `mods/` folder and `disabled-mods/` |
| `updater-service.ts` | Initializes `electron-updater` in production, checks for updates 5s after launch |

## Documentation

See [CLAUDE.md](CLAUDE.md) for IPC handler patterns, protocol details, and key pitfalls.
