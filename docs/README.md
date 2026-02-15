# Project Documentation

Technical architecture references and how-to guides for developers working on Hytale Server Manager.

## Structure

```
docs/
├── architecture/           # Technical architecture reference
│   ├── component-hierarchy.md
│   ├── data-flow.md
│   ├── electron-process-architecture.md
│   ├── ipc-channel-map.md
│   ├── type-definitions.md
│   └── utility-modules.md
├── guides/                 # How-to guides for developers and users
│   ├── getting-started.md
│   ├── ipc-development.md
│   ├── packaging.md
│   └── server-hosting.md
```

## Architecture

In-depth reference material covering the Electron multi-process model, IPC surface area, React component tree, data flow patterns, shared TypeScript types, and utility modules.

| Document | Description |
|----------|-------------|
| [component-hierarchy.md](architecture/component-hierarchy.md) | React 19 component tree -- 4 pages, 17 components with props and responsibilities |
| [data-flow.md](architecture/data-flow.md) | 4 sequence diagrams covering server lifecycle, game data, asset extraction, and config |
| [electron-process-architecture.md](architecture/electron-process-architecture.md) | Main, Preload, and Renderer process boundaries with security model |
| [ipc-channel-map.md](architecture/ipc-channel-map.md) | All 30 IPC channels -- 17 invoke and 13 event -- grouped by domain |
| [type-definitions.md](architecture/type-definitions.md) | TypeScript interfaces for player, warp, world, mod, and server data shapes |
| [utility-modules.md](architecture/utility-modules.md) | Asset path helpers, number/date formatting, and translation utilities |

## Guides

Step-by-step instructions for common development and operations tasks.

| Document | Description |
|----------|-------------|
| [getting-started.md](guides/getting-started.md) | Dev environment setup, first run, and project orientation |
| [installation.md](guides/installation.md) | End-user download, install, first-run setup, and auto-updates |
| [ipc-development.md](guides/ipc-development.md) | Adding a new IPC channel end-to-end (shared constants, preload, handler, client) |
| [packaging.md](guides/packaging.md) | Building installers, configuring electron-builder, and publishing releases |
| [server-hosting.md](guides/server-hosting.md) | Hytale dedicated server setup, configuration, and troubleshooting |

## Documentation

See [CLAUDE.md](CLAUDE.md) for documentation conventions and AI agent context.