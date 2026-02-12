import fs from 'fs';
import path from 'path';

export interface ModInfo {
  name: string;
  enabled: boolean;
  path: string;
  hasStateFile: boolean;
  sizeBytes: number;
}

function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        size += fs.statSync(fullPath).size;
      } else if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return size;
}

function scanModsDir(modsDir: string, enabled: boolean): ModInfo[] {
  const mods: ModInfo[] = [];

  try {
    const entries = fs.readdirSync(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const modPath = path.join(modsDir, entry.name);

      // Check for a state JSON file inside the mod directory
      let hasStateFile = false;
      try {
        const modFiles = fs.readdirSync(modPath);
        hasStateFile = modFiles.some(f => f.endsWith('.json'));
      } catch {
        // Can't read mod directory contents
      }

      mods.push({
        name: entry.name,
        enabled,
        path: modPath,
        hasStateFile,
        sizeBytes: getDirSize(modPath),
      });
    }
  } catch {
    // Directory may not exist
  }

  return mods;
}

export function readAllMods(serverDir: string, disabledModsDir: string): ModInfo[] {
  const enabledDir = path.join(serverDir, 'mods');
  const enabledMods = scanModsDir(enabledDir, true);
  const disabledMods = scanModsDir(disabledModsDir, false);
  return [...enabledMods, ...disabledMods];
}
