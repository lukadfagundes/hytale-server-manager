// Mock Electron APIs before any imports
const mockIpcRendererInvoke = jest.fn();
const mockIpcRendererOn = jest.fn();
const mockIpcRendererRemoveListener = jest.fn();
const mockExposeInMainWorld = jest.fn();

jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (...args: unknown[]) => mockExposeInMainWorld(...args),
  },
  ipcRenderer: {
    invoke: (...args: unknown[]) => mockIpcRendererInvoke(...args),
    on: (...args: unknown[]) => mockIpcRendererOn(...args),
    removeListener: (...args: unknown[]) => mockIpcRendererRemoveListener(...args),
  },
}));

describe('preload/index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  type InvokeFn = (channel: string, ...args: unknown[]) => Promise<unknown>;
  type OnFn = (channel: string, callback: (...args: unknown[]) => void) => () => void;

  function loadPreload(): { invoke: InvokeFn; on: OnFn } {
    let electronAPI: { invoke: InvokeFn; on: OnFn } | null = null;

    mockExposeInMainWorld.mockImplementation((key: string, api: unknown) => {
      if (key === 'electronAPI') {
        electronAPI = api as { invoke: InvokeFn; on: OnFn };
      }
    });

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../preload/index');
    });

    return electronAPI!;
  }

  describe('contextBridge.exposeInMainWorld', () => {
    it('should expose electronAPI to main world', () => {
      loadPreload();

      expect(mockExposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    });

    it('should expose invoke and on functions', () => {
      const api = loadPreload();

      expect(typeof api.invoke).toBe('function');
      expect(typeof api.on).toBe('function');
    });
  });

  describe('invoke - allowed channels', () => {
    const ALLOWED_INVOKE_CHANNELS = [
      'server:start',
      'server:stop',
      'data:players',
      'data:warps',
      'data:world-map',
      'data:server-config',
      'mods:list',
      'mods:toggle',
      'config:get-server-path',
      'config:set-server-path',
      'config:select-server-dir',
      'assets:extract',
      'assets:status',
      'updater:check',
      'updater:download',
      'updater:install',
      'updater:get-version',
    ];

    it.each(ALLOWED_INVOKE_CHANNELS)('should allow invoke for channel: %s', async (channel) => {
      const api = loadPreload();
      mockIpcRendererInvoke.mockResolvedValue('success');

      await api.invoke(channel);

      expect(mockIpcRendererInvoke).toHaveBeenCalledWith(channel);
    });

    it('should pass arguments to ipcRenderer.invoke', async () => {
      const api = loadPreload();
      mockIpcRendererInvoke.mockResolvedValue('result');

      await api.invoke('mods:toggle', { modName: 'TestMod', enabled: true });

      expect(mockIpcRendererInvoke).toHaveBeenCalledWith('mods:toggle', {
        modName: 'TestMod',
        enabled: true,
      });
    });

    it('should return the result from ipcRenderer.invoke', async () => {
      const api = loadPreload();
      mockIpcRendererInvoke.mockResolvedValue({ data: 'test', errors: [] });

      const result = await api.invoke('data:players');

      expect(result).toEqual({ data: 'test', errors: [] });
    });
  });

  describe('invoke - disallowed channels', () => {
    const DISALLOWED_INVOKE_CHANNELS = [
      'shell:exec',
      'fs:read',
      'fs:write',
      'evil:channel',
      'arbitrary:ipc',
      'system:shutdown',
      'process:kill',
      '',
      'SERVER:START', // case sensitive
      'server:Start',
    ];

    it.each(DISALLOWED_INVOKE_CHANNELS)(
      'should throw for disallowed invoke channel: %s',
      (channel) => {
        const api = loadPreload();

        expect(() => api.invoke(channel)).toThrow(`IPC channel not allowed: ${channel}`);
        expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
      }
    );
  });

  describe('on - allowed channels', () => {
    const ALLOWED_ON_CHANNELS = [
      'server:status-changed',
      'server:log',
      'data:refresh',
      'config:server-path-changed',
      'assets:extracting',
      'assets:ready',
      'assets:error',
      'updater:checking',
      'updater:available',
      'updater:not-available',
      'updater:progress',
      'updater:downloaded',
      'updater:error',
    ];

    it.each(ALLOWED_ON_CHANNELS)('should allow on subscription for channel: %s', (channel) => {
      const api = loadPreload();
      const callback = jest.fn();

      api.on(channel, callback);

      expect(mockIpcRendererOn).toHaveBeenCalledWith(channel, expect.any(Function));
    });

    it('should invoke callback when event is received', () => {
      const api = loadPreload();
      const callback = jest.fn();

      // Capture the listener that gets registered
      let registeredListener: (event: unknown, ...args: unknown[]) => void;
      mockIpcRendererOn.mockImplementation(
        (_channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
          registeredListener = listener;
        }
      );

      api.on('server:status-changed', callback);

      // Simulate event being received
      registeredListener!({}, 'running');

      expect(callback).toHaveBeenCalledWith('running');
    });

    it('should pass multiple arguments to callback', () => {
      const api = loadPreload();
      const callback = jest.fn();

      let registeredListener: (event: unknown, ...args: unknown[]) => void;
      mockIpcRendererOn.mockImplementation(
        (_channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
          registeredListener = listener;
        }
      );

      api.on('server:log', callback);

      registeredListener!({}, { line: 'test', stream: 'stdout', timestamp: 123 });

      expect(callback).toHaveBeenCalledWith({ line: 'test', stream: 'stdout', timestamp: 123 });
    });

    it('should return an unsubscribe function', () => {
      const api = loadPreload();
      const callback = jest.fn();

      const unsubscribe = api.on('server:status-changed', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call ipcRenderer.removeListener when unsubscribe is called', () => {
      const api = loadPreload();
      const callback = jest.fn();

      let registeredListener: (event: unknown, ...args: unknown[]) => void;
      mockIpcRendererOn.mockImplementation(
        (_channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
          registeredListener = listener;
        }
      );

      const unsubscribe = api.on('server:status-changed', callback);
      unsubscribe();

      expect(mockIpcRendererRemoveListener).toHaveBeenCalledWith(
        'server:status-changed',
        registeredListener!
      );
    });
  });

  describe('on - disallowed channels', () => {
    const DISALLOWED_ON_CHANNELS = [
      'shell:exec',
      'fs:read',
      'arbitrary:event',
      'evil:channel',
      '',
      'server:STATUS-CHANGED', // case sensitive
      'SERVER:status-changed',
    ];

    it.each(DISALLOWED_ON_CHANNELS)('should throw for disallowed on channel: %s', (channel) => {
      const api = loadPreload();
      const callback = jest.fn();

      expect(() => api.on(channel, callback)).toThrow(`IPC channel not allowed: ${channel}`);
      expect(mockIpcRendererOn).not.toHaveBeenCalled();
    });
  });

  describe('security boundary verification', () => {
    it('should have exactly 17 allowed invoke channels', () => {
      const api = loadPreload();
      const allowedChannels = [
        'server:start',
        'server:stop',
        'data:players',
        'data:warps',
        'data:world-map',
        'data:server-config',
        'mods:list',
        'mods:toggle',
        'config:get-server-path',
        'config:set-server-path',
        'config:select-server-dir',
        'assets:extract',
        'assets:status',
        'updater:check',
        'updater:download',
        'updater:install',
        'updater:get-version',
      ];

      let successCount = 0;
      for (const channel of allowedChannels) {
        mockIpcRendererInvoke.mockResolvedValue('ok');
        try {
          api.invoke(channel);
          successCount++;
        } catch {
          // Channel not allowed
        }
      }

      expect(successCount).toBe(17);
    });

    it('should have exactly 13 allowed on channels', () => {
      const api = loadPreload();
      const allowedChannels = [
        'server:status-changed',
        'server:log',
        'data:refresh',
        'config:server-path-changed',
        'assets:extracting',
        'assets:ready',
        'assets:error',
        'updater:checking',
        'updater:available',
        'updater:not-available',
        'updater:progress',
        'updater:downloaded',
        'updater:error',
      ];

      let successCount = 0;
      for (const channel of allowedChannels) {
        try {
          api.on(channel, jest.fn());
          successCount++;
        } catch {
          // Channel not allowed
        }
      }

      expect(successCount).toBe(13);
    });
  });
});
