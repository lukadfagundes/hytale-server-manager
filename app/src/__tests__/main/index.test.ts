// Mock Electron APIs before any imports
const mockProtocolHandle = jest.fn();
const mockProtocolRegisterSchemesAsPrivileged = jest.fn();
const mockLoadURL = jest.fn();
const mockLoadFile = jest.fn();
const mockOpenDevTools = jest.fn();
const mockOn = jest.fn();
const mockNetFetch = jest.fn();
const mockWebContentsSend = jest.fn();

let whenReadyCallback: (() => Promise<void>) | null = null;
const mockWindowInstances: any[] = [];

const MockBrowserWindow = jest.fn().mockImplementation(() => {
  const win = {
    loadURL: mockLoadURL,
    loadFile: mockLoadFile,
    webContents: { openDevTools: mockOpenDevTools, send: mockWebContentsSend },
    on: mockOn,
  };
  mockWindowInstances.push(win);
  return win;
});
(MockBrowserWindow as any).getAllWindows = () => mockWindowInstances;
(MockBrowserWindow as any).getFocusedWindow = jest.fn();

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn().mockReturnValue({
      then: (cb: () => Promise<void>) => {
        whenReadyCallback = cb;
        return { catch: jest.fn() };
      },
    }),
    on: jest.fn(),
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
  BrowserWindow: MockBrowserWindow,
  protocol: {
    registerSchemesAsPrivileged: mockProtocolRegisterSchemesAsPrivileged,
    handle: mockProtocolHandle,
  },
  net: {
    fetch: mockNetFetch,
  },
}));

jest.mock('../../main/ipc-handlers');
jest.mock('../../main/file-watcher');
jest.mock('../../main/updater-service');
jest.mock('../../main/server-path');
jest.mock('../../main/asset-extractor');

import fs from 'fs';
import path from 'path';
import { initServerPath, isServerDirValid } from '../../main/server-path';
import { startWatcher } from '../../main/file-watcher';
import { extractAssets, getAssetCacheDir } from '../../main/asset-extractor';
import { registerIpcHandlers } from '../../main/ipc-handlers';
import { IPC } from '../../shared/constants';

const mockInitServerPath = jest.mocked(initServerPath);
const mockIsServerDirValid = jest.mocked(isServerDirValid);
const mockStartWatcher = jest.mocked(startWatcher);
const mockExtractAssets = jest.mocked(extractAssets);
const mockGetAssetCacheDir = jest.mocked(getAssetCacheDir);

