import fs from 'fs';
import path from 'path';
import { readAllMods } from '../../main/data-readers/mod-reader';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      readdir: jest.fn(),
      stat: jest.fn(),
    },
  };
});

const mockFsPromises = jest.mocked(fs.promises);

function makeDirent(name: string, isDir: boolean): fs.Dirent {
  return {
    name,
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  } as fs.Dirent;
}

describe('readAllMods', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should list enabled mods from mods/ directory', async () => {
    // First call: enabled mods dir (with dirent)
    // Second call: mod contents for hasStateFile (string[])
    // Third call: getDirSize entries (with dirent)
    // Fourth call: disabled mods dir (empty)
    mockFsPromises.readdir
      .mockResolvedValueOnce([makeDirent('Hytale_Shop', true)] as any)
      .mockResolvedValueOnce(['state.json', 'data.txt'] as any) // mod contents for hasStateFile
      .mockResolvedValueOnce([makeDirent('file.txt', false)] as any) // getDirSize entries
      .mockResolvedValueOnce([] as any); // disabled mods dir (empty)

    mockFsPromises.stat.mockResolvedValue({ size: 500 } as any);

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    const enabledMods = result.data.filter((m) => m.enabled);
    expect(enabledMods).toHaveLength(1);
    expect(enabledMods[0].name).toBe('Hytale_Shop');
    expect(enabledMods[0].enabled).toBe(true);
    expect(enabledMods[0].hasStateFile).toBe(true);
  });

  it('should list disabled mods from disabled-mods/ directory', async () => {
    // Enabled dir: ENOENT
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFsPromises.readdir
      .mockRejectedValueOnce(enoent)
      .mockResolvedValueOnce([makeDirent('OldMod', true)] as any)
      .mockResolvedValueOnce(['readme.txt'] as any) // mod contents (no json → hasStateFile false)
      .mockResolvedValueOnce([makeDirent('readme.txt', false)] as any); // getDirSize

    mockFsPromises.stat.mockResolvedValue({ size: 200 } as any);

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    const disabledMods = result.data.filter((m) => !m.enabled);
    expect(disabledMods).toHaveLength(1);
    expect(disabledMods[0].name).toBe('OldMod');
    expect(disabledMods[0].enabled).toBe(false);
    expect(disabledMods[0].hasStateFile).toBe(false);
  });

  it('should handle missing mods/ directory gracefully', async () => {
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFsPromises.readdir
      .mockRejectedValueOnce(enoent) // enabled
      .mockRejectedValueOnce(enoent); // disabled

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle missing disabled-mods/ directory gracefully', async () => {
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFsPromises.readdir
      .mockResolvedValueOnce([] as any) // enabled: empty
      .mockRejectedValueOnce(enoent); // disabled: missing

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should report non-ENOENT errors from mods directory', async () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFsPromises.readdir.mockRejectedValueOnce(err).mockResolvedValueOnce([] as any);

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to read mods directory');
  });

  it('should skip non-directory entries', async () => {
    mockFsPromises.readdir
      .mockResolvedValueOnce([
        makeDirent('readme.txt', false),
        makeDirent('ActualMod', true),
      ] as any)
      .mockResolvedValueOnce([] as any) // mod contents
      .mockResolvedValueOnce([] as any) // getDirSize
      .mockResolvedValueOnce([] as any); // disabled

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('ActualMod');
  });

  it('should detect state file presence by .json extension', async () => {
    mockFsPromises.readdir
      .mockResolvedValueOnce([makeDirent('ModA', true)] as any)
      .mockResolvedValueOnce(['config.json', 'plugin.jar'] as any)
      .mockResolvedValueOnce([] as any) // getDirSize
      .mockResolvedValueOnce([] as any); // disabled

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data[0].hasStateFile).toBe(true);
  });

  it('should set hasStateFile false when no .json files exist', async () => {
    mockFsPromises.readdir
      .mockResolvedValueOnce([makeDirent('ModB', true)] as any)
      .mockResolvedValueOnce(['readme.txt', 'data.bin'] as any)
      .mockResolvedValueOnce([] as any) // getDirSize
      .mockResolvedValueOnce([] as any); // disabled

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data[0].hasStateFile).toBe(false);
  });

  it('should handle unreadable mod subdirectory gracefully', async () => {
    mockFsPromises.readdir
      .mockResolvedValueOnce([makeDirent('LockedMod', true)] as any)
      .mockRejectedValueOnce(new Error('Cannot read')) // mod contents fail
      .mockResolvedValueOnce([] as any) // getDirSize (also empty/fails gracefully)
      .mockResolvedValueOnce([] as any); // disabled

    const result = await readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].hasStateFile).toBe(false);
  });

  it('should construct correct paths', async () => {
    mockFsPromises.readdir
      .mockResolvedValueOnce([] as any) // enabled
      .mockResolvedValueOnce([] as any); // disabled

    await readAllMods('/my/server', '/my/disabled');

    expect(mockFsPromises.readdir).toHaveBeenCalledWith(
      path.join('/my/server', 'mods'),
      expect.anything()
    );
    expect(mockFsPromises.readdir).toHaveBeenCalledWith('/my/disabled', expect.anything());
  });
});
