# Type Definitions

TypeScript interfaces used across the Hytale Server Manager renderer. These types define the data shapes that flow from the server's on-disk JSON files through the main process data readers, over IPC, and into the React frontend.

**Source directory:** `app/src/renderer/types/`

> **Note:** Throughout this document, `Server/` refers to the user's Hytale dedicated server installation directory -- the folder selected during the app's first-run setup, not a directory in this repository. All paths like `Server/universe/` are relative to that user-selected location.

## Data Flow Overview

```
Server/universe/*.json         (on-disk, PascalCase keys)
       |
  data-readers/*.ts            (main process, parses & normalizes to camelCase)
       |
  IPC invoke response          (serialized over context bridge)
       |
  renderer types/*.ts          (renderer process, typed interfaces)
       |
  Zustand stores + components  (consumed by UI)
```

The main process data readers (`app/src/main/data-readers/`) read raw JSON files from the `Server/universe/` directory, normalize the PascalCase keys used by the Hytale server into camelCase, and return typed objects. These objects are serialized over IPC and consumed by the renderer, which defines its own matching interfaces in `app/src/renderer/types/`.

---

## server.ts

**Source:** `app/src/renderer/types/server.ts`

### `ServerStatus` (type alias)

A union type representing the four possible states of the Hytale server process.

```typescript
export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';
```

| Value | Description |
|-------|-------------|
| `stopped` | Server process is not running |
| `starting` | Server process has been spawned but is not yet accepting connections |
| `running` | Server is fully operational |
| `stopping` | A stop command has been sent; waiting for graceful shutdown |

**Used by:** `server-store.ts`, `ServerToggle`, `ServerStatus` badge, `ModManager` (disables toggles when not `stopped`)

### `LogEntry` (interface)

A single line of server console output captured from the spawned process.

| Field | Type | Description |
|-------|------|-------------|
| `line` | `string` | The text content of the log line |
| `stream` | `'stdout' \| 'stderr'` | Which output stream produced this line |
| `timestamp` | `number` | Unix timestamp (milliseconds) when the line was captured |

**Used by:** `server-store.ts` (log buffer, max 1000 entries), `LogPanel` component

---

## player.ts

**Source:** `app/src/renderer/types/player.ts`
**Data reader:** `app/src/main/data-readers/player-reader.ts`
**On-disk source:** `Server/universe/players/{uuid}.json`

### `Position` (interface)

3D coordinate used across player positions, respawn points, death markers, warps, and map markers.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | X coordinate (East-West axis) |
| `y` | `number` | Y coordinate (vertical axis) |
| `z` | `number` | Z coordinate (North-South axis) |

### `StatValue` (interface)

A single stat (health, stamina, mana, or oxygen) with its current value and active modifiers.

| Field | Type | Description |
|-------|------|-------------|
| `current` | `number` | Current value of the stat |
| `modifiers` | `Record<string, number>` | Named modifiers affecting this stat (e.g., potion effects, equipment bonuses). Keys are modifier names, values are amounts. |

### `EntityStats` (interface)

The four tracked stats for a player entity.

| Field | Type | Description |
|-------|------|-------------|
| `health` | `StatValue` | Player health |
| `stamina` | `StatValue` | Player stamina |
| `mana` | `StatValue` | Player mana |
| `oxygen` | `StatValue` | Player oxygen (underwater breathing) |

### `InventorySlot` (interface)

A single item occupying an inventory or equipment slot.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Hytale item identifier (e.g., `Weapon_Daggers_Adamantite`, `Armor_Cobalt_Head`) |
| `quantity` | `number` | Stack count |
| `durability` | `number` | Current durability value |
| `maxDurability` | `number` | Maximum durability value (0 for non-durable items) |

### `Inventory` (interface)

Complete player inventory organized into named sections. Each section is a record mapping slot index to the item in that slot.

