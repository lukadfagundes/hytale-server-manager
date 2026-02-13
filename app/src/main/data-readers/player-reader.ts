import fs from 'fs';
import path from 'path';

export interface PlayerData {
  uuid: string;
  name: string;
  gameMode: string;
  world: string;
  position: { x: number; y: number; z: number };
  stats: {
    health: { current: number; modifiers: Record<string, number> };
    stamina: { current: number; modifiers: Record<string, number> };
    mana: { current: number; modifiers: Record<string, number> };
    oxygen: { current: number; modifiers: Record<string, number> };
  };
  inventory: {
    storage: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }>;
    hotbar: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }>;
    backpack: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }>;
    utility: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }>;
    tool: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }>;
    activeHotbarSlot: number;
  };
  armor: [
    { id: string; quantity: number; durability: number; maxDurability: number } | null,
    { id: string; quantity: number; durability: number; maxDurability: number } | null,
    { id: string; quantity: number; durability: number; maxDurability: number } | null,
    { id: string; quantity: number; durability: number; maxDurability: number } | null,
  ];
  discoveredZones: string[];
  respawnPoints: { position: { x: number; y: number; z: number }; world: string }[];
  deathMarkers: { position: { x: number; y: number; z: number }; day: number }[];
  memories: {
    npcRole: string;
    displayName: string;
    location: string;
    capturedAt: number;
    isNameOverridden: boolean;
  }[];
}

export interface PlayersResult {
  data: PlayerData[];
  errors: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function parseItem(raw: any): { id: string; quantity: number; durability: number; maxDurability: number } {
  return {
    id: raw.Id ?? '',
    quantity: raw.Quantity ?? 0,
    durability: raw.Durability ?? 0,
    maxDurability: raw.MaxDurability ?? 0,
  };
}

function parseInventorySection(raw: any): Record<number, { id: string; quantity: number; durability: number; maxDurability: number }> {
  const result: Record<number, { id: string; quantity: number; durability: number; maxDurability: number }> = {};
  const items = raw?.Items;
  if (!items) return result;
  for (const [slot, item] of Object.entries(items)) {
    result[Number(slot)] = parseItem(item);
  }
  return result;
}

function parseStat(raw: any): { current: number; modifiers: Record<string, number> } {
  const modifiers: Record<string, number> = {};
  if (raw?.Modifiers) {
    for (const [key, mod] of Object.entries(raw.Modifiers as Record<string, any>)) {
      modifiers[key] = (mod as any).Amount ?? 0;
    }
  }
  return { current: raw?.Value ?? 0, modifiers };
}

function formatTranslationKey(key: string): string {
  const parts = key.split('.');
  const last = parts[parts.length - 1];
  const meaningful = last === 'name' && parts.length >= 3 ? parts[parts.length - 2] : last;
  return meaningful.replace(/_/g, ' ');
}

function parseMemories(raw: any): PlayerData['memories'] {
  if (!raw?.Memories || !Array.isArray(raw.Memories)) return [];
  return raw.Memories.map((m: any) => ({
    npcRole: m.NPCRole ?? '',
    displayName: formatTranslationKey(m.TranslationKey ?? ''),
    location: formatTranslationKey(m.FoundLocationNameKey ?? ''),
    capturedAt: m.CapturedTimestamp ?? 0,
    isNameOverridden: m.IsMemoriesNameOverridden ?? false,
  }));
}

function parsePlayer(filename: string, raw: any): PlayerData {
  const components = raw.Components ?? {};
  const player = components.Player ?? {};
  const playerData = player.PlayerData ?? {};
  const transform = components.Transform ?? {};
  const stats = components.EntityStats?.Stats ?? {};
  const inv = player.Inventory ?? {};

  const uuid = filename.replace('.json', '');
  const name = components.Nameplate?.Text ?? 'Unknown';
  const world = playerData.World ?? 'unknown';

  const pos = transform.Position ?? {};
  const position = { x: pos.X ?? 0, y: pos.Y ?? 0, z: pos.Z ?? 0 };

  const armorItems = inv.Armor?.Items ?? {};
  const armor: PlayerData['armor'] = [
    armorItems['0'] ? parseItem(armorItems['0']) : null,
    armorItems['1'] ? parseItem(armorItems['1']) : null,
    armorItems['2'] ? parseItem(armorItems['2']) : null,
    armorItems['3'] ? parseItem(armorItems['3']) : null,
  ];

  const respawnPoints: PlayerData['respawnPoints'] = [];
  const deathMarkers: PlayerData['deathMarkers'] = [];
  const perWorldData = playerData.PerWorldData ?? {};
  for (const [worldName, wd] of Object.entries(perWorldData as Record<string, any>)) {
    if (wd.RespawnPoints) {
      for (const rp of wd.RespawnPoints) {
        const rPos = rp.RespawnPosition ?? rp.BlockPosition ?? {};
        respawnPoints.push({
          position: { x: rPos.X ?? 0, y: rPos.Y ?? 0, z: rPos.Z ?? 0 },
          world: worldName,
        });
      }
    }
    if (wd.DeathPositions) {
      for (const dp of wd.DeathPositions) {
        const dPos = dp.Position ?? {};
        deathMarkers.push({
          position: { x: dPos.X ?? 0, y: dPos.Y ?? 0, z: dPos.Z ?? 0 },
          day: dp.Day ?? 0,
        });
      }
    }
  }

  return {
    uuid,
    name,
    gameMode: player.GameMode ?? 'Unknown',
    world,
    position,
    stats: {
      health: parseStat(stats.Health),
      stamina: parseStat(stats.Stamina),
      mana: parseStat(stats.Mana),
      oxygen: parseStat(stats.Oxygen),
    },
    inventory: {
      storage: parseInventorySection(inv.Storage),
      hotbar: parseInventorySection(inv.HotBar),
      backpack: parseInventorySection(inv.Backpack),
      utility: parseInventorySection(inv.Utility),
      tool: parseInventorySection(inv.Tool),
      activeHotbarSlot: inv.ActiveHotbarSlot ?? 0,
    },
    armor,
    discoveredZones: playerData.DiscoveredZones ?? [],
    respawnPoints,
    deathMarkers,
    memories: parseMemories(components.PlayerMemories),
  };
}

export function readAllPlayers(serverDir: string): PlayersResult {
  const playersDir = path.join(serverDir, 'universe', 'players');
  const players: PlayerData[] = [];
  const errors: string[] = [];

  try {
    const files = fs.readdirSync(playersDir);
    for (const file of files) {
      if (!file.endsWith('.json') || file.endsWith('.bak')) continue;
      try {
        const content = fs.readFileSync(path.join(playersDir, file), 'utf-8');
        const data = JSON.parse(content);
        players.push(parsePlayer(file, data));
      } catch (err) {
        const msg = err instanceof SyntaxError
          ? `Failed to parse ${file}: ${err.message}`
          : `Failed to read ${file}: ${(err as Error).message}`;
        errors.push(msg);
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      errors.push('Players directory not found: Server/universe/players/');
    } else {
      errors.push(`Failed to read players directory: ${(err as Error).message}`);
    }
  }

  return { data: players, errors };
}

export function readPlayerMemories(serverDir: string): Record<string, PlayerData['memories']> {
  const { data: players } = readAllPlayers(serverDir);
  const result: Record<string, PlayerData['memories']> = {};
  for (const player of players) {
    if (player.memories.length > 0) {
      result[player.name] = player.memories;
    }
  }
  return result;
}
