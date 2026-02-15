# Universe Store Module

**Source:** `app/src/renderer/stores/universe-store.ts`

Zustand store for game data: players, warps, and world map information.

---

## Overview

The Universe Store manages all game world data in the renderer process. It provides fetch actions for loading data from the main process and subscribes to refresh events for automatic updates when underlying data changes.

**Key responsibilities:**

- Store player data (inventory, stats, position, gear)
- Store warp points (teleport locations)
- Store world map data (regions, markers, bounds)
- Track loading state per data category
- Track errors per data category
- Auto-refresh on `data:refresh` IPC events

---

## Store Interface

```typescript
interface UniverseStore {
  // State
  players: PlayerData[];
  warps: Warp[];
  worldMap: WorldMapData | null;
  loading: Record<string, boolean>;
  errors: Record<string, string[]>;

  // Actions
  fetchPlayers: () => Promise<void>;
  fetchWarps: () => Promise<void>;
  fetchWorldMap: () => Promise<void>;
  initRefreshListener: () => () => void;
}
```

---

## State Shape

### players

```typescript
players: PlayerData[]
```

| Type | Initial Value | Description |
|------|---------------|-------------|
| `PlayerData[]` | `[]` | Array of all player data |

Each `PlayerData` object contains:

```typescript
interface PlayerData {
  uuid: string;              // Player unique identifier
  name: string;              // Display name
  gameMode: string;          // Current game mode
  world: string;             // Current world name
  position: Position;        // x, y, z coordinates
  stats: EntityStats;        // health, stamina, mana, oxygen
  inventory: Inventory;      // storage, hotbar, backpack, utility, tool
  armor: ArmorSlots;         // [head, chest, hands, legs]
  discoveredZones: string[]; // Zone IDs player has visited
  respawnPoints: RespawnPoint[];  // Bed/spawn locations
  deathMarkers: DeathMarker[];    // Death locations
}
```

### warps

```typescript
warps: Warp[]
```

| Type | Initial Value | Description |
|------|---------------|-------------|
| `Warp[]` | `[]` | Array of all warp points |

Each `Warp` object contains:

```typescript
interface Warp {
  id: string;        // Warp identifier (display name)
  world: string;     // World containing the warp
  creator: string;   // Player who created the warp
  createdAt: number; // Unix timestamp (ms)
  position: Position; // x, y, z coordinates
  yaw: number;       // Player facing direction
}
```

### worldMap

```typescript
worldMap: WorldMapData | null
```

| Type | Initial Value | Description |
|------|---------------|-------------|
| `WorldMapData \| null` | `null` | World map data or null if not loaded |

The `WorldMapData` object contains:

```typescript
interface WorldMapData {
  regions: RegionInfo[];      // Loaded region chunks
  markers: MapMarker[];       // Points of interest
  playerPositions: { name: string; position: Position }[];  // Player locations
  warpPositions: { name: string; position: Position }[];    // Warp locations
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}
```

### loading

```typescript
loading: Record<string, boolean>
```

| Type | Initial Value | Keys |
|------|---------------|------|
| `Record<string, boolean>` | `{}` | `'players'`, `'warps'`, `'worldMap'` |

Loading state per data category. True while fetch is in progress.

**Example:**

```typescript
{
  players: true,   // Currently fetching players
  warps: false,    // Warps not loading
  worldMap: false  // World map not loading
}
```

### errors

```typescript
errors: Record<string, string[]>
```

| Type | Initial Value | Keys |
|------|---------------|------|
| `Record<string, string[]>` | `{}` | `'players'`, `'warps'`, `'worldMap'` |

Error messages per data category. Empty array if no errors.

**Example:**

```typescript
{
  players: [],                           // No errors
  warps: ['Failed to read warps.json'],  // One error
  worldMap: []                           // No errors
}
```

---

## Actions

### fetchPlayers()

```typescript
fetchPlayers: () => Promise<void>
```

Fetch all player data from the main process.

**Behavior:**
1. Set `loading.players = true`
2. Call `getPlayers()` from ipc-client
3. Report any errors as toast warnings
4. Update `players`, `errors.players`, `loading.players`
5. On exception, store error message in `errors.players`

