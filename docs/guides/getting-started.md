# Getting Started

This guide walks you through setting up the Hytale Server Manager development environment from scratch, running the app in development mode, and executing tests.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v22 or later) -- matches the version used in CI
- **npm** (comes with Node.js)
- **Git**

For full functionality you also need a **Hytale dedicated server** installation. The app validates the server directory by checking for `HytaleServer.jar`. Without it the app will launch in setup mode, prompting you to select a server directory.

> **Don't have a server yet?** See the [Server Hosting](./server-hosting.md) guide for step-by-step instructions on downloading and setting up a Hytale dedicated server.

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd hytale-server-manager
npm install
```

The root `npm install` does two things:

1. Installs root-level dev tools: **husky** (git hooks), **lint-staged**, **eslint**, and **prettier**.
2. Automatically runs `postinstall`, which executes `cd app && npm install` to install all application dependencies (Electron, React, Zustand, Vite, Jest, and everything else).

You do not need to run `npm install` inside the `app/` directory separately.

## Development

Start the development environment with a single command:

```bash
npm run dev
```

This does the following under the hood:

1. Compiles the main process and preload script via `tsc -p tsconfig.node.json`
2. Starts the **Vite dev server** on `http://localhost:5173` (renderer hot-reload)
3. Launches **Electron** pointed at the Vite dev server

The renderer process (React UI) supports **hot module replacement** -- changes to components, styles, and stores are reflected instantly without a full reload.

**Main process changes require a restart.** If you modify files in `app/src/main/` or `app/src/preload/`, stop the dev server (Ctrl+C) and run `npm run dev` again.

### DevTools

In development mode the Chromium DevTools panel opens automatically alongside the app window. You can also open it manually with `Ctrl+Shift+I` (Windows/Linux).

## Project Structure

```
hytale-server-manager/
├── app/                          # Electron application
│   ├── src/
│   │   ├── main/                 # Node.js main process (server lifecycle, IPC, file watching)
│   │   ├── preload/              # Context bridge (security boundary)
│   │   ├── renderer/             # React 19 frontend (pages, components, stores)
│   │   ├── shared/               # IPC channel constants (imported by both processes)
│   │   └── __tests__/            # Jest test suites (mirrors src/ structure)
│   ├── electron-builder.yml      # Packaging configuration
│   ├── tsconfig.json             # Renderer TypeScript config
│   ├── tsconfig.node.json        # Main/preload TypeScript config
│   ├── vite.config.ts            # Vite bundler config
│   └── package.json              # App dependencies and scripts
├── disabled-mods/                # Runtime storage for disabled mods (writable)
├── package.json                  # Root: dev tools and delegating scripts
└── .husky/                       # Git hooks (pre-commit)
```

### Process Boundaries

The application has three distinct process contexts. Code in each directory runs in isolation:

| Directory        | Runtime  | Module System | Node.js Access | DOM Access |
|------------------|----------|---------------|----------------|------------|
| `app/src/main/`     | Node.js  | CommonJS      | Full           | No         |
| `app/src/preload/`  | Isolated | CommonJS      | Limited        | No         |
| `app/src/renderer/` | Chromium | ESM (Vite)    | No             | Full       |
| `app/src/shared/`   | Both     | Both          | N/A            | N/A        |

**Never import between `main/` and `renderer/`.** All communication goes through IPC via the preload bridge. Only `shared/` is imported by both processes.

The renderer `tsconfig.json` defines a `@shared/*` path alias that resolves to `src/shared/`. Use this alias when importing IPC channel constants or other shared modules from renderer code (e.g., `import { IPC } from '@shared/constants'`).

## Running Tests

The project has 17 test suites with 240+ tests using Jest 29 and ts-jest.

```bash
# Run all test suites
npm test

# Run with coverage report
npm run test:coverage

# Run a single test file
cd app && npx jest src/__tests__/main/server-process.test.ts
```

Test files mirror the `src/` directory structure inside `app/src/__tests__/`.

## Type Checking

Run the TypeScript compiler in check-only mode across both tsconfig files:

```bash
npm run typecheck
```

This validates both the main/preload config (`tsconfig.node.json`) and the renderer config (`tsconfig.json`) without emitting output files.

## Configuration

The app does not use `.env` files. Runtime configuration is stored in `app-config.json`:

- **Development**: reads/writes `app-config.json` relative to the compiled output directory. The path is resolved as `path.resolve(__dirname, '..', '..', CONFIG_FILENAME)` from `dist/main/server-path.js`, which places the file alongside the `app/` directory -- not inside `src/`.
- **Production**: reads/writes in the system's user data directory (`app.getPath('userData')`)

On first launch, if no valid server path is configured, the app displays a **Server Setup** screen prompting you to select a directory containing `HytaleServer.jar`. Once selected, the path is persisted to `app-config.json` and the full UI loads.

You do not need to create `app-config.json` manually -- it is generated at runtime.

## Building for Production

Compile the application without packaging:

```bash
npm run build
```

This runs two steps:

1. `tsc -p tsconfig.node.json` -- compiles main process and preload to `app/dist/`
2. `vite build` -- bundles the renderer to `app/dist/renderer/`

To build and produce platform-specific installers:

```bash
npm run package
```

This runs `npm run build` followed by `electron-builder`, which reads `app/electron-builder.yml` and outputs installers to `app/out/`.

See the [Packaging Guide](./packaging.md) for details on distribution targets and configuration.

## Pre-commit Hooks

The project uses **Husky** to enforce code quality on every commit. The pre-commit hook runs three steps in sequence:

```bash
npx lint-staged    # 1. Format (prettier) and lint (eslint) staged .ts/.tsx files
npm run typecheck  # 2. Type-check both tsconfigs
npm test           # 3. Run all test suites
```

If any step fails, the commit is blocked. This ensures that committed code always passes formatting, type checking, and tests.

## Next Steps

- Read the [IPC Development Guide](./ipc-development.md) to understand how the main and renderer processes communicate.
- Read the [Packaging Guide](./packaging.md) for building distributable installers.
- Review [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution workflow and code standards.
