import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import StreamZip from 'node-stream-zip';

const CACHE_DIR_NAME = 'asset-cache';
const STAMP_FILE = '.assets-stamp';
const ICON_MAP_FILE = 'item-icon-map.json';

const EXTRACTIONS = [
  { zipPrefix: 'Common/Icons/ItemsGenerated/', outSubdir: 'items' },
  { zipPrefix: 'Common/Icons/Items/EditorTools/', outSubdir: 'items' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/npcs/', outSubdir: 'npcs' },
  { zipPrefix: 'Common/UI/WorldMap/MapMarkers/', outSubdir: 'map-markers' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/Tiles/', outSubdir: 'memory-ui' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/categories/', outSubdir: 'memory-ui/categories' },
];

export interface ExtractionResult {
  success: boolean;
  error?: string;
  totalFiles?: number;
}

let extractionInProgress: Promise<ExtractionResult> | null = null;

export function getAssetCacheDir(): string {
  return path.join(app.getPath('userData'), CACHE_DIR_NAME);
}

export function areAssetsCached(): boolean {
  const cacheDir = getAssetCacheDir();
  const stampPath = path.join(cacheDir, STAMP_FILE);
  const iconMapPath = path.join(cacheDir, ICON_MAP_FILE);
  try {
    return fs.existsSync(stampPath) && fs.existsSync(iconMapPath);
  } catch {
    return false;
  }
}

function getAssetsZipPath(serverDir: string): string {
  return path.resolve(serverDir, '..', 'Assets.zip');
}

function isUpToDate(zipPath: string): boolean {
  const cacheDir = getAssetCacheDir();
  const stampPath = path.join(cacheDir, STAMP_FILE);
  const iconMapPath = path.join(cacheDir, ICON_MAP_FILE);
  try {
    const zipMtime = String(fs.statSync(zipPath).mtimeMs);
    const stamp = fs.readFileSync(stampPath, 'utf-8').trim();
    if (stamp !== zipMtime) return false;
    // Verify icon map exists and isn't empty — re-extract if corrupt/missing
    const mapContent = fs.readFileSync(iconMapPath, 'utf-8').trim();
    return mapContent.length > 2; // more than just "{}"
  } catch {
    return false;
  }
}

async function writeStamp(zipPath: string): Promise<void> {
  const stampPath = path.join(getAssetCacheDir(), STAMP_FILE);
  const zipMtime = String(fs.statSync(zipPath).mtimeMs);
  await fs.promises.writeFile(stampPath, zipMtime);
}

async function buildItemIconMap(
  zip: StreamZip.StreamZipAsync,
  entries: Record<string, StreamZip.ZipEntry>
): Promise<void> {
  const map: Record<string, string> = {};
  const cacheDir = getAssetCacheDir();

  for (const entry of Object.values(entries)) {
    if (!entry.name.startsWith('Server/Item/Items/') || !entry.name.endsWith('.json')) continue;

    try {
      const data = await zip.entryData(entry.name);
      const json = JSON.parse(data.toString('utf-8'));
      const icon = json.Icon;
      if (!icon) continue;

      const itemId = path.basename(entry.name, '.json');
      const iconFile = path.basename(icon, '.png');

      if (itemId !== iconFile) {
        map[itemId] = iconFile;
      }
    } catch {
      // skip unparseable item definitions
    }
  }

  await fs.promises.writeFile(path.join(cacheDir, ICON_MAP_FILE), JSON.stringify(map));
}

async function doExtract(serverDir: string): Promise<ExtractionResult> {
  const zipPath = getAssetsZipPath(serverDir);

  if (!fs.existsSync(zipPath)) {
    return { success: false, error: 'Assets.zip not found' };
  }

  if (isUpToDate(zipPath)) {
    return { success: true, totalFiles: 0 };
  }

  const cacheDir = getAssetCacheDir();
  await fs.promises.mkdir(cacheDir, { recursive: true });

  const zip = new StreamZip.async({ file: zipPath });
  let totalFiles = 0;

  try {
    const entries = await zip.entries();

    for (const { zipPrefix, outSubdir } of EXTRACTIONS) {
      const dest = path.join(cacheDir, outSubdir);
      await fs.promises.mkdir(dest, { recursive: true });

      for (const entry of Object.values(entries)) {
        if (entry.name.startsWith(zipPrefix) && entry.name.toLowerCase().endsWith('.png')) {
          const filename = path.basename(entry.name);
          if (!filename) continue;
          const data = await zip.entryData(entry.name);
          await fs.promises.writeFile(path.join(dest, filename), data);
          totalFiles++;
        }
      }
    }

    await buildItemIconMap(zip, entries);
    await zip.close();
    await writeStamp(zipPath);

    return { success: true, totalFiles };
  } catch (err) {
    try {
      await zip.close();
    } catch {
      /* ignore close errors */
    }
    return { success: false, error: (err as Error).message };
  }
}

export async function extractAssets(serverDir: string): Promise<ExtractionResult> {
  // Concurrency guard — return the in-progress promise if extraction is running
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