describe('main/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    whenReadyCallback = null;
    mockWindowInstances.length = 0;
    mockInitServerPath.mockReturnValue('/mock/Server');
    mockIsServerDirValid.mockReturnValue(true);
    mockStartWatcher.mockResolvedValue(undefined);
    mockExtractAssets.mockResolvedValue({ success: true, totalFiles: 10 });
    mockGetAssetCacheDir.mockReturnValue('/mock/userData/asset-cache');
  });

  function loadModule() {
    // Use isolateModules so the module top-level code re-runs each time
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../main/index');
    });
  }

  describe('protocol registration (module top-level)', () => {
    it('should register asset:// scheme as privileged before app.whenReady()', () => {
      loadModule();

      expect(mockProtocolRegisterSchemesAsPrivileged).toHaveBeenCalledWith([
        {
          scheme: 'asset',
          privileges: { standard: true, secure: true, supportFetchAPI: true },
        },
      ]);
    });

    it('should register asset scheme before whenReady callback fires', () => {
      loadModule();

      // registerSchemesAsPrivileged was called, but whenReady callback hasn't run yet
      expect(mockProtocolRegisterSchemesAsPrivileged).toHaveBeenCalledTimes(1);
      expect(mockProtocolHandle).not.toHaveBeenCalled(); // only called inside whenReady
    });
  });

  describe('app.whenReady() callback', () => {
    it('should register asset:// protocol handler', async () => {
      loadModule();
      await whenReadyCallback!();

      expect(mockProtocolHandle).toHaveBeenCalledWith('asset', expect.any(Function));
    });

    it('should register IPC handlers', async () => {
      loadModule();
      await whenReadyCallback!();

      expect(registerIpcHandlers).toHaveBeenCalled();
    });

    it('should trigger asset extraction when server dir is valid', async () => {
      mockIsServerDirValid.mockReturnValue(true);

      loadModule();
      await whenReadyCallback!();

      expect(mockExtractAssets).toHaveBeenCalledWith('/mock/Server');
    });

    it('should not trigger asset extraction when server dir is invalid', async () => {
      mockIsServerDirValid.mockReturnValue(false);

      loadModule();
      await whenReadyCallback!();

      expect(mockExtractAssets).not.toHaveBeenCalled();
    });

    it('should broadcast ASSETS_READY after successful extraction', async () => {
      mockIsServerDirValid.mockReturnValue(true);
      mockExtractAssets.mockResolvedValue({ success: true, totalFiles: 10 });

      loadModule();
      await whenReadyCallback!();

      // Wait for extraction promise to settle
      await new Promise((r) => setTimeout(r, 0));

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.ASSETS_EXTRACTING);
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.ASSETS_READY);
    });

    it('should broadcast ASSETS_ERROR after failed extraction', async () => {
      mockIsServerDirValid.mockReturnValue(true);
      mockExtractAssets.mockResolvedValue({ success: false, error: 'Assets.zip not found' });

      loadModule();
      await whenReadyCallback!();

      // Wait for extraction promise to settle
      await new Promise((r) => setTimeout(r, 0));

      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.ASSETS_EXTRACTING);
      expect(mockWebContentsSend).toHaveBeenCalledWith(IPC.ASSETS_ERROR, {
        message: 'Assets.zip not found',
      });
    });
  });

  describe('asset:// protocol handler', () => {
    it('should resolve asset URLs preserving subdirectory path', async () => {
      mockGetAssetCacheDir.mockReturnValue('/mock/userData/asset-cache');
      mockNetFetch.mockResolvedValue(new Response('png data'));

      loadModule();
      await whenReadyCallback!();

      const handlerFn = mockProtocolHandle.mock.calls.find(
        (call: any[]) => call[0] === 'asset'
      )![1];

      // asset:///items/Iron_Sword.png should resolve to asset-cache/items/Iron_Sword.png
      const mockRequest = { url: 'asset:///items/Iron_Sword.png' };
      await handlerFn(mockRequest);

      const fetchedUrl = mockNetFetch.mock.calls[0][0] as string;
      expect(fetchedUrl).toContain('asset-cache');
      expect(fetchedUrl).toMatch(/items[/\\]Iron_Sword\.png/);
    });

    it('should decode percent-encoded URL paths and produce valid file URL', async () => {
      mockGetAssetCacheDir.mockReturnValue('/mock/userData/asset-cache');
      mockNetFetch.mockResolvedValue(new Response('data'));

      loadModule();
      await whenReadyCallback!();

      const handlerFn = mockProtocolHandle.mock.calls.find(
        (call: any[]) => call[0] === 'asset'
      )![1];

      const mockRequest = { url: 'asset:///items/Some%20Item.png' };
      await handlerFn(mockRequest);

      // pathToFileURL re-encodes the space, so the file URL contains %20
      const fetchedUrl = mockNetFetch.mock.calls[0][0] as string;
      expect(fetchedUrl).toMatch(/^file:\/\/\//);
      expect(fetchedUrl).toContain('Some%20Item.png');
    });

    it('should handle URLs with trailing slash (browser normalization)', async () => {
      mockGetAssetCacheDir.mockReturnValue('/mock/userData/asset-cache');
      mockNetFetch.mockResolvedValue(new Response('json data'));

      loadModule();
      await whenReadyCallback!();

      const handlerFn = mockProtocolHandle.mock.calls.find(
        (call: any[]) => call[0] === 'asset'
      )![1];

      // Browser may normalize asset:///item-icon-map.json to asset://item-icon-map.json/
      const mockRequest = { url: 'asset://item-icon-map.json/' };
      await handlerFn(mockRequest);

      const fetchedUrl = mockNetFetch.mock.calls[0][0] as string;
      expect(fetchedUrl).toContain('item-icon-map.json');
      expect(fetchedUrl).not.toMatch(/item-icon-map\.json[/\\]+/);
    });

    it('should return 404 when file does not exist', async () => {
      mockGetAssetCacheDir.mockReturnValue('/mock/userData/asset-cache');
      mockNetFetch.mockRejectedValue(new Error('net::ERR_FILE_NOT_FOUND'));

      loadModule();
      await whenReadyCallback!();

      const handlerFn = mockProtocolHandle.mock.calls.find(
        (call: any[]) => call[0] === 'asset'
      )![1];

      const mockRequest = { url: 'asset:///items/Missing.png' };
      const response = await handlerFn(mockRequest);

      expect(response.status).toBe(404);
    });
  });
});

// CSP meta tag in index.html — verifies the actual HTML that Electron loads
// includes asset: in the policy (the real CSP enforcement point)
describe('index.html CSP meta tag', () => {
  const htmlPath = path.resolve(__dirname, '../../renderer/index.html');
  let csp: string;

  beforeAll(() => {
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    // Match the content attribute specifically on the CSP meta tag
    const match = htmlContent.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
    if (!match) throw new Error('CSP meta tag not found in index.html');
    csp = match[1];
  });

  it('should contain a Content-Security-Policy meta tag', () => {
    expect(csp).toBeDefined();
  });

  it('should allow asset: in default-src', () => {
    expect(csp).toMatch(/default-src[^;]*asset:/);
  });

  it('should allow asset: in img-src for icon/portrait images', () => {
    expect(csp).toMatch(/img-src[^;]*asset:/);
  });

  it('should allow asset: in connect-src for fetch (icon map loading)', () => {
    expect(csp).toMatch(/connect-src[^;]*asset:/);
  });

  it('should allow ws: in connect-src for Vite HMR in dev mode', () => {
    expect(csp).toMatch(/connect-src[^;]*ws:/);
  });

  it('should allow unsafe-inline in script-src for Vite dev injection', () => {
    expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
