import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { registerIpcHandlers } from './ipc-handlers';
import { startWatcher, stopWatcher } from './file-watcher';
import { initialize as initUpdater } from './updater-service';
import { initServerPath, isServerDirValid } from './server-path';
import { getAssetCacheDir, extractAssets } from './asset-extractor';
import { IPC } from '../shared/constants';

// Register custom protocol scheme BEFORE app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let mainWindow: BrowserWindow | null = null;

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
  // Register asset:// protocol handler — serves files from the asset cache directory
  protocol.handle('asset', async (request) => {
    // Strip scheme + trailing slashes — standard URL parsing may treat path segments as hostname
    // e.g. asset:///items/foo.png may arrive as asset://items/foo.png
    const relativePath = decodeURIComponent(
      request.url.replace(/^asset:\/\/\/?/, '').replace(/\/+$/, '')
    );
    const filePath = path.join(getAssetCacheDir(), relativePath);
    try {
      return await net.fetch(pathToFileURL(filePath).href);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerIpcHandlers();
  createWindow();

  // Initialize auto-updater (no-op in development, checks after 5s in production)
  if (mainWindow) {
    initUpdater(mainWindow);
  }

  // Initialize server path from config and start file watcher if valid
  const serverDir = initServerPath();
  if (isServerDirValid(serverDir)) {
    try {
      await startWatcher(serverDir);
    } catch (err) {
      console.error('[App] Failed to start file watcher:', err);
    }

    // Trigger asset extraction and broadcast result to renderer
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.ASSETS_EXTRACTING);
    }
    extractAssets(serverDir)
      .then((result) => {
        for (const win of BrowserWindow.getAllWindows()) {
          if (result.success) {
            win.webContents.send(IPC.ASSETS_READY);
          } else {
            win.webContents.send(IPC.ASSETS_ERROR, { message: result.error });
          }
        }
      })
      .catch((err) => {
        console.error('[App] Failed to extract assets:', err);
      });
  }
  // No dialog warning — the renderer will show the setup screen when path is invalid

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
