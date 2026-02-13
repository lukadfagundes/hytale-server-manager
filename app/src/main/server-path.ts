import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const CONFIG_FILENAME = 'app-config.json';

let serverDir: string | null = null;

/**
 * Returns the path to app-config.json.
 * - In production: stored in Electron's userData directory (persistent across updates)
 * - In development: stored alongside the app/ directory
 */
export function getAppConfigPath(): string {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), CONFIG_FILENAME);
  }
  return path.resolve(__dirname, '..', '..', CONFIG_FILENAME);
}

/**
 * Reads the serverPath from app-config.json.
 * Returns null if config is missing, malformed, or has no serverPath.
 */
function readConfigServerPath(): string | null {
  const configPath = getAppConfigPath();
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    if (config.serverPath && typeof config.serverPath === 'string') {
      // Resolve relative paths against the config file's directory
      return path.resolve(path.dirname(configPath), config.serverPath);
    }
  } catch {
    // Config missing or malformed
  }
  return null;
}

/**
 * Checks whether a directory looks like a valid Hytale Server directory.
 * Checks for HytaleServer.jar OR config.json OR universe/ subdirectory.
 */
export function isServerDirValid(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false;
    }
    const hasJar = fs.existsSync(path.join(dirPath, 'HytaleServer.jar'));
    const hasConfig = fs.existsSync(path.join(dirPath, 'config.json'));
    const hasUniverse = fs.existsSync(path.join(dirPath, 'universe'));
    return hasJar || hasConfig || hasUniverse;
  } catch {
    return false;
  }
}

/**
 * Initialize the server path on app startup.
 * Reads from config file, falls back to default relative path.
 * Returns the resolved path (may or may not be valid).
 */
export function initServerPath(): string {
  const fromConfig = readConfigServerPath();
  if (fromConfig) {
    serverDir = fromConfig;
    return serverDir;
  }
  // Default: ../Server relative to app/
  serverDir = path.resolve(__dirname, '..', '..', '..', 'Server');
  return serverDir;
}

/**
 * Returns the current server directory path.
 * Must call initServerPath() before this.
 */
export function getServerDir(): string {
  if (!serverDir) {
    return initServerPath();
  }
  return serverDir;
}

/**
 * Returns the disabled-mods directory path (sibling to server-path.ts's app/ dir).
 */
export function getDisabledModsDir(): string {
  return path.resolve(__dirname, '..', '..', 'disabled-mods');
}

/**
 * Updates the server path in memory and persists to app-config.json.
 * Returns true on success, error message string on failure.
 */
export function setServerDir(newPath: string): true | string {
  try {
    const resolved = path.resolve(newPath);
    if (!isServerDirValid(resolved)) {
      return 'Selected directory does not appear to be a valid Hytale Server directory';
    }

    // Persist to config file
    const configPath = getAppConfigPath();
    let config: Record<string, unknown> = {};
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      // Start with empty config
    }

    config.serverPath = resolved;

    // Ensure the config directory exists (for production userData path)
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    serverDir = resolved;
    return true;
  } catch (err) {
    return `Failed to save server path: ${(err as Error).message}`;
  }
}
