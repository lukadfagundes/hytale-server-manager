jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
}));

jest.mock('fs');
jest.mock('node-stream-zip');

import fs from 'fs';
import path from 'path';
import StreamZip from 'node-stream-zip';

const mockFs = jest.mocked(fs);

describe('asset-extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function getModule() {
    let mod: typeof import('../../main/asset-extractor');
    jest.isolateModules(() => {
      jest.doMock('electron', () => ({
        app: {
          getPath: jest.fn().mockReturnValue('/mock/userData'),
        },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('../../main/asset-extractor');
    });
    return mod!;
  }

  describe('getAssetCacheDir', () => {
    it('should return userData/asset-cache path', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getAssetCacheDir } = require('../../main/asset-extractor');
      const result = getAssetCacheDir();
      expect(result).toBe(path.join('/mock/userData', 'asset-cache'));
    });
  });

  describe('areAssetsCached', () => {
    it('should return false when stamp file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { areAssetsCached } = require('../../main/asset-extractor');
      expect(areAssetsCached()).toBe(false);
    });

    it('should return true when both stamp and icon map exist', () => {
      mockFs.existsSync.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { areAssetsCached } = require('../../main/asset-extractor');
      expect(areAssetsCached()).toBe(true);
    });

    it('should return false when only stamp exists but icon map does not', () => {
      const cacheDir = path.join('/mock/userData', 'asset-cache');
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        const filePath = String(p);
        if (filePath === path.join(cacheDir, '.assets-stamp')) return true;
        if (filePath === path.join(cacheDir, 'item-icon-map.json')) return false;
        return false;
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { areAssetsCached } = require('../../main/asset-extractor');
      expect(areAssetsCached()).toBe(false);
    });
  });

  describe('extractAssets', () => {
    it('should return error when Assets.zip does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const { extractAssets } = getModule();

      const result = await extractAssets('/mock/Server');
      expect(result).toEqual({ success: false, error: 'Assets.zip not found' });
    });

    it('should skip extraction when stamp is up-to-date', async () => {
      const zipPath = path.resolve('/mock/Server', '..', 'Assets.zip');

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === zipPath;
      });
      mockFs.statSync.mockReturnValue({ mtimeMs: 12345 } as unknown as fs.Stats);
      // readFileSync is called for stamp (returns mtime) and icon map (returns valid JSON)
      mockFs.readFileSync.mockImplementation((_p: fs.PathLike) => {
        const filePath = String(_p);
        if (filePath.endsWith('.assets-stamp')) return '12345';
        if (filePath.endsWith('item-icon-map.json')) return '{"Foo":"Bar"}';
        throw new Error('ENOENT');
      });

      const { extractAssets } = getModule();
      const result = await extractAssets('/mock/Server');

      expect(result).toEqual({ success: true, totalFiles: 0 });
    });

    it('should extract files from valid zip and write stamp', async () => {
      const zipPath = path.resolve('/mock/Server', '..', 'Assets.zip');

      // existsSync: true for zip path, false for stamp check
      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === zipPath;
      });
      // statSync for stamp check — make readFileSync throw so isUpToDate returns false
      mockFs.statSync.mockReturnValue({ mtimeMs: 99999 } as unknown as fs.Stats);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      // Mock StreamZip
      const mockEntryData = jest.fn().mockResolvedValue(Buffer.from('PNG data'));
      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockEntries = jest.fn().mockResolvedValue({
        'Common/Icons/ItemsGenerated/Sword.png': { name: 'Common/Icons/ItemsGenerated/Sword.png' },
        'Common/Icons/ItemsGenerated/Shield.png': {
          name: 'Common/Icons/ItemsGenerated/Shield.png',
        },
      });

      (StreamZip as unknown as { async: jest.Mock }).async = jest.fn().mockImplementation(() => ({
        entries: mockEntries,
        entryData: mockEntryData,
        close: mockClose,
      }));

      const { extractAssets } = getModule();
      const result = await extractAssets('/mock/Server');

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBe(2);
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle zip extraction errors gracefully', async () => {
      const zipPath = path.resolve('/mock/Server', '..', 'Assets.zip');

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === zipPath;
      });
      mockFs.statSync.mockReturnValue({ mtimeMs: 99999 } as unknown as fs.Stats);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      mockFs.mkdirSync.mockReturnValue(undefined);

      (StreamZip as unknown as { async: jest.Mock }).async = jest.fn().mockImplementation(() => ({
        entries: jest.fn().mockRejectedValue(new Error('Corrupt zip')),
        close: jest.fn().mockResolvedValue(undefined),
      }));

      const { extractAssets } = getModule();
      const result = await extractAssets('/mock/Server');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Corrupt zip');
    });

    it('should use concurrency guard for parallel calls', async () => {
      const zipPath = path.resolve('/mock/Server', '..', 'Assets.zip');

      mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
        return String(p) === zipPath;
      });
      mockFs.statSync.mockReturnValue({ mtimeMs: 99999 } as unknown as fs.Stats);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);

      const mockEntries = jest.fn().mockResolvedValue({});
      const mockClose = jest.fn().mockResolvedValue(undefined);

      (StreamZip as unknown as { async: jest.Mock }).async = jest.fn().mockImplementation(() => ({
        entries: mockEntries,
        entryData: jest.fn().mockResolvedValue(Buffer.from('')),
        close: mockClose,
      }));

      const { extractAssets } = getModule();

      // Call twice in parallel — both should resolve with the same result
      const [result1, result2] = await Promise.all([
        extractAssets('/mock/Server'),
        extractAssets('/mock/Server'),
      ]);

      expect(result1).toEqual(result2);
      // StreamZip should only be instantiated once due to concurrency guard
      expect((StreamZip as unknown as { async: jest.Mock }).async).toHaveBeenCalledTimes(1);
    });
  });
});
