# Jest Test Suites

17 test suites with 243 tests. Uses Jest 29 with ts-jest preset. Test environment is `node`.

## Overview

Tests mirror the `src/` directory structure, covering main process modules, data readers, React components, Zustand stores, and utility functions.

## Structure

```
__tests__/
├── main/                         # Main process module tests
│   ├── index.test.ts             # App init, protocol handler, startup extraction
│   ├── ipc-handlers.test.ts      # All IPC channel handlers
│   ├── server-process.test.ts    # Spawn, stop, logs, crash detection, auto-restart
│   ├── server-path.test.ts       # Config persistence, path validation
│   ├── asset-extractor.test.ts   # Extraction, stamp validation, concurrency guard
│   └── mod-manager.test.ts       # Mod enable/disable, error handling
├── data-readers/                 # Data reader tests
│   ├── player-reader.test.ts     # Player JSON parsing, stats, inventory
│   ├── warp-reader.test.ts       # Warp JSON parsing
│   ├── world-reader.test.ts      # Region scanning, map markers
│   └── mod-reader.test.ts        # Mod directory scanning
├── components/                   # React component tests
│   ├── ItemIcon.test.ts          # Icon rendering, fallback, icon map reload
│   └── NpcPortrait.test.ts       # Portrait loading
├── stores/                       # Zustand store tests
│   ├── asset-store.test.ts       # State transitions, IPC event subscriptions
│   └── config-store.test.ts      # Config persistence, validation
├── utils/                        # Utility function tests
│   ├── asset-paths.test.ts       # asset:// URL generation
│   ├── formatting.test.ts        # Display formatters
│   └── translation.test.ts       # i18n key parsing
└── fixtures/                     # Test fixture data
    ├── player-valid.json
    ├── player-minimal.json
    ├── player-malformed.json
    ├── warps-valid.json
    ├── warps-empty.json
    └── markers-valid.json
```

## Running Tests

```bash
# From app/ directory
npm test                    # All 17 suites
npm run test:coverage       # With coverage report
npx jest path/to/test.ts   # Single file
```

## Test Patterns

- **Electron mocking**: Main process tests mock the `electron` module (app, BrowserWindow, ipcMain, protocol, net)
- **Module isolation**: `jest.isolateModules()` for modules with top-level side effects (requires `require()` inside callback)
- **Fixture files**: JSON fixtures in `fixtures/` provide realistic test data
- **Store tests**: Mock `ipc-client` module, then test state transitions by calling store actions

## Documentation

See [CLAUDE.md](CLAUDE.md) for detailed testing patterns and pre-commit integration.
