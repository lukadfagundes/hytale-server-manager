export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface StatValue {
  current: number;
  modifiers: Record<string, number>;
}

export interface EntityStats {
  health: StatValue;
  stamina: StatValue;
  mana: StatValue;
  oxygen: StatValue;
}

export interface InventorySlot {
  id: string;
  quantity: number;
  durability: number;
  maxDurability: number;
}

export interface Inventory {
  storage: Record<number, InventorySlot>;
  hotbar: Record<number, InventorySlot>;
  backpack: Record<number, InventorySlot>;
  utility: Record<number, InventorySlot>;
  tool: Record<number, InventorySlot>;
  activeHotbarSlot: number;
}

export type ArmorSlots = [
  InventorySlot | null, // Head
  InventorySlot | null, // Chest
  InventorySlot | null, // Hands
  InventorySlot | null, // Legs
];

export interface RespawnPoint {
  position: Position;
  world: string;
}

export interface DeathMarker {
  position: Position;
  day: number;
}

export interface PlayerData {
  uuid: string;
  name: string;
  gameMode: string;
  world: string;
  position: Position;
  stats: EntityStats;
  inventory: Inventory;
  armor: ArmorSlots;
  discoveredZones: string[];
  respawnPoints: RespawnPoint[];
  deathMarkers: DeathMarker[];
}
