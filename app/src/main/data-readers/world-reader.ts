import fs from 'fs';
import path from 'path';
import { formatTranslationKey } from '../../shared/translation';

export interface RegionInfo {
  x: number;
  z: number;
  sizeBytes: number;
  lastModified: number;
}

export interface MapMarker {
  id: string;
  name: string;
  icon: string;
  position: { x: number; y: number; z: number };
}

export interface WorldMapData {
  regions: RegionInfo[];
  markers: MapMarker[];
  playerPositions: { name: string; position: { x: number; y: number; z: number } }[];
  warpPositions: { name: string; position: { x: number; y: number; z: number } }[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface WorldMapResult {
  data: WorldMapData;
  errors: string[];
}

export function readWorldMap(
  serverDir: string,
  playerPositions: { name: string; position: { x: number; y: number; z: number } }[],
  warpPositions: { name: string; position: { x: number; y: number; z: number } }[]
): WorldMapResult {
  const chunksDir = path.join(serverDir, 'universe', 'worlds', 'default', 'chunks');
  const markersPath = path.join(
    serverDir,
    'universe',
    'worlds',
    'default',
    'resources',
    'BlockMapMarkers.json'
  );

  const regions: RegionInfo[] = [];
  const errors: string[] = [];
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  // Read region files
  try {
    const files = fs.readdirSync(chunksDir);
    for (const file of files) {
      if (!file.endsWith('.region.bin')) continue;
      const parts = file.split('.');
      if (parts.length < 4) continue;
      const x = parseInt(parts[0], 10);
      const z = parseInt(parts[1], 10);
      if (isNaN(x) || isNaN(z)) continue;

      try {
        const stat = fs.statSync(path.join(chunksDir, file));
        regions.push({
          x,
          z,
          sizeBytes: stat.size,
          lastModified: stat.mtimeMs,
        });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      } catch {
        // Skip files we can't stat
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      errors.push(`Failed to read chunks directory: ${(err as Error).message}`);
    }
  }

  // Read map markers
  const markers: MapMarker[] = [];
  try {
    const content = fs.readFileSync(markersPath, 'utf-8');
    const data = JSON.parse(content);
    const markersObj = data.Markers ?? {};
    for (const [id, marker] of Object.entries(markersObj)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = marker as any;
      markers.push({
        id,
        name: formatTranslationKey(m.Name ?? ''),
        icon: m.Icon ?? '',
        position: {
          x: m.Position?.X ?? 0,
          y: m.Position?.Y ?? 0,
          z: m.Position?.Z ?? 0,
        },
      });
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      errors.push(`Failed to read BlockMapMarkers.json: ${(err as Error).message}`);
    }
  }

  if (regions.length === 0) {
    minX = maxX = minZ = maxZ = 0;
  }

  return {
    data: {
      regions,
      markers,
      playerPositions,
      warpPositions,
      bounds: { minX, maxX, minZ, maxZ },
    },
    errors,
  };
}
