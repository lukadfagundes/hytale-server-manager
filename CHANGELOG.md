# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-02-16

### Fixed

- NSIS uninstaller no longer wipes user config during auto-updates -- customUnInstall macro guarded with ${isUpdated} check so cleanup only runs on actual uninstall

## [1.0.0] - 2026-02-16

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
- 15 reusable React components across layout, server, players, mods, warps, setup, and updates domains
- 5 page components: Dashboard, ModManager, Players, Warps, Docs
- IPC client service with typed wrappers for all channels
- Toast notification system with auto-dismiss
- Tailwind CSS styling with dark theme
- Custom app icon (circular HSM in Hytale brand colors)
- CI/CD pipeline: GitHub Actions with typecheck, test, and cross-platform build (Linux + Windows)
- Automated release workflow: tag-triggered build, CHANGELOG extraction, draft GitHub release creation
- In-app Developer Documentation page with sidebar navigation, category browsing, and full markdown rendering with Mermaid diagram support
- Docs utility module with build-time markdown bundling via import.meta.glob, category discovery, title/preview extraction, and Vite/Jest-compatible split architecture
- MarkdownViewer component with react-markdown, remark-gfm, Hytale-themed prose styling, relative link resolution, and mermaid code block detection
- MermaidDiagram component with lazy-loaded mermaid (code-split), dark theme, stale render guards, and loading/error states
- DocsSidebar component with category navigation, active states, and doc count badges
- Update modal release notes now render markdown and HTML content via react-markdown with rehype-raw
- NSIS installer (Windows) with desktop shortcut and portable build
- AppImage and .deb packages (Linux)
- Pre-commit quality gate: lint-staged (Prettier + ESLint) -> typecheck -> test
- Comprehensive documentation: architecture docs, developer guides, end-user installation guide
- Branch naming conventions in CONTRIBUTING.md
- MIT License

### Security

- Path traversal guard in asset:// protocol handler -- resolved paths validated against cache directory boundary
- Input validation in mod-manager toggleMod -- mod names containing path separators or ".." are rejected before any filesystem operations
- Developer config file (app-config.json) removed from git tracking and electron-builder files array, added to .gitignore
- Release workflow shell injection fixed -- uses `--notes-file` instead of inline `--notes` expansion

### Fixed

- ItemIcon fetch stampede eliminated -- icon map reload deduplicated via single in-flight promise in asset-store, components subscribe to `iconMapReady` flag instead of triggering independent fetches
- Refresh listener lifecycle fixed -- universe-store and mod-store listeners initialized at app scope in App.tsx instead of Dashboard-only, ensuring live data updates on all routes
- UpdateNotification close button now works in 'downloaded' state -- added missing `handleClose` branch
- LogPanel smart auto-scroll -- tracks scroll position and only auto-scrolls when user is near bottom, preserving ability to read history
- Duplicate type definitions removed -- server-store and mod-store now import canonical types from types/ directory; server-store LogEntry.stream narrowed to 'stdout' | 'stderr'
- getWarps response shape normalized -- handles both singular `error` and plural `errors` for forward compatibility
- Log entries use stable unique IDs instead of array indices, preventing React DOM reuse glitches when buffer rotates
- Auto-update publish configuration fixed -- electron-builder.yml and dev-app-update.yml repo changed from 'hytale-server' to 'hytale-server-manager'
- Release workflow CHANGELOG URL fixed to point to correct repository
- CI npm cache-dependency-path updated to include both root and app lockfiles for proper cache invalidation
- Linux auto-update manifest (latest-linux.yml) generation added to release workflow
- Root package.json name corrected from 'hytale-server' to 'hytale-server-manager'
- Asset extraction cache validation now checks icon map file existence in addition to stamp file
- Redundant disabled-mods entry removed from electron-builder files array (kept in extraFiles only)
- Update modal enlarged from max-w-md to max-w-2xl and release notes area from max-h-40 to max-h-96 for better readability

### Performance

- Asset extraction converted to async file I/O -- fs.promises.writeFile and fs.promises.mkdir replace synchronous calls, unblocking the main process event loop
- Mod reader converted to async -- getDirSizeAsync uses fs.promises.readdir and fs.promises.stat, eliminating event loop blocking for large mod directories
- Granular Zustand selectors added to LogPanel, ServerToggle, and ModManager -- components only re-render when their specific state slices change
- durabilityPercent computed once per item in EquipmentTree and InventoryGrid, eliminating redundant function calls

### Code Quality

