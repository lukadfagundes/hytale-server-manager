// Paths (relative to project root)
export const SERVER_DIR = '../Server';
export const DISABLED_MODS_DIR = './disabled-mods';

// IPC Channels
export const IPC = {
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_STATUS: 'server:status-changed',
  SERVER_LOG: 'server:log',
  DATA_PLAYERS: 'data:players',
  DATA_WARPS: 'data:warps',
  DATA_WORLD_MAP: 'data:world-map',
  DATA_SERVER_CONFIG: 'data:server-config',
  MODS_LIST: 'mods:list',
  MODS_TOGGLE: 'mods:toggle',
  DATA_REFRESH: 'data:refresh',
  // Updater - Request channels (renderer → main)
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_GET_VERSION: 'updater:get-version',
  // Updater - Event channels (main → renderer)
  UPDATER_CHECKING: 'updater:checking',
  UPDATER_AVAILABLE: 'updater:available',
  UPDATER_NOT_AVAILABLE: 'updater:not-available',
  UPDATER_PROGRESS: 'updater:progress',
  UPDATER_DOWNLOADED: 'updater:downloaded',
  UPDATER_ERROR: 'updater:error',
} as const;
