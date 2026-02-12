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

  const src = enabled ? disabledPath : enabledPath;
  const dst = enabled ? enabledPath : disabledPath;
  const action = enabled ? 'enable' : 'disable';

  if (!fs.existsSync(src)) {
    throw new Error(`Cannot ${action} "${modName}": mod directory not found at expected location`);
  }
  if (fs.existsSync(dst)) {
    throw new Error(`Cannot ${action} "${modName}": directory already exists at destination`);
  }

  try {
    fs.renameSync(src, dst);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(`Permission denied: cannot ${action} "${modName}". Check file permissions for: ${src}`);
    }
    if (code === 'EBUSY') {
      throw new Error(`Directory is locked: cannot ${action} "${modName}". Is the server running?`);
    }
    throw new Error(`Failed to ${action} "${modName}": ${(err as Error).message}`);
  }
}