- Shared formatTranslationKey utility created in shared/translation.ts -- consolidated from 3 divergent copies across player-reader, world-reader, and renderer utils
- formatBytes and formatSpeed consolidated in utils/formatting.ts with GB tier support -- removed duplicate from UpdateNotification.tsx
- Dead components removed: ArmorDisplay.tsx and StatsBar.tsx (superseded by EquipmentTree inline code)
- Dead exports removed: readPlayerMemories, getServerConfig, SERVER_DIR, DISABLED_MODS_DIR
- file-watcher.ts watcher variable typed as FSWatcher | null instead of any
- React ErrorBoundary component added and wrapped around app root in App.tsx -- unhandled render errors now show a recovery UI instead of white screen
- updater-service.ts refactored to broadcast to all windows via BrowserWindow.getAllWindows() instead of captured single reference
- Graceful Windows server shutdown -- taskkill without /F attempted first, escalating to force-kill after 15s timeout 

### Accessibility

- UpdateNotification modal: added role="dialog", aria-modal="true", aria-labelledby, and focus trap preventing keyboard users from tabbing behind the modal
- ToastContainer: added aria-live="polite" and role="status" with always-render pattern for live region establishment; individual toasts have role="alert"
- Keyboard tooltip access: InventoryGrid and EquipmentTree item slots now have tabIndex={0}, onFocus/onBlur handlers, and aria-label for screen readers
- Collapsible controls: PlayerCard and LogPanel toggle buttons have aria-expanded attribute
- Progress indicators: stat bars and durability bars have role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax, and aria-label
- Error/warning banners: added role="alert" across ModManager, Players, Warps, and ServerSetup pages
- Sidebar navigation landmarks: aria-label="Main" and aria-label="Documentation" on separate nav elements
- DocsSidebar: nav aria-label="Documentation categories" with NavLink active states
- Docs breadcrumb navigation: semantic nav with aria-label="Breadcrumb" and ordered list structure
- MermaidDiagram: role="img" and aria-label="Diagram" on rendered SVG containers
- MarkdownViewer: semantic article element wrapper for document content

### Tests

- 28 test suites with 508 tests (up from 17 suites / 243 tests)
- New test files: preload.test.ts (36 tests), file-watcher.test.ts (17 tests), updater-service.test.ts (25 tests), server-store.test.ts (18 tests), universe-store.test.ts (24 tests), updater-store.test.ts (32 tests)
- Expanded ipc-handlers.test.ts with 7 new describe blocks covering server:start, server:stop, data:world-map, and all updater:* channels
- Jest collectCoverageFrom expanded to include stores, components, services, and preload
- Security test coverage: 4 path traversal tests for asset:// protocol, 7 input validation tests for toggleMod
- Shared translation utility tests (8 tests), formatting utility tests (8 tests), ErrorBoundary tests (2 tests)
- Docs utility tests: 22 tests covering extractTitle, extractPreview (with code fence tracking), getCategoryLabel, getCategories, getDocsByCategory, getDoc, and dynamic category discovery
- Docs component tests: 21 tests covering file existence checks, link resolution logic (7 cases), and edge case utilities

### Documentation

- Node.js prerequisites updated from 18+ to 22+ in README.md and getting-started.md
- installation.md linked from docs/README.md and root README.md navigation
- packaging.md Release Workflow section rewritten to document automated release.yml CI pipeline
- IPC contract consistently documented as 4-file update across CONTRIBUTING.md and ipc-channel-map.md
- CONTRIBUTING.md branch references updated from dev to main
- server-hosting.md Windows section fixed to use PowerShell syntax instead of bash
- New module documentation: docs/modules/ with 6 detailed module docs (asset-extractor, file-watcher, ipc-client, server-process, server-store, universe-store)

### Architecture

- **Main Process (12 modules):** index.ts, asset-extractor.ts, file-watcher.ts, ipc-handlers.ts, mod-manager.ts, server-path.ts, server-process.ts, updater-service.ts, and 4 data readers (player, warp, world, mod)
- **Renderer (31 files):** App.tsx, ErrorBoundary.tsx, 5 pages, 18 components (including 3 docs components), 2 utils, IPC client service
- **State Management (7 stores):** Zustand with cross-store toast communication pattern and granular selectors
- **Type System (5 type files):** player.ts, server.ts, mod.ts, warp.ts, world.ts
- **Utilities (3 files):** asset-paths.ts, formatting.ts, translation.ts
- **Shared (2 files):** constants.ts (IPC channel name registry), translation.ts (shared utility)

### Installer

- Custom NSIS uninstaller script cleans up %APPDATA%\hytale-server-manager (config + asset cache) and %LOCALAPPDATA%\hytale-server-manager-updater (updater download cache) on uninstall

## [0.0.2] - 2026-02-14

### Changed

- Testing Workflow

## [0.0.1] - 

### Added

- Initial project scaffolding

[Unreleased]: https://github.com/lukadfagundes/hytale-server-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lukadfagundes/hytale-server-manager/compare/v0.0.2...v1.0.0
[0.0.2]: https://github.com/lukadfagundes/hytale-server-manager/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/lukadfagundes/hytale-server-manager/releases/tag/v0.0.1