| Field | Type | Description |
|-------|------|-------------|
| `storage` | `Record<number, InventorySlot>` | Main storage slots (up to 36 slots) |
| `hotbar` | `Record<number, InventorySlot>` | Quick-access hotbar (9 slots) |
| `backpack` | `Record<number, InventorySlot>` | Backpack expansion (9 slots) |
| `utility` | `Record<number, InventorySlot>` | Utility item slots |
| `tool` | `Record<number, InventorySlot>` | Tool slots |
| `activeHotbarSlot` | `number` | Index of the currently selected hotbar slot |

### `ArmorSlots` (type alias)

A fixed-length tuple of 4 armor slots, each either an `InventorySlot` or `null` if empty.

```typescript
export type ArmorSlots = [
  InventorySlot | null, // Head  (index 0)
  InventorySlot | null, // Chest (index 1)
  InventorySlot | null, // Hands (index 2)
  InventorySlot | null, // Legs  (index 3)
];
```

### `RespawnPoint` (interface)

A saved respawn location for the player.

| Field | Type | Description |
|-------|------|-------------|
| `position` | `Position` | Coordinates of the respawn point |
| `world` | `string` | Name of the world containing this respawn point |

### `DeathMarker` (interface)

Records where and when a player died.

| Field | Type | Description |
|-------|------|-------------|
| `position` | `Position` | Coordinates of the death location |
| `day` | `number` | In-game day number when the death occurred |

### `PlayerData` (interface)

Complete player data as returned by the `data:players` IPC channel.

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | Player UUID (derived from the JSON filename) |
| `name` | `string` | Display name (from `Components.Nameplate.Text`) |
| `gameMode` | `string` | Current game mode (e.g., `Survival`, `Creative`) |
| `world` | `string` | Name of the world the player is currently in |
| `position` | `Position` | Player's current 3D coordinates |
| `stats` | `EntityStats` | Health, stamina, mana, and oxygen values |
| `inventory` | `Inventory` | All inventory sections |
| `armor` | `ArmorSlots` | Equipped armor (Head, Chest, Hands, Legs) |
| `discoveredZones` | `string[]` | List of zone names the player has discovered |
| `respawnPoints` | `RespawnPoint[]` | Saved respawn locations across worlds |
| `deathMarkers` | `DeathMarker[]` | Death location history across worlds |

---

## warp.ts

**Source:** `app/src/renderer/types/warp.ts`
**Data reader:** `app/src/main/data-readers/warp-reader.ts`
**On-disk source:** `Server/universe/warps.json`

### `Warp` (interface)

