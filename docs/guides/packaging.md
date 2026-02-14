# Packaging and Distribution

This guide covers building the Hytale Server Manager into distributable installers, the auto-update system, and the release workflow.

## Build Process

The application build has two stages that compile different parts of the codebase.

### Compilation Only

```bash
npm run build
```

This runs two steps in sequence:

1. **Main process + preload**: `tsc -p tsconfig.node.json` compiles TypeScript from `app/src/main/` and `app/src/preload/` into CommonJS JavaScript in `app/dist/main/` and `app/dist/preload/`.
2. **Renderer**: `vite build` bundles the React application from `app/src/renderer/` into optimized static assets in `app/dist/renderer/`.

The `app/src/shared/` module is compiled by both steps since both processes import it.

### Build + Package

```bash
npm run package
```

This runs `npm run build` followed by `electron-builder`, which reads `app/electron-builder.yml` and produces platform-specific installers in `app/out/`.

## electron-builder Configuration

The packaging configuration lives in `app/electron-builder.yml`:

```yaml
appId: com.hytale-server.manager
productName: Hytale Server Manager
directories:
  buildResources: build
  output: out
files:
  - dist/**/*
  - disabled-mods/**/*
  - app-config.json
  - package.json
extraFiles:
  - from: disabled-mods
    to: disabled-mods
publish:
  provider: github
  owner: lukadfagundes
  repo: hytale-server
nsis:
  oneClick: false
  perMachine: false
  createDesktopShortcut: true
win:
  target:
    - nsis
    - portable
linux:
  target:
    - AppImage
    - deb
```

### Key Settings

**App ID**: `com.hytale-server.manager` -- used by the OS for protocol registration, auto-update identity, and install/uninstall tracking.

**Bundled files**: The `files` array defines what gets included inside the packaged app:
- `dist/**/*` -- compiled main, preload, and renderer output
- `disabled-mods/**/*` -- the disabled mods staging directory
- `app-config.json` -- default configuration file
- `package.json` -- required by Electron to locate the main entry point

**Extra files**: The `extraFiles` entry copies the `disabled-mods/` directory alongside the app binary (not inside the asar archive), so the main process can move mod directories in and out of it at runtime.

### Platform Targets

**Windows**:
- **NSIS installer** -- standard Windows installer with customizable options (not one-click, per-user install, creates desktop shortcut)
- **Portable** -- standalone executable, no installation required

**Linux**:
- **AppImage** -- self-contained executable, works on most distributions
- **deb** -- Debian/Ubuntu package

## Auto-Update System

The application uses `electron-updater` to check for and install updates from GitHub Releases.

### How It Works

1. Auto-update is **only active in production** (`app.isPackaged === true`). In development it is a no-op.
2. Five seconds after launch, the updater automatically checks GitHub Releases for a newer version.
3. Updates are **not auto-downloaded** (`autoDownload: false`). The user must confirm the download.
4. Once downloaded, the update installs automatically when the app quits (`autoInstallOnAppQuit: true`), or the user can trigger an immediate install.

### Update Lifecycle Events

The main process broadcasts these events to the renderer, which displays them in an update notification UI:

```
updater:checking        →  Checking GitHub Releases...
updater:available       →  Update found (version, release date, notes)
updater:not-available   →  Already on latest version
updater:progress        →  Downloading... (percent, speed, bytes transferred)
updater:downloaded      →  Ready to install
updater:error           →  Something went wrong
```

### Renderer Integration

The `updater-store` subscribes to these events and surfaces them through the `UpdateNotification` component:

```typescript
// Store subscribes to lifecycle events in init()
const cleanupUpdater = useUpdaterStore.getState().init();

// Component reads state reactively
const { status, updateInfo, progress } = useUpdaterStore();
// status is typed as UpdateStatus:
//   'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

// User actions trigger invoke channels
await downloadUpdate();  // updater:download
await installUpdate();   // updater:install
```

### User-Facing Update UX

The `UpdateNotification` component presents a modal dialog with context-sensitive actions depending on the current update status:

