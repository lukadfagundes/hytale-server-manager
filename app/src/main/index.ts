import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';
import { startWatcher, stopWatcher } from './file-watcher';

let mainWindow: BrowserWindow | null = null;

function getAppConfigPath(): string {
  return path.resolve(__dirname, '..', '..', 'app-config.json');
}

function loadServerDir(): string {
  const configPath = getAppConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    if (config.serverPath) {
      const resolved = path.resolve(path.dirname(configPath), config.serverPath);
      if (fs.existsSync(resolved)) return resolved;
    }
  } catch {
    // Config missing or malformed — fall back to default
  }
  // Default: ../Server relative to app/
  return path.resolve(__dirname, '..', '..', '..', 'Server');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Hytale Server Manager',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  createWindow();

  // Validate server path and start file watcher
  const serverDir = loadServerDir();
  if (fs.existsSync(serverDir)) {
    try {
      await startWatcher(serverDir);
    } catch (err) {
      console.error('[App] Failed to start file watcher:', err);
    }
  } else {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Server Directory Not Found',
      message: `Could not find Server directory at:\n${serverDir}\n\nData reading features will not work until the Server directory is available.`,
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  await stopWatcher();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
