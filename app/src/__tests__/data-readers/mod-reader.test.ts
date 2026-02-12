import fs from 'fs';
import path from 'path';
import { readAllMods } from '../../main/data-readers/mod-reader';

jest.mock('fs');
const mockFs = jest.mocked(fs);

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

  it('should list enabled mods from mods/ directory', () => {
    // First call: enabled mods dir
    mockFs.readdirSync
      .mockReturnValueOnce([makeDirent('Hytale_Shop', true)] as any)
      .mockReturnValueOnce(['state.json', 'data.txt'] as any) // mod contents for hasStateFile
      .mockReturnValueOnce([makeDirent('file.txt', false)] as any) // getDirSize entries
      .mockReturnValueOnce([] as any); // disabled mods dir (empty)

    mockFs.statSync.mockReturnValue({ size: 500 } as any);

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    const enabledMods = result.data.filter(m => m.enabled);
    expect(enabledMods).toHaveLength(1);
    expect(enabledMods[0].name).toBe('Hytale_Shop');
    expect(enabledMods[0].enabled).toBe(true);
    expect(enabledMods[0].hasStateFile).toBe(true);
  });

  it('should list disabled mods from disabled-mods/ directory', () => {
    // Enabled dir: ENOENT
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readdirSync
      .mockImplementationOnce(() => { throw enoent; })
      .mockReturnValueOnce([makeDirent('OldMod', true)] as any)
      .mockReturnValueOnce(['readme.txt'] as any) // mod contents (no json → hasStateFile false)
      .mockReturnValueOnce([makeDirent('readme.txt', false)] as any); // getDirSize

    mockFs.statSync.mockReturnValue({ size: 200 } as any);

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    const disabledMods = result.data.filter(m => !m.enabled);
    expect(disabledMods).toHaveLength(1);
    expect(disabledMods[0].name).toBe('OldMod');
    expect(disabledMods[0].enabled).toBe(false);
    expect(disabledMods[0].hasStateFile).toBe(false);
  });

  it('should handle missing mods/ directory gracefully', () => {
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readdirSync
      .mockImplementationOnce(() => { throw enoent; }) // enabled
      .mockImplementationOnce(() => { throw enoent; }); // disabled

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle missing disabled-mods/ directory gracefully', () => {
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readdirSync
      .mockReturnValueOnce([] as any) // enabled: empty
      .mockImplementationOnce(() => { throw enoent; }); // disabled: missing

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should report non-ENOENT errors from mods directory', () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.readdirSync
      .mockImplementationOnce(() => { throw err; })
      .mockReturnValueOnce([] as any);

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to read mods directory');
  });

  it('should skip non-directory entries', () => {
    mockFs.readdirSync
      .mockReturnValueOnce([
        makeDirent('readme.txt', false),
        makeDirent('ActualMod', true),
      ] as any)
      .mockReturnValueOnce([] as any) // mod contents
      .mockReturnValueOnce([] as any) // getDirSize
      .mockReturnValueOnce([] as any); // disabled

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('ActualMod');
  });

  it('should detect state file presence by .json extension', () => {
    mockFs.readdirSync
      .mockReturnValueOnce([makeDirent('ModA', true)] as any)
      .mockReturnValueOnce(['config.json', 'plugin.jar'] as any)
      .mockReturnValueOnce([] as any) // getDirSize
      .mockReturnValueOnce([] as any); // disabled

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data[0].hasStateFile).toBe(true);
  });

  it('should set hasStateFile false when no .json files exist', () => {
    mockFs.readdirSync
      .mockReturnValueOnce([makeDirent('ModB', true)] as any)
      .mockReturnValueOnce(['readme.txt', 'data.bin'] as any)
      .mockReturnValueOnce([] as any) // getDirSize
      .mockReturnValueOnce([] as any); // disabled

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data[0].hasStateFile).toBe(false);
  });

  it('should handle unreadable mod subdirectory gracefully', () => {
    mockFs.readdirSync
      .mockReturnValueOnce([makeDirent('LockedMod', true)] as any)
      .mockImplementationOnce(() => { throw new Error('Cannot read'); }) // mod contents fail
      .mockReturnValueOnce([] as any) // getDirSize (also empty/fails gracefully)
      .mockReturnValueOnce([] as any); // disabled

    const result = readAllMods('/fake/server', '/fake/disabled-mods');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].hasStateFile).toBe(false);
  });

  it('should construct correct paths', () => {
    mockFs.readdirSync
      .mockReturnValueOnce([] as any) // enabled
      .mockReturnValueOnce([] as any); // disabled

    readAllMods('/my/server', '/my/disabled');

    expect(mockFs.readdirSync).toHaveBeenCalledWith(
      path.join('/my/server', 'mods'),
      expect.anything(),
    );
    expect(mockFs.readdirSync).toHaveBeenCalledWith(
      '/my/disabled',
      expect.anything(),
    );
  });
});
