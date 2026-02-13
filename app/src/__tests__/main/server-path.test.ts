jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
}));

jest.mock('fs');

import fs from 'fs';
import path from 'path';

const mockFs = jest.mocked(fs);

// Use isolateModules to reset module-level `serverDir` cache between tests
function getModule(isPackaged = false) {
  let mod: typeof import('../../main/server-path');
  jest.isolateModules(() => {
    jest.doMock('electron', () => ({
      app: {
        isPackaged,
        getPath: jest.fn().mockReturnValue('/mock/userData'),
      },
    }));
    mod = require('../../main/server-path');
  });
  return mod!;
}

describe('server-path', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getAppConfigPath', () => {
    it('should return path relative to __dirname when not packaged', () => {
      const mod = getModule(false);
      const result = mod.getAppConfigPath();
      expect(result).toContain('app-config.json');
      expect(result).not.toContain('userData');
    });

    it('should return userData path when packaged', () => {
      const mod = getModule(true);
      const result = mod.getAppConfigPath();
      expect(result).toContain('userData');
      expect(result).toContain('app-config.json');
    });
  });

  describe('isServerDirValid', () => {
    it('should return true when directory contains HytaleServer.jar', () => {
      const mod = getModule();
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        const s = String(p);
        if (s === '/test/Server') return true;
        if (s.endsWith('HytaleServer.jar')) return true;
        return false;
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      expect(mod.isServerDirValid('/test/Server')).toBe(true);
    });

    it('should return true when directory contains config.json', () => {
      const mod = getModule();
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        const s = String(p);
        if (s === '/test/Server') return true;
        if (s.endsWith('config.json')) return true;
        return false;
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      expect(mod.isServerDirValid('/test/Server')).toBe(true);
    });

    it('should return true when directory contains universe/ subdirectory', () => {
      const mod = getModule();
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        const s = String(p);
        if (s === '/test/Server') return true;
        if (s.endsWith('universe')) return true;
        return false;
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      expect(mod.isServerDirValid('/test/Server')).toBe(true);
    });

    it('should return false for empty directory', () => {
      const mod = getModule();
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === '/test/Empty';
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

      expect(mod.isServerDirValid('/test/Empty')).toBe(false);
    });

    it('should return false for non-existent path', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(false);

      expect(mod.isServerDirValid('/does/not/exist')).toBe(false);
    });

    it('should return false when path is a file, not a directory', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

      expect(mod.isServerDirValid('/some/file.txt')).toBe(false);
    });

    it('should return false when statSync throws', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockImplementation(() => { throw new Error('Permission denied'); });

      expect(mod.isServerDirValid('/locked/dir')).toBe(false);
    });
  });

  describe('initServerPath', () => {
    it('should read serverPath from config file when available', () => {
      const mod = getModule();
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ serverPath: '/custom/Server' }));

      const result = mod.initServerPath();
      expect(result).toContain('Server');
    });

    it('should fall back to default when config has no serverPath', () => {
      const mod = getModule();
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = mod.initServerPath();
      expect(result).toContain('Server');
    });

    it('should fall back to default when config file is missing', () => {
      const mod = getModule();
      mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

      const result = mod.initServerPath();
      expect(result).toContain('Server');
    });

    it('should fall back to default when config file contains malformed JSON', () => {
      const mod = getModule();
      mockFs.readFileSync.mockReturnValue('not json at all{{{');

      const result = mod.initServerPath();
      expect(result).toContain('Server');
    });

    it('should fall back to default when serverPath is not a string', () => {
      const mod = getModule();
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ serverPath: 42 }));

      const result = mod.initServerPath();
      expect(result).toContain('Server');
    });
  });

  describe('getServerDir', () => {
    it('should auto-initialize if not yet called', () => {
      const mod = getModule();
      mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

      const result = mod.getServerDir();
      expect(result).toContain('Server');
    });

    it('should return cached value after initServerPath', () => {
      const mod = getModule();
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ serverPath: '/custom/path' }));

      mod.initServerPath();
      mockFs.readFileSync.mockClear();

      const result = mod.getServerDir();
      expect(result).toContain('custom');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('getDisabledModsDir', () => {
    it('should return path to disabled-mods directory', () => {
      const mod = getModule();
      const result = mod.getDisabledModsDir();
      expect(result).toContain('disabled-mods');
    });
  });

  describe('setServerDir', () => {
    it('should return true and update config when path is valid', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = mod.setServerDir('/valid/Server');
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return error message when directory is invalid', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(false);

      const result = mod.setServerDir('/invalid/path');
      expect(typeof result).toBe('string');
      expect(result).toContain('does not appear to be a valid');
    });

    it('should create config directory if it does not exist', () => {
      const mod = getModule();
      const configPath = mod.getAppConfigPath();
      const configDir = path.dirname(configPath);

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        const s = String(p);
        // Config directory does not exist
        if (s === configDir) return false;
        // Everything else (the server dir, marker files) exists
        return true;
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.mkdirSync.mockImplementation(() => '' as any);

      mod.setServerDir('/valid/Server');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(configDir, { recursive: true });
    });

    it('should return error message when writeFileSync throws', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
      mockFs.writeFileSync.mockImplementation(() => { throw new Error('EPERM: no write permission'); });

      const result = mod.setServerDir('/valid/Server');
      expect(typeof result).toBe('string');
      expect(result).toContain('Failed to save server path');
    });

    it('should preserve existing config keys when updating', () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ existingKey: 'value' }));
      mockFs.writeFileSync.mockImplementation(() => {});

      mod.setServerDir('/valid/Server');

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const written = JSON.parse(writeCall[1] as string);
      expect(written.existingKey).toBe('value');
      expect(written.serverPath).toBeDefined();
    });
  });
});
