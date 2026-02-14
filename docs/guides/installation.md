# Installation

This guide covers downloading, installing, and running the Hytale Server Manager desktop application as an end user. No development tools are required.

## Requirements

| Requirement | Details |
|-------------|---------|
| Operating System | Windows 10+ or Linux (Ubuntu 20.04+, Debian 11+, or equivalent) |
| Disk Space | ~200 MB for the installed application |
| Hytale Server | A local Hytale dedicated server installation containing `HytaleServer.jar` |

> **Don't have a Hytale server yet?** Follow the [Server Hosting](./server-hosting.md) guide to set one up before installing the manager.

## Downloading

Download the latest release from the [GitHub Releases](https://github.com/lukadfagundes/hytale-server-manager/releases) page. Choose the installer that matches your operating system:

### Windows

| File | Description |
|------|-------------|
| `Hytale Server Manager Setup X.X.X.exe` | Standard installer -- installs to Program Files, creates a Start Menu entry and desktop shortcut |
| `Hytale Server Manager X.X.X.exe` | Portable -- single executable, no installation needed |

### Linux

| File | Description |
|------|-------------|
| `Hytale Server Manager-X.X.X.AppImage` | Self-contained executable -- works on most distributions without installation |
| `hytale-server-manager_X.X.X_amd64.deb` | Debian/Ubuntu package -- installs via your system package manager |

## Installing

### Windows (NSIS Installer)

1. Run `Hytale Server Manager Setup X.X.X.exe`.
2. Choose whether to install for all users or the current user only.
3. Select an installation directory (the default is fine for most users).
4. Click **Install** and wait for the process to complete.
5. Launch the app from the desktop shortcut or Start Menu.

### Windows (Portable)

1. Move `Hytale Server Manager X.X.X.exe` to a folder of your choice.
2. Double-click the executable to launch -- no installation required.

### Linux (AppImage)

1. Make the file executable:

   ```bash
   chmod +x "Hytale Server Manager-X.X.X.AppImage"
   ```

2. Run it:

   ```bash
   ./Hytale\ Server\ Manager-X.X.X.AppImage
   ```

> **FUSE required.** Some distributions need `libfuse2` for AppImage support. Install it with `sudo apt install libfuse2` if the app fails to launch.

### Linux (deb)

```bash
sudo dpkg -i hytale-server-manager_X.X.X_amd64.deb
```

After installation, launch from your application menu or run `hytale-server-manager` from a terminal.

## First-Run Setup

On first launch, the app displays a **Server Setup** screen:

1. Click **Select Server Directory**.
2. Navigate to the folder containing your Hytale server files and select the `Server/` directory (the one with `HytaleServer.jar` inside it).
3. The app validates the selected path by checking for `HytaleServer.jar`.
4. Once validated, the full interface loads automatically.

The selected path is saved to a configuration file and remembered across sessions. You only need to do this once.

## What to Expect

After setup, the app provides four main views:

- **Dashboard** -- start and stop the server with a toggle switch. A live log panel streams server output with color-coded messages.
- **Players** -- browse connected players with expandable cards showing inventory, equipped gear, and stat bars.
- **Warps** -- view server warp points sorted by name or date with coordinates.
- **Mods** -- enable or disable server mods with toggle switches. Mod changes are blocked while the server is running to prevent corruption.

Game icons and NPC portraits are extracted automatically from `Assets.zip` on first launch and cached locally. A brief extraction step runs the first time -- subsequent launches are instant.

## Auto-Updates

The app checks for updates automatically on each launch. When a new version is available:

1. A notification appears with the new version number and release notes.
2. Click **Download & Install** to begin the update.
3. Once downloaded, choose **Restart & Install** to apply immediately, or **Install Later** to apply when you close the app.

You can also skip a specific version by clicking **Skip This Version** -- the notification will not appear again until a newer version is released.

## Uninstalling

### Windows (Installed)

Open **Settings > Apps** (or **Add or Remove Programs**) and uninstall **Hytale Server Manager** from the list.

### Windows (Portable)

Delete the executable file. Application data is stored in `%APPDATA%/hytale-server-manager/` -- delete that folder to remove all saved settings and cached assets.

### Linux (deb)

```bash
sudo apt remove hytale-server-manager
```

### Linux (AppImage)

Delete the AppImage file. Application data is stored in `~/.config/hytale-server-manager/` -- delete that directory to remove settings and cached assets.

## Troubleshooting

### The app shows "Select Server Directory" every time

The configuration file may have been deleted or corrupted. Select your server directory again -- the app will recreate the configuration automatically.

### Game icons show text instead of images

Asset extraction may have failed or is still in progress. Restart the app to trigger a fresh extraction. If the problem persists, verify that `Assets.zip` exists as a sibling of your `Server/` directory.

### The server won't start from the app

Make sure **Java 25** is installed and available in your system PATH. The app launches the server with `java -jar HytaleServer.jar`, which requires Java to be accessible. See the [Server Hosting](./server-hosting.md#installing-java-25) guide for installation instructions.

### Linux: "FUSE not found" or AppImage won't run

Install FUSE support:

```bash
sudo apt install libfuse2
```

## Next Steps

- [Server Hosting](./server-hosting.md) -- set up and configure a Hytale dedicated server
