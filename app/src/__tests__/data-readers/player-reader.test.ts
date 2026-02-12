import fs from 'fs';
import path from 'path';
import { readAllPlayers, readPlayerMemories } from '../../main/data-readers/player-reader';

jest.mock('fs');
const mockFs = jest.mocked(fs);

const FIXTURES = path.join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return jest.requireActual<typeof fs>('fs').readFileSync(
    path.join(FIXTURES, name),
    'utf-8',
  );
}

const validPlayerJson = loadFixture('player-valid.json');
const malformedPlayerJson = loadFixture('player-malformed.json');
const minimalPlayerJson = loadFixture('player-minimal.json');

describe('readAllPlayers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse a valid player JSON correctly', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');

    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);

    const player = result.data[0];
    expect(player.uuid).toBe('abc-123');
    expect(player.name).toBe('XxDandelionxX');
    expect(player.gameMode).toBe('Survival');
    expect(player.world).toBe('default');
  });

  it('should extract position from Transform.Position', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    const player = result.data[0];

    expect(player.position).toEqual({ x: 123.456, y: 78.9, z: -42.1 });
  });

  it('should extract stats with modifiers', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    const stats = result.data[0].stats;

    expect(stats.health.current).toBe(85.5);
    expect(stats.health.modifiers).toEqual({ ArmorBonus: 10, FoodBuff: 5 });
    expect(stats.stamina.current).toBe(100);
    expect(stats.mana.current).toBe(50);
    expect(stats.oxygen.current).toBe(100);
  });

  it('should extract inventory sections', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    const inv = result.data[0].inventory;

    expect(inv.activeHotbarSlot).toBe(2);
    expect(inv.storage[0]).toEqual({
      id: 'Weapon_Daggers_Adamantite',
      quantity: 1,
      durability: 85.5,
      maxDurability: 100,
    });
    expect(inv.storage[5]).toEqual({
      id: 'Food_Apple',
      quantity: 12,
      durability: 0,
      maxDurability: 0,
    });
    expect(inv.hotbar[0]).toEqual({
      id: 'Tool_Pickaxe_Iron',
      quantity: 1,
      durability: 45,
      maxDurability: 200,
    });
  });

  it('should extract all 4 armor slots', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    const armor = result.data[0].armor;

    expect(armor[0]!.id).toBe('Armor_Cobalt_Head');
    expect(armor[1]!.id).toBe('Armor_Cobalt_Chest');
    expect(armor[2]!.id).toBe('Armor_Cobalt_Hands');
    expect(armor[3]!.id).toBe('Armor_Cobalt_Legs');
  });

  it('should extract discovered zones', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    expect(result.data[0].discoveredZones).toEqual([
      'server.map.region.Zone1_Tier1',
      'server.map.region.Zone2_Tier1',
      'server.map.region.Zone3_Tier1',
    ]);
  });

  it('should extract player memories with formatted names', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    const memories = result.data[0].memories;

    expect(memories).toHaveLength(3);
    expect(memories[0].npcRole).toBe('Goblin_Hermit');
    expect(memories[0].displayName).toBe('Goblin Hermit');
    // 'server.map.region.Zone1_Tier1' → picks second-to-last part 'region'
    expect(memories[0].location).toBe('region');
    expect(memories[0].capturedAt).toBe(1707750000000);
    expect(memories[0].isNameOverridden).toBe(false);
  });

  it('should extract respawn points from PerWorldData', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    expect(result.data[0].respawnPoints).toHaveLength(1);
    expect(result.data[0].respawnPoints[0]).toEqual({
      position: { x: 100, y: 64, z: -200 },
      world: 'default',
    });
  });

  it('should extract death markers from PerWorldData', () => {
    mockFs.readdirSync.mockReturnValue(['abc-123.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');
    expect(result.data[0].deathMarkers).toHaveLength(1);
    expect(result.data[0].deathMarkers[0]).toEqual({
      position: { x: 150.5, y: 40, z: -180.3 },
      day: 12,
    });
  });

  it('should handle malformed JSON gracefully with SyntaxError', () => {
    mockFs.readdirSync.mockReturnValue(['broken.json'] as any);
    mockFs.readFileSync.mockReturnValue(malformedPlayerJson);

    const result = readAllPlayers('/fake/server');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Failed to parse broken\.json/);
  });

  it('should handle minimal player (missing optional fields) without crash', () => {
    mockFs.readdirSync.mockReturnValue(['minimal.json'] as any);
    mockFs.readFileSync.mockReturnValue(minimalPlayerJson);

    const result = readAllPlayers('/fake/server');

    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);

    const player = result.data[0];
    expect(player.name).toBe('Unknown');
    expect(player.gameMode).toBe('Unknown');
    expect(player.world).toBe('unknown');
    expect(player.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(player.stats.health.current).toBe(0);
    expect(player.armor).toEqual([null, null, null, null]);
    expect(player.discoveredZones).toEqual([]);
    expect(player.memories).toEqual([]);
  });

  it('should skip .bak files', () => {
    mockFs.readdirSync.mockReturnValue(['player.json', 'player.json.bak'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');

    expect(result.data).toHaveLength(1);
    expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should skip non-json files', () => {
    mockFs.readdirSync.mockReturnValue(['readme.txt', 'player.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readAllPlayers('/fake/server');

    expect(result.data).toHaveLength(1);
  });

  it('should return empty array with error when directory does not exist', () => {
    const err = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockFs.readdirSync.mockImplementation(() => { throw err; });

    const result = readAllPlayers('/fake/server');

    expect(result.data).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Players directory not found');
  });

  it('should return error for non-ENOENT directory errors', () => {
    const err = new Error('Permission denied') as NodeJS.ErrnoException;
    err.code = 'EACCES';
    mockFs.readdirSync.mockImplementation(() => { throw err; });

    const result = readAllPlayers('/fake/server');

    expect(result.errors[0]).toContain('Failed to read players directory');
  });

  it('should handle read errors for individual files', () => {
    mockFs.readdirSync.mockReturnValue(['good.json', 'bad.json'] as any);
    mockFs.readFileSync
      .mockReturnValueOnce(validPlayerJson)
      .mockImplementationOnce(() => { throw new Error('disk read error'); });

    const result = readAllPlayers('/fake/server');

    expect(result.data).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Failed to read bad\.json/);
  });

  it('should read from correct players directory path', () => {
    mockFs.readdirSync.mockReturnValue([] as any);

    readAllPlayers('/my/server');

    expect(mockFs.readdirSync).toHaveBeenCalledWith(
      path.join('/my/server', 'universe', 'players'),
    );
  });
});

describe('readPlayerMemories', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return memories keyed by player name', () => {
    mockFs.readdirSync.mockReturnValue(['abc.json'] as any);
    mockFs.readFileSync.mockReturnValue(validPlayerJson);

    const result = readPlayerMemories('/fake/server');

    expect(result['XxDandelionxX']).toBeDefined();
    expect(result['XxDandelionxX']).toHaveLength(3);
  });

  it('should omit players with no memories', () => {
    mockFs.readdirSync.mockReturnValue(['min.json'] as any);
    mockFs.readFileSync.mockReturnValue(minimalPlayerJson);

    const result = readPlayerMemories('/fake/server');

    expect(Object.keys(result)).toHaveLength(0);
  });
});