**Example:**

```typescript
const { fetchPlayers, players, loading } = useUniverseStore();

await fetchPlayers();
console.log(players); // PlayerData[]
console.log(loading.players); // false
```

### fetchWarps()

```typescript
fetchWarps: () => Promise<void>
```

Fetch all warp points from the main process.

**Behavior:**
1. Set `loading.warps = true`
2. Call `getWarps()` from ipc-client
3. Report any errors as toast warnings
4. Update `warps`, `errors.warps`, `loading.warps`
5. On exception, store error message in `errors.warps`

**Example:**

```typescript
const { fetchWarps, warps } = useUniverseStore();

await fetchWarps();
console.log(warps); // Warp[]
```

### fetchWorldMap()

```typescript
fetchWorldMap: () => Promise<void>
```

Fetch world map data from the main process.

**Behavior:**
1. Set `loading.worldMap = true`
2. Call `getWorldMap()` from ipc-client
3. Report any errors as toast warnings
4. Update `worldMap`, `errors.worldMap`, `loading.worldMap`
5. On exception, store error message in `errors.worldMap`

**Example:**

```typescript
const { fetchWorldMap, worldMap } = useUniverseStore();

await fetchWorldMap();
console.log(worldMap); // WorldMapData | null
```

### initRefreshListener()

```typescript
initRefreshListener: () => () => void
```

Initialize the `data:refresh` IPC event subscription. Returns an unsubscribe function.

**Behavior:**
- Subscribes to `data:refresh` events
- Maps category names to fetch functions
- Automatically re-fetches when data changes on disk

**Supported categories:**

| Category | Fetch Function |
|----------|----------------|
| `'players'` | `fetchPlayers()` |
| `'warps'` | `fetchWarps()` |
| `'worldMap'` | `fetchWorldMap()` |

**Example:**

```typescript
const { initRefreshListener } = useUniverseStore();

useEffect(() => {
  const cleanup = initRefreshListener();
  return cleanup;
}, [initRefreshListener]);
```

---

## IPC Event Subscription

### data:refresh

Received when file system changes are detected in the server data directories.

**Event payload:**

```typescript
{ category: string }
```

**Behavior:**

```typescript
const refreshMap: Record<string, () => Promise<void>> = {
  players: get().fetchPlayers,
  warps: get().fetchWarps,
  worldMap: get().fetchWorldMap,
};

return onDataRefresh((category) => {
  const fetcher = refreshMap[category];
  if (fetcher) {
    fetcher().catch(console.error);
  }
});
```

**When is this event emitted?**

The main process uses `chokidar` to watch:
- `Server/universe/players/*.json` - triggers `'players'` refresh
- `Server/universe/warps.json` - triggers `'warps'` refresh
- `Server/universe/worlds/*/regions/` - triggers `'worldMap'` refresh

---

## Error Handling Patterns

### Partial Success

The `DataResult<T>` pattern supports partial success. Errors are surfaced but data is still stored:

```typescript
fetchPlayers: async () => {
  set((s) => ({ loading: { ...s.loading, players: true } }));
  try {
    const result = await getPlayers();

    // Report errors as toast warnings
    if (result.errors.length > 0) {
      reportErrors(result.errors);
    }

    // Store data AND errors
    set((s) => ({
      players: result.data,           // May be partial
      errors: { ...s.errors, players: result.errors },
      loading: { ...s.loading, players: false },
    }));
  } catch (err) {
    // Complete failure
    const msg = String(err);
    set((s) => ({
      errors: { ...s.errors, players: [msg] },
      loading: { ...s.loading, players: false },
    }));
  }
}
```

### Toast Notifications

The `reportErrors()` helper displays each error as a warning toast:

```typescript
function reportErrors(errors: string[]): void {
  const addToast = useToastStore.getState().addToast;
  for (const err of errors) {
    addToast(err, 'warning');
  }
}
```

---

## Cleanup Pattern

The `initRefreshListener()` function returns an unsubscribe function:

```typescript
initRefreshListener: () => {
  const refreshMap: Record<string, () => Promise<void>> = {
    players: get().fetchPlayers,
    warps: get().fetchWarps,
    worldMap: get().fetchWorldMap,
  };

  return onDataRefresh((category) => {
    const fetcher = refreshMap[category];
    if (fetcher) {
      fetcher().catch(console.error);
    }
  });
}
```

**Integration pattern:**

```typescript
// In App.tsx or page component
useEffect(() => {
  const cleanup = useUniverseStore.getState().initRefreshListener();
  return cleanup;
}, []);
```

---

## Page Integration Examples

### Players Page

```typescript
// pages/Players.tsx
import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import { PlayerCard } from '../components/players/PlayerCard';

export function Players() {
  const players = useUniverseStore((s) => s.players);
  const loading = useUniverseStore((s) => s.loading);
  const errors = useUniverseStore((s) => s.errors);
  const fetchPlayers = useUniverseStore((s) => s.fetchPlayers);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  if (loading.players) {
    return <div>Loading players...</div>;
  }

  if (errors.players?.length > 0) {
    return (
      <div>
        <p>Some errors occurred:</p>
        <ul>
          {errors.players.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {players.map((player) => (
        <PlayerCard key={player.uuid} player={player} />
      ))}
    </div>
  );
}
```

### Warps Page

```typescript
// pages/Warps.tsx
import { useEffect, useState } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import { WarpCard } from '../components/warps/WarpCard';

export function Warps() {
  const warps = useUniverseStore((s) => s.warps);
  const loading = useUniverseStore((s) => s.loading);
  const fetchWarps = useUniverseStore((s) => s.fetchWarps);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  useEffect(() => {
    fetchWarps();
  }, [fetchWarps]);

  const sortedWarps = [...warps].sort((a, b) => {
    if (sortBy === 'name') return a.id.localeCompare(b.id);
    return b.createdAt - a.createdAt;
  });

  if (loading.warps) {
    return <div>Loading warps...</div>;
  }

  return (
    <div>
      <div>
        <button onClick={() => setSortBy('name')}>Sort by Name</button>
        <button onClick={() => setSortBy('date')}>Sort by Date</button>
      </div>
      {sortedWarps.map((warp) => (
        <WarpCard key={warp.id} warp={warp} />
      ))}
    </div>
  );
}
```

### Dashboard Integration

```typescript
// pages/Dashboard.tsx
import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import { useServerStore } from '../stores/server-store';

export function Dashboard() {
  const initServer = useServerStore((s) => s.init);
  const initRefresh = useUniverseStore((s) => s.initRefreshListener);
  const fetchPlayers = useUniverseStore((s) => s.fetchPlayers);
  const fetchWarps = useUniverseStore((s) => s.fetchWarps);

  useEffect(() => {
    const cleanupServer = initServer();
    const cleanupRefresh = initRefresh();

    // Initial data load
    fetchPlayers();
    fetchWarps();

    return () => {
      cleanupServer();
      cleanupRefresh();
    };
  }, [initServer, initRefresh, fetchPlayers, fetchWarps]);

  // ... render dashboard
}
```

---

## State Flow Diagram

```
Page mounts
     |
     v
initRefreshListener() called
     |
     v
fetchPlayers() / fetchWarps() / fetchWorldMap()
     |
     v
loading[category] = true
     |
     v
IPC invoke to main process
     |
     v
Main process reads data files
     |
     v
DataResult<T> returned
     |
     v
reportErrors() shows toasts (if any)
     |
     v
State updated: data, errors, loading = false
     |
     v
                    ... time passes ...
     |
     v
File change detected (chokidar)
     |
     v
data:refresh event ('players' | 'warps' | 'worldMap')
     |
     v
Matching fetch function called
     |
     v
State updated with fresh data
```

---

## Related Modules

- **IPC Client:** `services/ipc-client.ts` (getPlayers, getWarps, getWorldMap, onDataRefresh)
- **Types:** `types/player.ts`, `types/warp.ts`, `types/world.ts`
- **Toast Store:** `stores/toast-store.ts` (error notifications)
- **Pages:** `pages/Players.tsx`, `pages/Warps.tsx`, `pages/Dashboard.tsx`
- **Components:** `components/players/`, `components/warps/`
