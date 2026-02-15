# Asset Extractor Module

**Module:** `app/src/main/asset-extractor.ts`
**Purpose:** Assets.zip extraction, icon map generation, and cache invalidation
**Process:** Electron Main Process (Node.js)

---

## Overview

The `asset-extractor` module extracts game assets (item icons, NPC portraits, map markers, memory UI elements) from the Hytale `Assets.zip` archive into a user data cache directory. It builds a mapping file (`item-icon-map.json`) that resolves item IDs to their icon filenames, enables stamp-based cache invalidation to skip re-extraction when assets haven't changed, and implements a concurrency guard to prevent parallel extractions.

Extracted assets are served to the renderer via the custom `asset://` protocol registered in `index.ts`.

---

## Exported Functions

### `extractAssets(serverDir: string): Promise<ExtractionResult>`

Extracts assets from `Assets.zip` to the cache directory.

**Parameters:**
- `serverDir: string` - Absolute path to the Server directory

**Returns:** `Promise<ExtractionResult>`

```typescript
interface ExtractionResult {
  success: boolean;
  error?: string;       // Present when success is false
  totalFiles?: number;  // Number of files extracted (0 if cache was up-to-date)
}
```

**Behavior:**
1. Returns existing in-progress extraction if one is running (concurrency guard)
2. Locates `Assets.zip` at `<serverDir>/../Assets.zip`
3. Returns early with `{ success: false, error: 'Assets.zip not found' }` if missing
4. Checks if cache is up-to-date via stamp file; returns `{ success: true, totalFiles: 0 }` if so
5. Creates cache directory structure
6. Iterates extraction rules, extracting matching PNG files
7. Builds item icon map from `Server/Item/Items/*.json` entries in the ZIP
8. Writes stamp file with ZIP mtime
9. Returns extraction result

**Example:**
```typescript
import { extractAssets } from './asset-extractor';

const result = await extractAssets('/path/to/Server');

if (result.success) {
  console.log(`Extracted ${result.totalFiles} files`);
} else {
  console.error(`Extraction failed: ${result.error}`);
}
```

---

### `areAssetsCached(): boolean`

Checks if assets have been previously cached.

**Returns:** `boolean` - `true` if both stamp file and icon map exist

**Behavior:**
1. Checks for existence of `.assets-stamp` in cache directory
2. Checks for existence of `item-icon-map.json` in cache directory
3. Returns `true` only if both files exist

**Note:** This does not validate cache freshness. Use `extractAssets()` for freshness check and re-extraction.

**Example:**
```typescript
import { areAssetsCached } from './asset-extractor';

if (areAssetsCached()) {
  console.log('Assets available from cache');
} else {
  console.log('Assets need extraction');
}
```

---

### `getAssetCacheDir(): string`

Returns the absolute path to the asset cache directory.

**Returns:** `string` - Path to `<userData>/asset-cache/`

**Example:**
```typescript
import { getAssetCacheDir } from './asset-extractor';

const cacheDir = getAssetCacheDir();
// e.g., "C:/Users/user/AppData/Roaming/hytale-server-manager/asset-cache"
```

---

## Extraction Rules

The module extracts assets matching these prefix/subdirectory rules:

| # | ZIP Prefix | Output Subdirectory | Content |
|---|------------|---------------------|---------|
| 1 | `Common/Icons/ItemsGenerated/` | `items/` | Auto-generated item icons |
| 2 | `Common/Icons/Items/EditorTools/` | `items/` | Editor tool icons |
| 3 | `Common/UI/Custom/Pages/Memories/npcs/` | `npcs/` | NPC portrait images |
| 4 | `Common/UI/WorldMap/MapMarkers/` | `map-markers/` | Map marker icons |
| 5 | `Common/UI/Custom/Pages/Memories/Tiles/` | `memory-ui/` | Memory UI tile graphics |
| 6 | `Common/UI/Custom/Pages/Memories/categories/` | `memory-ui/categories/` | Memory category icons |

**File Filter:** Only `.png` files (case-insensitive) are extracted.

---

## Cache Directory Structure

```
<userData>/asset-cache/
  ├── .assets-stamp           # ZIP mtime for cache invalidation
  ├── item-icon-map.json      # Item ID -> icon filename mapping
  ├── items/                  # Item icons
  │   ├── Iron_Sword.png
  │   └── ...
  ├── npcs/                   # NPC portraits
  │   └── ...
  ├── map-markers/            # Map marker icons
  │   └── ...
  └── memory-ui/              # Memory UI assets
      ├── categories/
      │   └── ...
      └── ...
```

---

## Icon Map Generation

The `buildItemIconMap()` function creates a mapping from item IDs to icon filenames for items where they differ.

**Process:**
1. Iterates all entries in the ZIP under `Server/Item/Items/*.json`
2. Parses each JSON file to extract the `Icon` property
3. If `Icon` basename differs from item ID, adds to map
4. Writes `item-icon-map.json` to cache directory

**Map Structure:**
```json
{
  "item_id_1": "icon_filename_1",
  "item_id_2": "icon_filename_2"
}
```

