import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';

let win: BrowserWindow | null = null;

function send(channel: string, ...args: unknown[]) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

function extractReleaseNotes(
  notes: string | { version: string; note: string }[] | null | undefined
): string | undefined {
  if (!notes) return undefined;
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) {
    return notes.map((n) => `${n.version}: ${n.note}`).join('\n');
  }
  return undefined;
}

export function initialize(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) return;

  win = mainWindow;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    send(IPC.UPDATER_CHECKING);
  });

  autoUpdater.on('update-available', (info) => {
    send(IPC.UPDATER_AVAILABLE, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: extractReleaseNotes(info.releaseNotes as string | { version: string; note: string }[] | null),
    });
  });

  autoUpdater.on('update-not-available', () => {
    send(IPC.UPDATER_NOT_AVAILABLE);
  });

  autoUpdater.on('download-progress', (progress) => {
    send(IPC.UPDATER_PROGRESS, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    send(IPC.UPDATER_DOWNLOADED, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: extractReleaseNotes(info.releaseNotes as string | { version: string; note: string }[] | null),
    });
  });

  autoUpdater.on('error', (err) => {
    send(IPC.UPDATER_ERROR, { message: err.message });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Updater] Initial check failed:', err);
    });
  }, 5000);
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[Updater] Check failed:', err);
  });
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[Updater] Download failed:', err);
  });
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true);
}

export function getVersion(): string {
  return app.getVersion();
}
