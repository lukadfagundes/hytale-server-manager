import fs from 'fs';
import path from 'path';
import { readWorldMap } from '../../main/data-readers/world-reader';

jest.mock('fs');
const mockFs = jest.mocked(fs);

const FIXTURES = path.join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return jest.requireActual<typeof fs>('fs').readFileSync(
    path.join(FIXTURES, name),
    'utf-8',
  );
}

const validMarkersJson = loadFixture('markers-valid.json');

describe('readWorldMap', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse region filenames to x,z coordinates', () => {
    mockFs.readdirSync.mockReturnValue(['0.0.region.bin', '1.-2.region.bin'] as any);
    mockFs.statSync.mockReturnValue({ size: 1000, mtimeMs: 1707750000000 } as any);
    // Markers file throws ENOENT
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.regions).toHaveLength(2);
    expect(result.data.regions[0]).toEqual({ x: 0, z: 0, sizeBytes: 1000, lastModified: 1707750000000 });
    expect(result.data.regions[1]).toEqual({ x: 1, z: -2, sizeBytes: 1000, lastModified: 1707750000000 });
  });

  it('should parse negative coordinates from region filenames', () => {
    mockFs.readdirSync.mockReturnValue(['-5.-1.region.bin'] as any);
    mockFs.statSync.mockReturnValue({ size: 500, mtimeMs: 1707750000000 } as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.regions[0].x).toBe(-5);
    expect(result.data.regions[0].z).toBe(-1);
  });

  it('should calculate correct bounds from region list', () => {
    mockFs.readdirSync.mockReturnValue(['-3.2.region.bin', '5.-1.region.bin', '0.0.region.bin'] as any);
    mockFs.statSync.mockReturnValue({ size: 100, mtimeMs: 0 } as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.bounds).toEqual({ minX: -3, maxX: 5, minZ: -1, maxZ: 2 });
  });

  it('should set bounds to 0 when no regions exist', () => {
    mockFs.readdirSync.mockReturnValue([] as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.bounds).toEqual({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
    expect(result.data.regions).toHaveLength(0);
  });

  it('should read map markers from BlockMapMarkers.json', () => {
    mockFs.readdirSync.mockReturnValue([] as any);
    mockFs.readFileSync.mockReturnValue(validMarkersJson);

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.markers).toHaveLength(1);
    expect(result.data.markers[0]).toEqual({
      id: 'forgotten_temple_01',
      name: 'Forgotten Temple',
      icon: 'temple_icon',
      position: { x: 250.0, y: 55.0, z: -150.0 },
    });
  });

  it('should handle missing chunks directory gracefully (ENOENT)', () => {
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readdirSync.mockImplementation(() => { throw enoent; });
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.errors).toHaveLength(0);
    expect(result.data.regions).toHaveLength(0);
  });

  it('should report non-ENOENT errors for chunks directory', () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.readdirSync.mockImplementation(() => { throw err; });
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to read chunks directory');
  });

  it('should handle missing markers file gracefully (ENOENT)', () => {
    mockFs.readdirSync.mockReturnValue([] as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.errors).toHaveLength(0);
    expect(result.data.markers).toHaveLength(0);
  });

  it('should report non-ENOENT errors for markers file', () => {
    mockFs.readdirSync.mockReturnValue([] as any);
    const err = new Error('Bad JSON') as any;
    // JSON.parse throws SyntaxError which doesn't have .code
    mockFs.readFileSync.mockReturnValue('{ bad');

    const result = readWorldMap('/fake/server', [], []);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to read BlockMapMarkers.json');
  });

  it('should ignore non-region files in chunks directory', () => {
    mockFs.readdirSync.mockReturnValue(['readme.txt', '0.0.region.bin', '.DS_Store'] as any);
    mockFs.statSync.mockReturnValue({ size: 100, mtimeMs: 0 } as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.regions).toHaveLength(1);
  });

  it('should skip files with non-numeric coordinates', () => {
    mockFs.readdirSync.mockReturnValue(['abc.def.region.bin', '0.0.region.bin'] as any);
    mockFs.statSync.mockReturnValue({ size: 100, mtimeMs: 0 } as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.regions).toHaveLength(1);
  });

  it('should pass through player and warp positions', () => {
    mockFs.readdirSync.mockReturnValue([] as any);
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const players = [{ name: 'Player1', position: { x: 1, y: 2, z: 3 } }];
    const warps = [{ name: 'spawn', position: { x: 10, y: 20, z: 30 } }];

    const result = readWorldMap('/fake/server', players, warps);

    expect(result.data.playerPositions).toEqual(players);
    expect(result.data.warpPositions).toEqual(warps);
  });

  it('should silently skip files that fail statSync', () => {
    mockFs.readdirSync.mockReturnValue(['0.0.region.bin', '1.1.region.bin'] as any);
    mockFs.statSync
      .mockReturnValueOnce({ size: 100, mtimeMs: 0 } as any)
      .mockImplementationOnce(() => { throw new Error('stat error'); });
    const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
    enoent.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw enoent; });

    const result = readWorldMap('/fake/server', [], []);

    expect(result.data.regions).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
