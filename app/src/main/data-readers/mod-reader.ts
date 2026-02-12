import fs from 'fs';
import path from 'path';

export interface ModInfo {
  name: string;
  enabled: boolean;
  path: string;
  hasStateFile: boolean;
  sizeBytes: number;
}

export interface ModsResult {
  data: ModInfo[];
  errors: string[];
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

function scanModsDir(modsDir: string, enabled: boolean): { mods: ModInfo[]; error: string | null } {
  const mods: ModInfo[] = [];

  try {
    const entries = fs.readdirSync(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const modPath = path.join(modsDir, entry.name);

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
    return { mods, error: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { mods: [], error: null }; // Directory not existing is normal
    }
    return { mods: [], error: `Failed to read mods directory ${modsDir}: ${(err as Error).message}` };
  }
}

export function readAllMods(serverDir: string, disabledModsDir: string): ModsResult {
  const enabledDir = path.join(serverDir, 'mods');
  const enabled = scanModsDir(enabledDir, true);
  const disabled = scanModsDir(disabledModsDir, false);

  const errors: string[] = [];
  if (enabled.error) errors.push(enabled.error);
  if (disabled.error) errors.push(disabled.error);

  return { data: [...enabled.mods, ...disabled.mods], errors };
}