A named teleport destination defined on the server. Imports `Position` from `player.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Warp identifier (from `Id` in the JSON) |
| `world` | `string` | World name where the warp is located |
| `creator` | `string` | Name of the player who created the warp |
| `createdAt` | `number` | Creation timestamp |
| `position` | `Position` | 3D coordinates of the warp destination |
| `yaw` | `number` | Player facing direction (rotation around Y axis) when using the warp |

**Note:** The renderer type defines `createdAt` as `number`, while the data reader maps the on-disk `CreationDate` string field to `createdAt`. The renderer component (`WarpCard`) formats this for display using `formatDate()`.

---

## world.ts

**Source:** `app/src/renderer/types/world.ts`
**Data reader:** `app/src/main/data-readers/world-reader.ts`
**On-disk sources:**
- Region files: `Server/universe/worlds/default/chunks/*.region.bin`
- Map markers: `Server/universe/worlds/default/resources/BlockMapMarkers.json`

### `RegionInfo` (interface)

Metadata about a single region file (binary chunk data). Imports `Position` from `player.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Region X coordinate (parsed from filename, e.g., `0.0.region.bin` -> x=0) |
| `z` | `number` | Region Z coordinate (parsed from filename) |
| `sizeBytes` | `number` | File size in bytes |
| `lastModified` | `number` | File modification time in milliseconds (from `fs.statSync().mtimeMs`) |

### `MapMarker` (interface)

A point of interest on the world map, read from `BlockMapMarkers.json`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Marker identifier (the key in the `Markers` object) |
| `name` | `string` | Readable name (translated from Hytale i18n key via `formatTranslationKey()`) |
| `icon` | `string` | Icon identifier used to load the marker image via `getMapMarkerPath()` |
| `position` | `Position` | 3D coordinates of the marker |

### `WorldMapData` (interface)

Aggregated world map data returned by the `data:world-map` IPC channel. Combines region metadata, map markers, and positional data from players and warps.

| Field | Type | Description |
|-------|------|-------------|
| `regions` | `RegionInfo[]` | All region files in the default world |
| `markers` | `MapMarker[]` | Map markers from `BlockMapMarkers.json` |
| `playerPositions` | `{ name: string; position: Position }[]` | Current positions of all players (injected by `ipc-handlers.ts`) |
| `warpPositions` | `{ name: string; position: Position }[]` | Positions of warps in the `default` world (injected by `ipc-handlers.ts`) |
| `bounds` | `{ minX, maxX, minZ, maxZ: number }` | Bounding box of all region coordinates |

**Note:** The `playerPositions` and `warpPositions` arrays are not read from `world-reader.ts` directly. Instead, `ipc-handlers.ts` reads players and warps separately, filters warps to the `default` world, and passes the position arrays into `readWorldMap()`.

---

## mod.ts

**Source:** `app/src/renderer/types/mod.ts`
**Data reader:** `app/src/main/data-readers/mod-reader.ts`
**On-disk sources:**
- Enabled mods: `Server/mods/{mod-name}/` (directories)
- Disabled mods: `disabled-mods/{mod-name}/` (directories, outside `Server/`)

### `ModInfo` (interface)

Information about a single server mod.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Mod directory name (e.g., `Hytale_Shop`) |
| `enabled` | `boolean` | `true` if the mod is in `Server/mods/`, `false` if in `disabled-mods/` |
| `path` | `string` | Absolute filesystem path to the mod directory |
| `hasStateFile` | `boolean` | `true` if the mod directory contains at least one `.json` file |
| `sizeBytes` | `number` | Total size of the mod directory in bytes (recursive) |

**Toggling behavior:** When a mod is toggled, `mod-manager.ts` moves the entire mod directory between `Server/mods/` and `disabled-mods/`. The `enabled` field reflects the current location.

---

## Data Shape Examples

This section shows the raw JSON structure as it appears in the server data files alongside the TypeScript interface it maps to. The data readers in `app/src/main/data-readers/` transform PascalCase keys to camelCase.

### Player JSON (`Server/universe/players/{uuid}.json`)

```json
{
  "Components": {
    "Nameplate": { "Text": "PlayerOne" },
    "Transform": {
      "Position": { "X": 1024.5, "Y": 72.0, "Z": -512.3 }
    },
    "EntityStats": {
      "Stats": {
        "Health": {
          "Value": 85.0,
          "Modifiers": {
            "ArmorBonus": { "Amount": 10 }
          }
        },
        "Stamina": { "Value": 100.0, "Modifiers": {} },
        "Mana": { "Value": 50.0, "Modifiers": {} },
        "Oxygen": { "Value": 100.0, "Modifiers": {} }
      }
    },
    "Player": {
      "GameMode": "Survival",
      "Inventory": {
        "HotBar": {
          "Items": {
            "0": { "Id": "Weapon_Daggers_Adamantite", "Quantity": 1, "Durability": 150, "MaxDurability": 200 },
            "3": { "Id": "Food_Apple", "Quantity": 12, "Durability": 0, "MaxDurability": 0 }
          }
        },
        "Storage": { "Items": {} },
        "Backpack": { "Items": {} },
        "Utility": { "Items": {} },
        "Tool": { "Items": {} },
        "ActiveHotbarSlot": 0,
        "Armor": {
          "Items": {
            "0": { "Id": "Armor_Cobalt_Head", "Quantity": 1, "Durability": 80, "MaxDurability": 100 },
            "1": null,
            "2": null,
            "3": { "Id": "Armor_Cobalt_Legs", "Quantity": 1, "Durability": 95, "MaxDurability": 120 }
          }
        }
      },
      "PlayerData": {
        "World": "default",
        "DiscoveredZones": ["server.map.region.Zone3_Tier1"],
        "PerWorldData": {
          "default": {
            "RespawnPoints": [
              { "RespawnPosition": { "X": 1000, "Y": 65, "Z": -500 } }
            ],
            "DeathPositions": [
              { "Position": { "X": 980, "Y": 40, "Z": -510 }, "Day": 12 }
            ]
          }
        }
      }
    },
    "PlayerMemories": {
      "Memories": [
        {
          "NPCRole": "Goblin_Hermit",
          "TranslationKey": "server.npcRoles.Goblin_Hermit.name",
          "FoundLocationNameKey": "server.map.region.Zone3_Tier1",
          "CapturedTimestamp": 1707500000000,
          "IsMemoriesNameOverridden": false
        }
      ]
    }
  }
}
```

**Maps to:** `PlayerData` interface (the data reader also produces a `memories` array from `PlayerMemories`, which is present in the main-process `PlayerData` type but not in the renderer type)

### Warps JSON (`Server/universe/warps.json`)

```json
{
  "Warps": [
    {
      "Id": "spawn",
      "World": "default",
      "Creator": "PlayerOne",
      "CreationDate": "2026-02-10T14:30:00Z",
      "X": 1024.0,
      "Y": 65.0,
      "Z": -500.0,
      "Yaw": 90.0
    },
    {
      "Id": "dungeon_entrance",
      "World": "default",
      "Creator": "PlayerTwo",
      "CreationDate": "2026-02-11T09:15:00Z",
      "X": 2048.0,
      "Y": 30.0,
      "Z": -1024.0,
      "Yaw": 180.0
    }
  ]
}
```

**Maps to:** `Warp` interface. Note that position coordinates are stored as top-level `X`, `Y`, `Z` fields (not nested under a `Position` object). The data reader combines them into a `position: { x, y, z }` object.

### BlockMapMarkers JSON (`Server/universe/worlds/default/resources/BlockMapMarkers.json`)

```json
{
  "Markers": {
    "marker_cave_01": {
      "Name": "server.map.markers.Cave_Entrance.name",
      "Icon": "Cave",
      "Position": { "X": 1500.0, "Y": 45.0, "Z": -800.0 }
    },
    "marker_village_01": {
      "Name": "server.map.markers.Village_Square.name",
      "Icon": "Village",
      "Position": { "X": 900.0, "Y": 70.0, "Z": -300.0 }
    }
  }
}
```

**Maps to:** `MapMarker` interface. The `Name` field is an i18n translation key that the data reader converts to a readable string via `formatTranslationKey()` (e.g., `"server.map.markers.Cave_Entrance.name"` becomes `"Cave Entrance"`).

### Region Files (`Server/universe/worlds/default/chunks/`)

Region files are binary (`.region.bin`) and are not parsed for content. The data reader only reads filesystem metadata:

```
0.0.region.bin     -> { x: 0, z: 0, sizeBytes: 524288, lastModified: 1707500000000 }
0.-1.region.bin    -> { x: 0, z: -1, sizeBytes: 262144, lastModified: 1707490000000 }
1.0.region.bin     -> { x: 1, z: 0, sizeBytes: 131072, lastModified: 1707480000000 }
```

**Maps to:** `RegionInfo` interface. The filename format is `{x}.{z}.region.bin`.

### Mod Directory Structure

Mods are directories, not individual files. The data reader scans for subdirectories and checks for `.json` state files:

```
Server/mods/
  Hytale_Shop/           -> { name: "Hytale_Shop", enabled: true, hasStateFile: true, sizeBytes: 45056 }
    shop_config.json
    shop_data.bin

disabled-mods/
  ExampleMod/            -> { name: "ExampleMod", enabled: false, hasStateFile: false, sizeBytes: 8192 }
    plugin.dll
```

**Maps to:** `ModInfo` interface.
