import fs from 'fs';
import path from 'path';
import { readGlobalMemories } from '../../main/data-readers/memory-reader';

jest.mock('fs');
const mockFs = jest.mocked(fs);

const FIXTURES = path.join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return jest.requireActual<typeof fs>('fs').readFileSync(
    path.join(FIXTURES, name),
    'utf-8',
  );
}

const validMemoriesJson = loadFixture('memories-valid.json');
const emptyMemoriesJson = loadFixture('memories-empty.json');

describe('readGlobalMemories', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse valid memories JSON', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
  });

  it('should transform NPCRole correctly', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');
    expect(result.data[0].npcRole).toBe('Goblin_Hermit');
    expect(result.data[1].npcRole).toBe('Pufferfish');
    expect(result.data[2].npcRole).toBe('Merchant_Trader');
  });

  it('should format TranslationKey to displayName', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');
    expect(result.data[0].displayName).toBe('Goblin Hermit');
    expect(result.data[1].displayName).toBe('Pufferfish');
    expect(result.data[2].displayName).toBe('Merchant Trader');
  });

  it('should format FoundLocationNameKey to location', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');
    // 'server.map.region.Zone1_Tier1' → picks second-to-last part 'region'
    expect(result.data[0].location).toBe('region');
    expect(result.data[1].location).toBe('region');
  });

  it('should convert CapturedTimestamp to capturedAt', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');
    expect(result.data[0].capturedAt).toBe(1707750000000);
  });

  it('should preserve isNameOverridden', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');
    expect(result.data[0].isNameOverridden).toBe(false);
    expect(result.data[1].isNameOverridden).toBe(true);
  });

  it('should handle empty memories array', () => {
    mockFs.readFileSync.mockReturnValue(emptyMemoriesJson);

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('should handle missing file gracefully (ENOENT)', () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockFs.readFileSync.mockImplementation(() => { throw err; });

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('should handle malformed JSON with error', () => {
    mockFs.readFileSync.mockReturnValue('{ bad json');

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toMatch(/Failed to parse memories\.json/);
    expect(result.data).toHaveLength(0);
  });

  it('should handle non-ENOENT errors', () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.readFileSync.mockImplementation(() => { throw err; });

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toMatch(/Failed to read memories\.json/);
  });

  it('should read from correct file path', () => {
    mockFs.readFileSync.mockReturnValue(emptyMemoriesJson);

    readGlobalMemories('/my/server');

    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join('/my/server', 'universe', 'memories.json'),
      'utf-8',
    );
  });

  it('should handle JSON with missing Memories property', () => {
    mockFs.readFileSync.mockReturnValue('{}');

    const result = readGlobalMemories('/fake/server');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('should return full unfiltered list (filtering is in IPC layer, not reader)', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');

    // Reader returns ALL memories — IPC handler applies discovery filter separately
    expect(result.data).toHaveLength(3);
    const roles = result.data.map(m => m.npcRole);
    expect(roles).toEqual(['Goblin_Hermit', 'Pufferfish', 'Merchant_Trader']);
  });

  it('should preserve npcRole field exactly as read (for filter matching)', () => {
    mockFs.readFileSync.mockReturnValue(validMemoriesJson);

    const result = readGlobalMemories('/fake/server');

    // npcRole must match NPCRole from JSON exactly (underscores preserved)
    expect(result.data[0].npcRole).toBe('Goblin_Hermit');
    expect(result.data[1].npcRole).toBe('Pufferfish');
    expect(result.data[2].npcRole).toBe('Merchant_Trader');
  });
});
