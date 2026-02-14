# Electron Desktop Application

Root directory for the Hytale Server Manager Electron application. Contains all source code, build configurations, and packaging setup.

## Overview

This is an Electron 40 desktop application built with React 19, TypeScript, and Zustand 5. It provides a GUI for managing a Hytale dedicated game server.

## Structure

```
app/
├── src/                    # Application source code
│   ├── main/               # Electron main process (Node.js)
│   ├── renderer/           # React frontend (Chromium)
│   ├── preload/            # Context bridge (IPC channel whitelist)
│   ├── shared/             # Shared constants (IPC channel names)
│   └── __tests__/          # Jest test suites
├── scripts/                # Build and dev helper scripts
├── public/                 # Static assets served by Vite
├── package.json            # App dependencies and scripts
├── electron-builder.yml    # Packaging config (NSIS, AppImage, deb)
├── vite.config.ts          # Vite bundler config (renderer)
├── tailwind.config.ts      # Custom Hytale dark theme
├── tsconfig.json           # TypeScript config (renderer, ESNext)
├── tsconfig.node.json      # TypeScript config (main process, CommonJS)
├── jest.config.js          # Jest test configuration
└── postcss.config.js       # PostCSS + Tailwind pipeline
```

## Build System

Two TypeScript configurations compile different process targets:

| Config | Target | Module System | Scope |
|--------|--------|--------------|-------|
| `tsconfig.node.json` | Main + Preload | CommonJS | `src/main/`, `src/preload/`, `src/shared/` |
| `tsconfig.json` | Renderer | ESNext (bundler) | `src/renderer/`, `src/shared/` |

Vite bundles the renderer (port 5173 in dev). The main process is compiled by `tsc`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Build main process, then run Vite dev server + Electron concurrently |
| `npm run build` | Compile main process + bundle renderer |
| `npm run package` | Full build + electron-builder (produces installers) |
| `npm run typecheck` | Type-check both tsconfig files |
| `npm test` | Run Jest test suite (17 suites, 243 tests) |
| `npm run test:coverage` | Jest with coverage report |

## Packaging

Configured via `electron-builder.yml`:

- **App ID**: `com.hytale-server.manager`
- **Publish**: GitHub Releases
- **Windows**: NSIS installer + portable
- **Linux**: AppImage + .deb

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19 | UI framework |
| `react-dom` | ^19 | React DOM renderer |
| `react-router-dom` | ^7.1 | Hash-based routing (4 pages) |
| `zustand` | ^5 | State management (7 stores) |
| `chokidar` | ^4 | File system watching |
| `electron-updater` | ^6.3 | Auto-update via GitHub Releases |
| `node-stream-zip` | ^1.15 | Runtime Assets.zip extraction |

## Documentation

See [CLAUDE.md](CLAUDE.md) for architecture details.