- **"Download & Install"** -- Shown when an update is available. Starts the download immediately.
- **"Skip This Version"** -- Persists the skipped version string to localStorage under the key `hytale-server:skipped-update-version`. On subsequent update checks, if the available version matches the skipped version, the notification is suppressed (the store sets status to `not-available` without showing the modal).
- **"Remind Me Later"** -- Dismisses the modal without skipping the version. The notification will reappear on the next update check (e.g., next app launch).
- **"Retry"** (error state) -- Resets the updater store state to `idle`, clears the error, and re-runs the update check. This allows users to recover from transient network failures.
- **"Restart & Install"** (downloaded state) -- Triggers an immediate quit-and-install via `electron-updater`.
- **"Install Later"** (downloaded state) -- Dismisses the modal. The update installs automatically on next app quit (`autoInstallOnAppQuit: true`).

The modal can also be dismissed by pressing Escape or clicking outside it, both of which behave like "Remind Me Later."

### Publish Configuration

The updater checks the GitHub repository defined in `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: lukadfagundes
  repo: hytale-server
```

For auto-update to work, releases must include the platform-specific installer files and the `latest.yml` (Windows) or `latest-linux.yml` (Linux) metadata files that `electron-builder` generates alongside the installers.

## Release Workflow

### 1. Verify Quality

Before building a release, ensure all checks pass:

```bash
npm run typecheck     # Type-check both tsconfig files
npm test              # Run all 17 test suites
npm run build         # Verify the build compiles cleanly
```

### 2. Build Installers

```bash
npm run package
```

Output appears in `app/out/`:

```
app/out/
├── Hytale Server Manager Setup 0.0.1.exe     # NSIS installer (Windows)
├── Hytale Server Manager 0.0.1.exe            # Portable (Windows)
├── Hytale Server Manager-0.0.1.AppImage       # AppImage (Linux)
├── hytale-server-manager_0.0.1_amd64.deb      # Debian package (Linux)
├── latest.yml                                  # Auto-update metadata (Windows)
└── latest-linux.yml                            # Auto-update metadata (Linux)
```

### 3. Create a GitHub Release

1. Tag the commit with a version: `git tag v0.0.2`
2. Push the tag: `git push origin v0.0.2`
3. Create a release on GitHub attached to the tag
4. Upload all files from `app/out/`, including the `.yml` metadata files

The `.yml` files are required for the auto-updater to detect and download new versions.

### 4. Version Bumps

The version is defined in `app/package.json`:

```json
{
  "version": "0.0.1"
}
```

Update this version before building a release. The value is used by `electron-builder` for installer filenames and by `electron-updater` to compare against the latest GitHub Release.

**Important:** Always bump the version in `app/package.json` _before_ creating the git tag. `electron-builder` reads the version from `package.json` at build time to generate installer filenames and the `.yml` metadata files. If the tag version and `package.json` version do not match, the auto-updater will not detect the release correctly.

## Troubleshooting

### Build Fails with TypeScript Errors

Run `npm run typecheck` first to see the exact errors. The build step (`tsc -p tsconfig.node.json`) will fail on type errors. Fix them before packaging.

### Installer is Missing Files

Check the `files` array in `electron-builder.yml`. Only files matching the listed patterns are included in the packaged app. If you add new runtime directories (like `disabled-mods/`), they must be added to this array.

### Auto-Update Not Working in Development

This is expected. The updater initializes only when `app.isPackaged` is `true`. To test auto-update behavior, build and install a packaged version of the app.

### Portable Build Cannot Write Config

The portable Windows build writes `app-config.json` to the user's application data directory (`%APPDATA%/hytale-server-manager/`), not to the directory containing the executable. This is consistent with the installed version.

### Linux AppImage Fails to Launch

Ensure the AppImage has execute permissions:

```bash
chmod +x "Hytale Server Manager-0.0.1.AppImage"
./Hytale\ Server\ Manager-0.0.1.AppImage
```

On some distributions you may also need to install FUSE:

```bash
sudo apt install libfuse2
```
