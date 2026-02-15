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
  // Config channels (renderer → main)
  CONFIG_GET_SERVER_PATH: 'config:get-server-path',
  CONFIG_SET_SERVER_PATH: 'config:set-server-path',
  CONFIG_SELECT_SERVER_DIR: 'config:select-server-dir',
  // Config event channels (main → renderer)
  CONFIG_SERVER_PATH_CHANGED: 'config:server-path-changed',
  // Asset channels (renderer → main)
  ASSETS_EXTRACT: 'assets:extract',
  ASSETS_STATUS: 'assets:status',
  // Asset event channels (main → renderer)
  ASSETS_EXTRACTING: 'assets:extracting',
  ASSETS_READY: 'assets:ready',
  ASSETS_ERROR: 'assets:error',
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
