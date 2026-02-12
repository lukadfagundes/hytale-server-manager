import fs from 'fs';
import path from 'path';
import { readWarps } from '../../main/data-readers/warp-reader';

jest.mock('fs');
const mockFs = jest.mocked(fs);

const FIXTURES = path.join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return jest.requireActual<typeof fs>('fs').readFileSync(
    path.join(FIXTURES, name),
    'utf-8',
  );
}

const validWarpsJson = loadFixture('warps-valid.json');
const emptyWarpsJson = loadFixture('warps-empty.json');

describe('readWarps', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse valid warps JSON', () => {
    mockFs.readFileSync.mockReturnValue(validWarpsJson);

    const result = readWarps('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('should map Id, World, Creator correctly', () => {
    mockFs.readFileSync.mockReturnValue(validWarpsJson);

    const result = readWarps('/fake/server');
    const warp = result.data[0];

    expect(warp.id).toBe('spawn');
    expect(warp.world).toBe('default');
    expect(warp.creator).toBe('XxDandelionxX');
  });

  it('should map X, Y, Z to position object', () => {
    mockFs.readFileSync.mockReturnValue(validWarpsJson);

    const result = readWarps('/fake/server');
    expect(result.data[0].position).toEqual({ x: 100.5, y: 64.0, z: -200.3 });
    expect(result.data[1].position).toEqual({ x: -500.0, y: 30.0, z: 800.5 });
  });

  it('should map Yaw correctly', () => {
    mockFs.readFileSync.mockReturnValue(validWarpsJson);

    const result = readWarps('/fake/server');
    expect(result.data[0].yaw).toBe(90.0);
    expect(result.data[1].yaw).toBe(180.0);
  });

  it('should parse CreationDate to createdAt string', () => {
    mockFs.readFileSync.mockReturnValue(validWarpsJson);

    const result = readWarps('/fake/server');
    expect(result.data[0].createdAt).toBe('2026-01-15T10:30:00Z');
    expect(result.data[1].createdAt).toBe('2026-02-01T14:15:00Z');
  });

  it('should handle empty warps array', () => {
    mockFs.readFileSync.mockReturnValue(emptyWarpsJson);

    const result = readWarps('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('should handle missing file gracefully (ENOENT)', () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw err; });

    const result = readWarps('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('should handle malformed JSON with error', () => {
    mockFs.readFileSync.mockReturnValue('not json');

    const result = readWarps('/fake/server');

    expect(result.error).toMatch(/Failed to parse warps\.json/);
    expect(result.data).toHaveLength(0);
  });

  it('should handle non-ENOENT errors', () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.readFileSync.mockImplementation(() => { throw err; });

    const result = readWarps('/fake/server');

    expect(result.error).toMatch(/Failed to read warps\.json/);
  });

  it('should read from correct file path', () => {
    mockFs.readFileSync.mockReturnValue(emptyWarpsJson);

    readWarps('/my/server');

    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join('/my/server', 'universe', 'warps.json'),
      'utf-8',
    );
  });

  it('should handle warp with missing fields using defaults', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ Warps: [{}] }));

    const result = readWarps('/fake/server');

    expect(result.data[0]).toEqual({
      id: '',
      world: '',
      creator: '',
      createdAt: '',
      position: { x: 0, y: 0, z: 0 },
      yaw: 0,
    });
  });
});
