# Application Source Code

All TypeScript source code for the Electron application. Split into four process-boundary directories plus a shared module and a test directory.

## Overview

Code in each directory runs in a different Electron process context with strict isolation between them. The `shared/` directory is the only module imported by both main and renderer processes.

## Structure

```
src/
├── main/           # Electron main process (Node.js, CommonJS)
├── preload/        # Context bridge (isolated preload context)
├── renderer/       # React frontend (Chromium, ESM via Vite)
├── shared/         # IPC channel constants (imported by both processes)
└── __tests__/      # Jest test suites (mirrors src/ structure)
```

## Process Boundaries

| Directory | Runtime | Module System | Node.js Access | DOM Access |
|-----------|---------|---------------|---------------|------------|
| `main/` | Node.js | CommonJS | Yes | No |
| `preload/` | Isolated | CommonJS | Limited (contextBridge) | No |
| `renderer/` | Chromium | ESM (Vite) | No | Yes |
| `shared/` | Both | Both | N/A | N/A |

## Key Rules

- **Never import across process boundaries** -- `main/` and `renderer/` must not import each other. Use IPC.
- **Only `shared/` is imported by both** -- Keep it minimal (constants only, no side effects).
- **Add new IPC channels in 3 places**: `shared/constants.ts`, `preload/index.ts` whitelist, and the relevant handler/client.

## IPC Channel Summary

`shared/constants.ts` defines 30 IPC channels:
- 17 invoke channels (renderer -> main, request/response)
- 13 event channels (main -> renderer, push)

Grouped by domain: Server Control, Data Queries, Mod Management, Config, Assets, Updater.

## Documentation

See [CLAUDE.md](CLAUDE.md) for detailed process boundary documentation.
