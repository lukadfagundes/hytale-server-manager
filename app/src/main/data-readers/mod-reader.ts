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

async function getDirSizeAsync(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        size += stat.size;
      } else if (entry.isDirectory()) {
        size += await getDirSizeAsync(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return size;
}

async function scanModsDir(
  modsDir: string,
  enabled: boolean
): Promise<{ mods: ModInfo[]; error: string | null }> {
  const mods: ModInfo[] = [];

  try {
    const entries = await fs.promises.readdir(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const modPath = path.join(modsDir, entry.name);

      let hasStateFile = false;
      try {
        const modFiles = await fs.promises.readdir(modPath);
        hasStateFile = modFiles.some((f) => f.endsWith('.json'));
      } catch {
        // Can't read mod directory contents
      }

      mods.push({
        name: entry.name,
        enabled,
        path: modPath,
        hasStateFile,
        sizeBytes: await getDirSizeAsync(modPath),
      });
    }
    return { mods, error: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { mods: [], error: null }; // Directory not existing is normal
    }
    return {
      mods: [],
      error: `Failed to read mods directory ${modsDir}: ${(err as Error).message}`,
    };
  }
}

export async function readAllMods(serverDir: string, disabledModsDir: string): Promise<ModsResult> {
  const enabledDir = path.join(serverDir, 'mods');
  const enabled = await scanModsDir(enabledDir, true);
  const disabled = await scanModsDir(disabledModsDir, false);

  const errors: string[] = [];
  if (enabled.error) errors.push(enabled.error);
  if (disabled.error) errors.push(disabled.error);

  return { data: [...enabled.mods, ...disabled.mods], errors };
}
