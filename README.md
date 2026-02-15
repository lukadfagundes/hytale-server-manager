# Hytale Server Manager

A desktop application for managing a Hytale dedicated game server. Monitor server status, view connected players with their gear and stats, manage warps, toggle mods, and browse game assets -- all from a single interface.

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)

## Features

- **Server Control** -- Start and stop the Hytale server with a single toggle. Real-time log streaming with ANSI color support.
- **Player Viewer** -- Browse online players with expandable cards showing inventory, equipped armor, tools, and stat bars.
- **Warp Directory** -- View and sort server warp points with coordinates and metadata.
- **Mod Manager** -- Enable or disable server mods with a toggle switch. Server-state aware (prevents changes while running).
- **Game Asset Rendering** -- Extracts icons and portraits from `Assets.zip` at runtime, served via a custom `asset://` protocol with text fallback.
- **Auto-Updater** -- Checks GitHub Releases for updates, downloads in the background, and installs with a restart.
- **First-Run Setup** -- Guided server directory selection with path validation.

## Prerequisites

- **Node.js** 22+ and **npm**
- A Hytale dedicated server installation (`HytaleServer.jar` + `Assets.zip`)
- **Java 25** (for running the Hytale server itself)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/lukadfagundes/hytale-server-manager.git
cd hytale-server-manager

# Install dependencies (root + app/)
npm install

# Run in development mode
npm run dev
```

On first launch, the app will prompt you to select your Hytale server directory (the folder containing `HytaleServer.jar`).

## Scripts

All scripts can be run from the root directory:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the app in development mode (Vite + Electron) |
| `npm run build` | Compile main process TypeScript and bundle renderer with Vite |
| `npm run package` | Build distributable installers (Windows NSIS/portable, Linux AppImage/deb) |
| `npm run typecheck` | Run TypeScript type checking across all configs |
| `npm test` | Run the full test suite (17 suites, 240+ tests) |
| `npm run test:coverage` | Run tests with coverage report |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | [Electron 40](https://www.electronjs.org/) |
| Frontend | [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/) |
| State Management | [Zustand 5](https://zustand.docs.pmnd.rs/) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) with custom Hytale theme |
| Bundler | [Vite 6](https://vite.dev/) (renderer) + tsc (main process) |
| Testing | [Jest 29](https://jestjs.io/) + ts-jest |
| Linting | ESLint 8 + Prettier 3 |
| Auto-Updates | [electron-updater](https://www.electron.build/auto-update) via GitHub Releases |
| File Watching | [Chokidar 4](https://github.com/paulmillr/chokidar) |
| Asset Extraction | [node-stream-zip](https://github.com/antelle/node-stream-zip) |
| Pre-commit | Husky 9 + lint-staged 15 |

## Project Structure

```
hytale-server-manager/
├── app/                          # Electron application
│   ├── src/
│   │   ├── main/                 # Main process (server control, IPC, file I/O)
│   │   │   ├── data-readers/     # Player, warp, world, and mod data parsers
│   │   │   ├── index.ts          # App lifecycle, window, asset:// protocol
│   │   │   ├── ipc-handlers.ts   # IPC message routing (17 invoke channels)
│   │   │   ├── server-process.ts # Server spawn/stop with crash detection
│   │   │   ├── server-path.ts    # Config persistence (app-config.json)
│   │   │   ├── file-watcher.ts   # Chokidar FS monitoring with debounce
│   │   │   ├── asset-extractor.ts# Runtime Assets.zip extraction
│   │   │   ├── mod-manager.ts    # Mod toggle (mods/ ↔ disabled-mods/)
│   │   │   └── updater-service.ts# Auto-update via GitHub Releases
│   │   ├── renderer/             # React frontend
│   │   │   ├── pages/            # Dashboard, Players, Warps, ModManager
│   │   │   ├── components/       # 18 reusable components
│   │   │   ├── stores/           # 7 Zustand state stores
│   │   │   ├── services/         # IPC client wrapper
│   │   │   └── utils/            # Asset paths, formatting, translation
│   │   ├── preload/              # Context bridge (IPC channel whitelist)
│   │   ├── shared/               # Shared IPC channel constants
│   │   └── __tests__/            # 17 test suites, 240+ tests
│   ├── package.json              # App dependencies and scripts
│   ├── electron-builder.yml      # Packaging config (NSIS, AppImage, deb)
│   ├── vite.config.ts            # Vite bundler config
│   ├── jest.config.js            # Jest test config
│   └── tailwind.config.ts        # Custom Hytale theme
├── docs/                         # Architecture references and developer guides
├── CONTRIBUTING.md               # Contribution workflow and code standards
├── LICENSE                       # MIT License
└── package.json                  # Root workspace (husky, lint-staged, eslint)
```

## Architecture

The app uses Electron's multi-process architecture with strict context isolation:

- **Main Process** -- Spawns the Java server, reads game data files, manages file watchers, handles asset extraction, and serves cached assets via the `asset://` protocol.
- **Preload Script** -- Exposes a whitelisted set of IPC channels (17 invoke + 13 event) to the renderer. No direct Node.js access in the browser.
- **Renderer Process** -- React SPA with hash routing. 7 Zustand stores manage server state, player/warp/mod data, asset status, configuration, updates, and notifications.