**Use Case:** When rendering an item icon, first check `item-icon-map.json` for a custom mapping. If not found, assume icon filename matches item ID.

**Example Lookup:**
```typescript
const iconMap = JSON.parse(fs.readFileSync('asset-cache/item-icon-map.json'));
const itemId = 'Iron_Sword';
const iconFile = iconMap[itemId] || itemId;
// iconFile: "Iron_Sword" or custom mapping
```

---

## Stamp-Based Cache Invalidation

The module uses a stamp file to determine if re-extraction is needed.

**Stamp File:** `.assets-stamp` in cache directory

**Contents:** ZIP file's `mtimeMs` (modification time in milliseconds) as a string

**Validation Logic:**
```typescript
function isUpToDate(zipPath: string): boolean {
  const stampPath = path.join(cacheDir, '.assets-stamp');
  const iconMapPath = path.join(cacheDir, 'item-icon-map.json');

  const zipMtime = String(fs.statSync(zipPath).mtimeMs);
  const stamp = fs.readFileSync(stampPath, 'utf-8').trim();

  // Stamp must match current ZIP mtime
  if (stamp !== zipMtime) return false;

  // Icon map must exist and not be empty
  const mapContent = fs.readFileSync(iconMapPath, 'utf-8').trim();
  return mapContent.length > 2; // more than just "{}"
}
```

**Invalidation Triggers:**
- ZIP file modified (mtime changed)
- Stamp file missing or corrupted
- Icon map file missing or empty

---

## Concurrency Guard

Only one extraction can run at a time. Concurrent calls receive the same promise.

**Implementation:**
```typescript
let extractionInProgress: Promise<ExtractionResult> | null = null;

export async function extractAssets(serverDir: string): Promise<ExtractionResult> {
  if (extractionInProgress) {
    return extractionInProgress;
  }

  extractionInProgress = doExtract(serverDir);
  try {
    return await extractionInProgress;
  } finally {
    extractionInProgress = null;
  }
}
```

**Benefits:**
- Prevents duplicate work
- Prevents file system race conditions
- All callers receive consistent result

---

## asset:// Protocol Integration

Extracted assets are served via a custom protocol registered in `index.ts`:

**Protocol:** `asset://`

**URL Format:** `asset://<subdirectory>/<filename>`

**Examples:**
```
asset://items/Iron_Sword.png
asset://npcs/merchant.png
asset://map-markers/village.png
```

**Handler Logic:**
1. Strip `asset://` prefix
2. Normalize path (remove trailing slashes)
3. Join with `getAssetCacheDir()`
4. Serve file via `net.fetch()`
5. Return 404 Response on error

---

## Error Handling

### Extraction Errors

| Error | Cause | Result |
|-------|-------|--------|
| `Assets.zip not found` | ZIP file missing at expected location | `{ success: false, error: '...' }` |
| ZIP read error | Corrupt or locked ZIP file | `{ success: false, error: '<message>' }` |
| Write error | Permission denied or disk full | `{ success: false, error: '<message>' }` |

### Item Map Errors

Unparseable item JSON files are silently skipped during icon map generation.

### ZIP Cleanup

The ZIP file handle is always closed, even on error:
```typescript
try {
  // ... extraction logic
} catch (err) {
  try {
    await zip.close();
  } catch {
    /* ignore close errors */
  }
  return { success: false, error: (err as Error).message };
}
```

---

## Module Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CACHE_DIR_NAME` | `'asset-cache'` | Subdirectory name within userData |
| `STAMP_FILE` | `'.assets-stamp'` | Cache validation stamp filename |
| `ICON_MAP_FILE` | `'item-icon-map.json'` | Item-to-icon mapping filename |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `node-stream-zip` | Async ZIP file reading and extraction |
| `electron` | `app.getPath('userData')` for cache location |

---

## Related Modules

- **`index.ts`** - Registers `asset://` protocol handler
- **`ipc-handlers.ts`** - Exposes extraction via `ASSETS_EXTRACT` IPC handler
- **`shared/constants.ts`** - Defines `IPC.ASSETS_*` channels

---

## IPC Events

The extraction lifecycle broadcasts events to the renderer:

| Channel | When | Payload |
|---------|------|---------|
| `assets:extracting` | Extraction started | None |
| `assets:ready` | Extraction succeeded | `{ totalFiles: number }` |
| `assets:error` | Extraction failed | `{ error: string }` |

**Note:** These events are broadcast from `ipc-handlers.ts`, not from this module directly.

---

## Type Definitions

```typescript
interface ExtractionResult {
  success: boolean;
  error?: string;
  totalFiles?: number;
}

// Internal extraction rule
interface ExtractionRule {
  zipPrefix: string;
  outSubdir: string;
}
```

---

## Performance Considerations

- **Streaming extraction:** Uses `node-stream-zip` for memory-efficient extraction
- **Stamp-based caching:** Avoids re-extraction when ZIP hasn't changed
- **Concurrency guard:** Prevents duplicate extraction work
- **Selective extraction:** Only extracts PNG files matching specific prefixes

---

**Last Updated:** 2026-02-15
**Trinity Version:** 2.1.0
