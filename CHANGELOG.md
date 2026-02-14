# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Electron 40 + React 19 + TypeScript + Zustand 5 desktop application
- Server process management (start/stop) with real-time log streaming and ANSI color parsing
- Player data viewer with full inventory, equipment, stats, armor, respawn points, and death markers
- Warp point browser with sorting by name or creation date
- Mod manager with enable/disable toggle (moves directories between Server/mods/ and disabled-mods/)
- World map data reader with region file scanning, map markers, and bounds calculation
- Auto-update system via electron-updater with skip-version and remind-later UX
- File watcher (chokidar) with debounced per-category refresh events for live data updates
- Server directory configuration with validation, persistence to app-config.json, and first-run setup wizard
- Custom asset:// protocol serving extracted game assets from userData cache
- Asset extraction pipeline: extracts item icons, NPC portraits, and map markers from Assets.zip with stamp-based cache invalidation
- Context-isolated IPC with channel whitelist in preload bridge (30 channels: 17 invoke + 13 event)
- 7 Zustand stores: asset, config, mod, server, toast, universe, updater
- 17 reusable React components across layout, server, players, mods, warps, setup, and updates domains
- 4 page components: Dashboard, ModManager, Players, Warps
- IPC client service with typed wrappers for all channels
- Toast notification system with auto-dismiss
- Tailwind CSS styling with dark theme
- Custom app icon (circular HSM in Hytale brand colors)
- CI/CD pipeline: GitHub Actions with typecheck, test, and cross-platform build (Linux + Windows)
- Automated release workflow: tag-triggered build, CHANGELOG extraction, draft GitHub release creation
- NSIS installer (Windows) with desktop shortcut and portable build
- AppImage and .deb packages (Linux)
- Pre-commit quality gate: lint-staged (Prettier + ESLint) -> typecheck -> test
- 17 test suites with 243 tests covering main process, data readers, stores, and utilities
- Comprehensive documentation: architecture docs, developer guides, end-user installation guide
- Branch naming conventions in CONTRIBUTING.md
- MIT License

### Architecture

- **Main Process (12 modules):** index.ts, asset-extractor.ts, file-watcher.ts, ipc-handlers.ts, mod-manager.ts, server-path.ts, server-process.ts, updater-service.ts, and 4 data readers (player, warp, world, mod)
- **Renderer (25 files):** App.tsx, 4 pages, 17 components, IPC client service
- **State Management (7 stores):** Zustand with cross-store toast communication pattern
- **Type System (5 type files):** player.ts, server.ts, mod.ts, warp.ts, world.ts
- **Utilities (3 files):** asset-paths.ts, formatting.ts, translation.ts
- **Shared:** constants.ts with IPC channel name registry

### Known Issues

#### Security

- Path traversal possible in asset:// protocol handler -- decoded URL joined to cache directory without bounds check after resolution
- Path traversal possible in mod-manager toggleMod -- modName from IPC used unsanitized in path.join
- app-config.json committed to git with developer filesystem path (contains username, non-portable)
- Release workflow inline expansion of CHANGELOG content is vulnerable to shell injection via backticks or $()

#### Bugs

- ItemIcon fetch stampede: all visible ItemIcon components independently call reloadIconMap() when asset status becomes 'ready', causing N simultaneous fetches
- UpdateNotification close button does nothing in 'downloaded' state (no handleClose branch for it)
- Universe/mod refresh listeners initialized only in Dashboard useEffect -- navigating directly to /players or /warps skips listener setup
- LogPanel auto-scroll always jumps to bottom even when user has scrolled up to read older entries
- Duplicate type definitions in stores: mod-store.ts and server-store.ts redefine types locally instead of importing from types/; server-store LogEntry.stream is weaker string type vs canonical 'stdout' | 'stderr'
- getWarps response shape inconsistency in ipc-client.ts (singular error vs plural errors) -- could silently drop errors if main process is refactored
- Log entries use index-based keys that shift as the 1000-entry buffer fills

#### Build/Configuration

- electron-builder.yml publish repo is 'hytale-server' -- must be 'hytale-server-manager' for auto-updates to work
- dev-app-update.yml has same repo name mismatch
- Release workflow CHANGELOG URL points to wrong repository
- No CHANGELOG.md existed (now created)
- app-config.json bundled into distributed builds via electron-builder files array
- CI npm cache-dependency-path points to app/package-lock.json but npm ci runs from root package-lock.json
- No latest-linux.yml generated in release workflow -- Linux auto-updates will not work
- Root package.json name is 'hytale-server', should be 'hytale-server-manager'
- extract-assets.js cache validation only checks stamp file, not icon map content
- buildResources: build directory does not exist (no custom installer branding)
- disabled-mods listed redundantly in both files and extraFiles in electron-builder.yml

#### Performance

- Synchronous file I/O in asset-extractor.ts (writeFileSync in extraction loop) blocks main process
- Recursive synchronous getDirSize in mod-reader.ts blocks event loop for large mod directories
- Multiple store subscriptions without selectors cause unnecessary re-renders (LogPanel, ServerToggle, ModManager)
- durabilityPercent() called 3 times per item in EquipmentTree and InventoryGrid

#### Code Quality

- formatTranslationKey duplicated 3 times with divergent logic across player-reader.ts, world-reader.ts, and renderer/utils/translation.ts
- formatBytes duplicated in UpdateNotification.tsx vs utils/formatting.ts with different implementations
- Dead components: ArmorDisplay.tsx and StatsBar.tsx are not imported anywhere
- Dead exports: readPlayerMemories in player-reader.ts, getServerConfig in ipc-client.ts, SERVER_DIR and DISABLED_MODS_DIR in constants.ts
- file-watcher.ts uses any type for watcher variable
- Pervasive unsafe 'as' casts in ipc-client.ts with no runtime validation
- No React error boundary for crash recovery
- updater-service.ts broadcasts only to captured window reference, not BrowserWindow.getAllWindows()
- Windows server shutdown uses taskkill /F (force) immediately, bypassing graceful shutdown

#### Accessibility

- No focus trap, role="dialog", or aria-modal in UpdateNotification modal
- No role="alert" or aria-live on ToastContainer
- No keyboard access to inventory/equipment tooltips
- No aria-expanded on collapsible controls (PlayerCard, LogPanel)
- No role="progressbar" on stat bars and durability bars
- Error/warning banners lack role="alert" across multiple pages

#### Test Coverage Gaps

- No tests for: file-watcher.ts, updater-service.ts, preload/index.ts (security boundary)
- No tests for 3 of 7 Zustand stores: server-store, universe-store, updater-store
- 4 IPC channels untested in ipc-handlers.test.ts: server:start, server:stop, data:world-map, updater:*
- Jest coverage collection excludes stores and components from reporting
- No integration, E2E, or visual tests

#### Documentation

- Prerequisites recommend Node.js 18+ but CI requires Node 22 (Node 18 is EOL)
- installation.md not linked from docs/README.md or root README.md
- packaging.md describes manual release process but automated release.yml workflow exists
- Three-file vs four-file IPC contract described inconsistently across docs
- CONTRIBUTING.md references dev branch that may not exist yet
- server-hosting.md uses bash syntax (export PATH) in Windows section

## [0.0.2] - 2026-02-14

### Changed

- Testing Workflow

## [0.0.1] - 2026-02-14

### Added

- Initial project scaffolding

[Unreleased]: https://github.com/lukadfagundes/hytale-server-manager/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/lukadfagundes/hytale-server-manager/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/lukadfagundes/hytale-server-manager/releases/tag/v0.0.1