### IPC Communication

| Category | Invoke Channels | Event Channels |
|----------|----------------|----------------|
| Server Control | `server:start`, `server:stop` | `server:status-changed`, `server:log` |
| Data Queries | `data:players`, `data:warps`, `data:world-map`, `data:server-config` | `data:refresh` |
| Mod Management | `mods:list`, `mods:toggle` | -- |
| Configuration | `config:get-server-path`, `config:set-server-path`, `config:select-server-dir` | `config:server-path-changed` |
| Assets | `assets:extract`, `assets:status` | `assets:extracting`, `assets:ready`, `assets:error` |
| Auto-Updater | `updater:check`, `updater:download`, `updater:install`, `updater:get-version` | `updater:checking`, `updater:available`, `updater:not-available`, `updater:progress`, `updater:downloaded`, `updater:error` |

### Asset Protocol

Game icons and portraits are extracted from `Assets.zip` into a persistent cache (`userData/asset-cache/`). The custom `asset://` protocol serves these files to the renderer:

```
asset:///items/Sword.png     → userData/asset-cache/items/Sword.png
asset:///npcs/Goblin.png     → userData/asset-cache/npcs/Goblin.png
asset:///map-markers/Cave.png → userData/asset-cache/map-markers/Cave.png
```

This works identically in development and production -- no conditional branching.

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

**17 test suites, 240+ tests** covering:

- Main process modules (app lifecycle, IPC handlers, server process, config)
- Data readers (player, warp, world, mod)
- Renderer stores (asset, config)
- UI components (ItemIcon with icon map loading and text fallback)
- Utilities (asset paths, formatting, translation)

### Pre-commit Pipeline

Every commit runs:
1. **lint-staged** -- Prettier + ESLint on staged `.ts`/`.tsx` files
2. **Typecheck** -- Full `tsc --noEmit` across both TS configs
3. **Tests** -- Full Jest suite

## Building

```bash
# Build for distribution
npm run package
```

Produces:
- **Windows**: NSIS installer + portable executable
- **Linux**: AppImage + .deb package

Built with [electron-builder](https://www.electron.build/). Publish target is GitHub Releases for auto-update support.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes using [conventional commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

## Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

### Architecture
- [Electron Process Architecture](docs/architecture/electron-process-architecture.md) - Main/Preload/Renderer boundaries
- [IPC Channel Map](docs/architecture/ipc-channel-map.md) - All 30 IPC channels by domain
- [Component Hierarchy](docs/architecture/component-hierarchy.md) - React component tree
- [Data Flow Diagrams](docs/architecture/data-flow.md) - Server lifecycle, game data, assets, config
- [Type Definitions](docs/architecture/type-definitions.md) - TypeScript interfaces and server data shapes
- [Utility Modules](docs/architecture/utility-modules.md) - Asset paths, formatting, and translation helpers

### Guides
- [Getting Started](docs/guides/getting-started.md) - Development setup and first run
- [Installation](docs/guides/installation.md) - End-user download, install, first-run setup, and auto-updates
- [IPC Development](docs/guides/ipc-development.md) - Adding new IPC channels
- [Packaging & Distribution](docs/guides/packaging.md) - Building and releasing
- [Server Hosting](docs/guides/server-hosting.md) - Dedicated server setup and configuration

### Contributing
- [Contributing Guidelines](CONTRIBUTING.md) - Code standards, testing, and workflow

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Luka Fagundes**
