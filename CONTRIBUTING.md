# Contributing to Hytale Server Manager

Thank you for your interest in contributing. This document covers the development workflow, code standards, and rules you need to follow.

## Getting Started

Set up your local development environment by following the [Getting Started Guide](docs/guides/getting-started.md). It covers prerequisites, installation, running the dev server, and executing tests.

## Development Workflow

1. **Fork** the repository and clone your fork locally.
2. **Create a feature branch** off `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/15-my-feature
   ```
3. **Make your changes** and commit using conventional commit messages (see below).
4. **Push** your branch and open a **Pull Request** targeting the `dev` branch.

### Branch Naming

Follow the format `<type>/<issue-number>-<short-description>`. If your work is tied to a GitHub issue, include the issue number first so GitHub auto-links the branch to the issue.

```
feat/15-dark-mode-toggle
fix/42-player-position-parsing
refactor/31-extract-broadcast-helper
test/28-mod-manager-edge-cases
docs/53-update-ipc-guide
```

If there is no associated issue, omit the number:

```
feat/dark-mode-toggle
fix/player-position-parsing
```

Supported prefixes:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `hotfix/` | Urgent production fixes |
| `refactor/` | Code restructuring |
| `test/` | Adding or updating tests |
| `docs/` | Documentation changes |
| `chore/` | Dependencies, tooling, CI |

Rules:
- Use lowercase letters, numbers, and hyphens only
- Keep descriptions concise (2--4 words)
- No consecutive hyphens or trailing hyphens

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat: add server resource monitoring
fix: correct player position parsing for negative coordinates
refactor: extract broadcast helper from ipc-handlers
test: add coverage for mod-manager edge cases
docs: update IPC development guide with new channel
```

## Code Standards

### TypeScript

All code is written in TypeScript with strict mode enabled. Every file must pass the type checker:

```bash
npm run typecheck
```

### Formatting and Linting

**Prettier** handles formatting and **ESLint** handles linting. Both run automatically on staged files during pre-commit. You can also run them manually:

```bash
# Format all source files
cd app && npx prettier --write "src/**/*.{ts,tsx}"

# Lint all source files
cd app && npx eslint "src/**/*.{ts,tsx}" --fix
```

### Pre-commit Hooks

Husky runs three checks on every commit:

1. `npx lint-staged` -- formats and lints only staged `.ts`/`.tsx` files
2. `npm run typecheck` -- type-checks both tsconfig files
3. `npm test` -- runs all test suites

If any step fails, the commit is blocked. Do not bypass these hooks with `--no-verify`.

## Testing Requirements

The project maintains 17 test suites with 240+ tests. All suites must pass before committing.

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run a specific test file
cd app && npx jest src/__tests__/main/server-process.test.ts
```

### Writing Tests

- Tests live in `app/src/__tests__/` and mirror the `src/` directory structure.
- Use **Jest 29** with **ts-jest** for TypeScript support.
- New features should include tests covering the expected behavior and relevant edge cases.
- Test fixtures belong in `app/src/__tests__/fixtures/`.

## Key Rules

### The User's Server Directory is READ-ONLY

The `Server/` directory is **not part of this repository**. It refers to the user's own Hytale dedicated server installation, which they select via the app's first-run setup screen. Application code must treat it as strictly read-only -- reading data, but never writing to it. The only writable locations are `disabled-mods/` (adjacent to the server directory) and the system's user data directory.

### Process Boundaries

The Electron app has strict process isolation:

- `app/src/main/` runs in Node.js (main process)
- `app/src/renderer/` runs in Chromium (renderer process)
- **Never import between these two directories.** All communication goes through IPC.
- Only `app/src/shared/` is imported by both processes.

### IPC Changes Require Three-File Updates

Adding or modifying an IPC channel requires changes in three files:

1. `app/src/shared/constants.ts` -- channel name constant
2. `app/src/preload/index.ts` -- whitelist entry
3. `app/src/main/ipc-handlers.ts` (for handlers) or `app/src/renderer/services/ipc-client.ts` (for client wrappers)

Missing any one of these causes silent failures. See the [IPC Development Guide](docs/guides/ipc-development.md) for details.

### Renderer IPC Access

Components and stores must use the typed wrappers in `app/src/renderer/services/ipc-client.ts`. Never call `window.electronAPI` directly.

## Project Structure

```
app/src/
├── main/          # Node.js main process
├── preload/       # Context bridge (security boundary)
├── renderer/      # React 19 frontend
├── shared/        # IPC constants (imported by both processes)
└── __tests__/     # Jest test suites
```

For a full breakdown, see the [Getting Started Guide](docs/guides/getting-started.md#project-structure).

## Questions

If you are unsure about an approach or have questions about the architecture, open an issue for discussion before starting implementation.
