import fs from 'fs';
import path from 'path';

export function toggleMod(
  serverDir: string,
  disabledModsDir: string,
  modName: string,
  enabled: boolean,
): void {
  const enabledPath = path.join(serverDir, 'mods', modName);
  const disabledPath = path.join(disabledModsDir, modName);

  // Ensure disabled-mods directory exists
  if (!fs.existsSync(disabledModsDir)) {
    fs.mkdirSync(disabledModsDir, { recursive: true });
  }

  if (enabled) {
    // Move from disabled-mods → Server/mods/
    if (!fs.existsSync(disabledPath)) {
      throw new Error(`Disabled mod not found: ${modName}`);
    }
    if (fs.existsSync(enabledPath)) {
      throw new Error(`Mod already exists in Server/mods/: ${modName}`);
    }
    fs.renameSync(disabledPath, enabledPath);
  } else {
    // Move from Server/mods/ → disabled-mods/
    if (!fs.existsSync(enabledPath)) {
      throw new Error(`Enabled mod not found: ${modName}`);
    }
    if (fs.existsSync(disabledPath)) {
      throw new Error(`Mod already exists in disabled-mods/: ${modName}`);
    }
    fs.renameSync(enabledPath, disabledPath);
  }
}
