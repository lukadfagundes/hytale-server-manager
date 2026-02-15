#!/usr/bin/env node
/**
 * LEGACY — Build-time asset extraction to app/public/assets/.
 *
 * The primary extraction path is now runtime via asset-extractor.ts, which
 * extracts to userData/asset-cache/ and serves files through the asset://
 * custom protocol. This script is kept for manual use during development
 * (e.g. `npm run extract-assets`) but is no longer run via predev/prebuild hooks.
 *
 * Uses node-stream-zip for memory-efficient streaming of large archives.
 * Skips extraction if Assets.zip has not changed since last run (.assets-stamp).
 *
 * Also builds item-icon-map.json — a mapping from item IDs to their actual icon
 * filenames, since ~20% of items use a different icon than their own ID.
 */

const fs = require('fs');
const path = require('path');
const StreamZip = require('node-stream-zip');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ASSETS_ZIP = path.join(PROJECT_ROOT, 'Assets.zip');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets');
const STAMP_FILE = path.join(OUTPUT_DIR, '.assets-stamp');
const ICON_MAP_FILE = path.join(OUTPUT_DIR, 'item-icon-map.json');

const EXTRACTIONS = [
  { zipPrefix: 'Common/Icons/ItemsGenerated/', outSubdir: 'items' },
  { zipPrefix: 'Common/Icons/Items/EditorTools/', outSubdir: 'items' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/npcs/', outSubdir: 'npcs' },
  { zipPrefix: 'Common/UI/WorldMap/MapMarkers/', outSubdir: 'map-markers' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/Tiles/', outSubdir: 'memory-ui' },
  { zipPrefix: 'Common/UI/Custom/Pages/Memories/categories/', outSubdir: 'memory-ui/categories' },
];

function isUpToDate() {
  try {
    const zipMtime = String(fs.statSync(ASSETS_ZIP).mtimeMs);
    const stamp = fs.readFileSync(STAMP_FILE, 'utf-8').trim();
    // Stamp must match AND icon map must exist
    return stamp === zipMtime && fs.existsSync(ICON_MAP_FILE);
  } catch {
    return false;
  }
}

function writeStamp() {
  const zipMtime = String(fs.statSync(ASSETS_ZIP).mtimeMs);
  fs.writeFileSync(STAMP_FILE, zipMtime);
}

async function buildItemIconMap(zip, entries) {
  const map = {};
  let count = 0;

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
        count++;
      }
    } catch {
      // skip unparseable item definitions
    }
  }

  fs.writeFileSync(ICON_MAP_FILE, JSON.stringify(map));
  console.log(`  item-icon-map: ${count} redirects`);
}

async function main() {
  if (!fs.existsSync(ASSETS_ZIP)) {
    console.log('[extract-assets] Assets.zip not found — skipping extraction.');
    console.log('[extract-assets] Download via Hytale launcher and place at project root.');
    process.exit(0);
  }

  if (isUpToDate()) {
    console.log('[extract-assets] Assets up-to-date — skipping.');
    return;
  }

  console.log('[extract-assets] Extracting assets from Assets.zip...');

  const zip = new StreamZip.async({ file: ASSETS_ZIP });
  const entries = await zip.entries();
  let totalFiles = 0;
  let totalBytes = 0;

  for (const { zipPrefix, outSubdir } of EXTRACTIONS) {
    const dest = path.join(OUTPUT_DIR, outSubdir);
    fs.mkdirSync(dest, { recursive: true });

    let count = 0;
    let catBytes = 0;

    for (const entry of Object.values(entries)) {
      if (entry.name.startsWith(zipPrefix) && entry.name.toLowerCase().endsWith('.png')) {
        const filename = path.basename(entry.name);
        if (!filename) continue;
        const data = await zip.entryData(entry.name);
        fs.writeFileSync(path.join(dest, filename), data);
        count++;
        catBytes += data.length;
      }
    }

    totalFiles += count;
    totalBytes += catBytes;
    console.log(`  ${outSubdir}: ${count} files (${Math.round(catBytes / 1024)} KB)`);
  }

  await buildItemIconMap(zip, entries);
  await zip.close();
  writeStamp();

  console.log(`[extract-assets] Done: ${totalFiles} files (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error('[extract-assets] Error:', err.message);
  process.exit(1);
});
