# Data Flow

This document describes the four major data flows in Hytale Server Manager: server lifecycle management, game data queries with live refresh, asset extraction with caching, and first-run configuration. Each flow is illustrated with a sequence diagram showing the exact IPC channels, modules, and state transitions involved.

> **Note:** `Server/` paths in this document refer to the user's Hytale server installation directory, selected during the app's first-run setup -- not a directory in this repository.

## Server Lifecycle Flow

The server lifecycle begins when the user clicks the Start/Stop button on the Dashboard. The `ServerToggle` component calls the `server-store`, which invokes the main process via IPC. The main process spawns the Java server using `start.sh`/`start.bat` and streams stdout/stderr back to the renderer as log entries. Status transitions (`starting` -> `running` -> `stopping` -> `stopped`) are pushed as events.

```mermaid
sequenceDiagram
    participant User
    participant ServerToggle
    participant ServerStore as server-store
    participant IPCClient as ipc-client
    participant Preload as preload
    participant Handler as ipc-handlers
    participant SP as server-process
    participant Java as HytaleServer.jar
    participant LogPanel

    User->>ServerToggle: Click "Start Server"
    ServerToggle->>ServerStore: start()
    ServerStore->>IPCClient: startServer()
    IPCClient->>Preload: invoke('server:start')
    Preload->>Handler: ipcMain.handle('server:start')
    Handler->>SP: start()
    SP->>SP: setStatus('starting')
    SP-->>Preload: webContents.send('server:status-changed', 'starting')
    Preload-->>ServerStore: on('server:status-changed') -> status = 'starting', logs = []
    SP->>Java: spawn('bash', ['start.sh'])

    loop stdout lines
        Java-->>SP: stdout data
        SP->>SP: pushLog(line, 'stdout')
        SP-->>Preload: webContents.send('server:log', entry)
        Preload-->>ServerStore: on('server:log') -> append to logs[]
        ServerStore-->>LogPanel: Re-render with new log entry
    end

    Note over SP,Java: Detects "Server started" or "Listening on" in stdout
    SP->>SP: setStatus('running')
    SP-->>Preload: webContents.send('server:status-changed', 'running')
    Preload-->>ServerStore: on('server:status-changed') -> status = 'running'
    ServerStore-->>ServerToggle: Re-render: button shows "Stop Server"

    User->>ServerToggle: Click "Stop Server"
    ServerToggle->>ServerStore: stop()
    ServerStore->>IPCClient: stopServer()
    IPCClient->>Preload: invoke('server:stop')
    Preload->>Handler: ipcMain.handle('server:stop')
    Handler->>SP: stop()
    SP->>SP: setStatus('stopping')
    SP-->>Preload: webContents.send('server:status-changed', 'stopping')
    SP->>Java: SIGTERM (or taskkill on Windows)

    alt Graceful exit within 15s
        Java-->>SP: close(code=0)
    else Timeout after 15s
        SP->>Java: SIGKILL
        Java-->>SP: close
    end

    SP->>SP: setStatus('stopped')
    SP-->>Preload: webContents.send('server:status-changed', 'stopped')
    Preload-->>ServerStore: on('server:status-changed') -> status = 'stopped'
    ServerStore-->>ServerToggle: Re-render: button shows "Start Server"
```

## Game Data Flow

Game data (players, warps, world map) is read from JSON and binary files in the `Server/universe/` directory. The `file-watcher` module uses chokidar to watch for filesystem changes and broadcasts categorized `data:refresh` events to the renderer. Zustand stores react by re-fetching the relevant data through IPC invoke calls.

```mermaid
sequenceDiagram
    participant GameServer as HytaleServer.jar
    participant Disk as Server/universe/
    participant FW as file-watcher
    participant Preload as preload
    participant UniStore as universe-store
    participant IPCClient as ipc-client
    participant Handler as ipc-handlers
    participant Reader as data-readers
    participant Page as Players / Warps page

    Note over GameServer,Disk: Server writes player data to disk
    GameServer->>Disk: Write universe/players/uuid.json

    Disk-->>FW: chokidar 'change' event
    FW->>FW: categorizeChange() -> 'players'
    FW->>FW: debounce 500ms
    FW-->>Preload: webContents.send('data:refresh', {category: 'players'})
    Preload-->>UniStore: on('data:refresh') callback

    UniStore->>UniStore: set loading.players = true
    UniStore->>IPCClient: getPlayers()
    IPCClient->>Preload: invoke('data:players')
    Preload->>Handler: ipcMain.handle('data:players')
    Handler->>Reader: readAllPlayers(serverDir)
    Reader->>Disk: fs.readFileSync for each *.json
    Disk-->>Reader: Raw JSON data
    Reader-->>Handler: {data: PlayerData[], errors: string[]}
    Handler-->>Preload: Return result
    Preload-->>IPCClient: Resolve promise
    IPCClient-->>UniStore: {data, errors}
    UniStore->>UniStore: set players = data, loading.players = false
    UniStore-->>Page: Re-render PlayerCard components

    Note over FW,Disk: Same flow for warps (warps.json) and worldMap (chunks/*.region.bin)
```

## Asset Extraction Flow

Assets (item icons, NPC portraits, map markers) are extracted from `Assets.zip` at startup and whenever the server path changes. The extraction runs in the main process, writes files to `userData/asset-cache/`, and builds an `item-icon-map.json` index. Components reference assets via the custom `asset://` protocol which serves files directly from the cache directory.

```mermaid
sequenceDiagram
    participant App as index.ts (startup)
    participant AE as asset-extractor
    participant Zip as Assets.zip
    participant Cache as userData/asset-cache/
    participant Preload as preload
    participant AssetStore as asset-store
    participant ItemIcon as ItemIcon component
    participant Protocol as asset:// handler

    Note over App: App startup with valid server path
    App->>App: initServerPath() -> serverDir
    App-->>Preload: webContents.send('assets:extracting')
    Preload-->>AssetStore: on('assets:extracting') -> status = 'extracting'

    App->>AE: extractAssets(serverDir)
    AE->>AE: Check concurrency guard
    AE->>AE: getAssetsZipPath() -> path.resolve(serverDir, '..', 'Assets.zip')
    AE->>Cache: Check stamp file + icon map (isUpToDate)

    alt Cache is up to date
        AE-->>App: {success: true, totalFiles: 0}
    else Cache is stale or missing
        AE->>Cache: mkdirSync(asset-cache/, {recursive: true})
        AE->>Zip: new StreamZip.async({file: zipPath})

        loop For each extraction rule
            Note over AE,Zip: 6 extraction rules map zip paths to cache subdirectories
            AE->>Zip: Read matching .png entries
            Zip-->>AE: Entry data buffers
            AE->>Cache: writeFileSync(items/Sword.png, data)
        end

        AE->>Zip: Read Server/Item/Items/*.json entries
        AE->>AE: buildItemIconMap() -> {itemId: iconFileName}
        AE->>Cache: writeFileSync(item-icon-map.json)
        AE->>Cache: writeStamp(zipMtime)
        AE->>Zip: close()
        AE-->>App: {success: true, totalFiles: N}
    end

    App-->>Preload: webContents.send('assets:ready')
    Preload-->>AssetStore: on('assets:ready') -> status = 'ready'

    Note over ItemIcon,Protocol: Components now use asset:// URLs
    ItemIcon->>Protocol: <img src="asset:///items/Sword.png">
    Protocol->>Protocol: Strip scheme, decode path
    Protocol->>Cache: net.fetch(pathToFileURL(asset-cache/items/Sword.png))
    Cache-->>Protocol: File contents
    Protocol-->>ItemIcon: HTTP Response with image data
```

## Configuration Flow

On first run (or when the server path is invalid), the app shows the `ServerSetup` screen instead of the main UI. The user selects a directory via the native OS dialog, the main process validates it by checking for `HytaleServer.jar`, `config.json`, or a `universe/` subdirectory, and on confirmation persists the path to `app-config.json`. After a successful path change, the file watcher restarts, assets are re-extracted, and the renderer transitions to the full application shell.

```mermaid
sequenceDiagram
    participant User
    participant App as App.tsx
    participant Setup as ServerSetup
    participant ConfigStore as config-store
    participant IPCClient as ipc-client
    participant Preload as preload
    participant Handler as ipc-handlers
    participant SPath as server-path
    participant ConfigFile as app-config.json
    participant FW as file-watcher
    participant AE as asset-extractor

    Note over App: App mounts, config-store.init() runs
    App->>ConfigStore: init()
    ConfigStore->>IPCClient: getServerPath()
    IPCClient->>Preload: invoke('config:get-server-path')
    Preload->>Handler: ipcMain.handle('config:get-server-path')
    Handler->>SPath: getServerDir(), isServerDirValid()
    SPath-->>Handler: {path, valid: false}
    Handler-->>Preload: Return result
    Preload-->>ConfigStore: {path, valid: false}
    ConfigStore->>ConfigStore: set status = 'invalid'
    ConfigStore-->>App: Re-render
    App->>Setup: Render ServerSetup (configStatus === 'invalid')

    User->>Setup: Click "Browse for Server Directory"
    Setup->>ConfigStore: selectDirectory()
    ConfigStore->>IPCClient: selectServerDir()
    IPCClient->>Preload: invoke('config:select-server-dir')
    Preload->>Handler: ipcMain.handle('config:select-server-dir')
    Handler->>Handler: dialog.showOpenDialog({properties: ['openDirectory']})
    User->>Handler: Select /path/to/Server
    Handler->>SPath: isServerDirValid('/path/to/Server')
    SPath-->>Handler: true
    Handler-->>Preload: {selected: true, path: '/path/to/Server', valid: true}
    Preload-->>ConfigStore: Store selectedPath, selectedValid = true

    Setup-->>User: Show path with "Valid" badge and "Continue" button

    User->>Setup: Click "Continue"
    Setup->>ConfigStore: confirmPath()
    ConfigStore->>IPCClient: setServerPath('/path/to/Server')
    IPCClient->>Preload: invoke('config:set-server-path', path)
    Preload->>Handler: ipcMain.handle('config:set-server-path')
    Handler->>SPath: setServerDir('/path/to/Server')
    SPath->>ConfigFile: writeFileSync(app-config.json, {serverPath})
    SPath-->>Handler: true

    Handler->>FW: stopWatcher() then startWatcher(serverDir)
    Handler-->>Preload: webContents.send('config:server-path-changed', {path, valid: true})
    Preload-->>ConfigStore: on('config:server-path-changed') -> status = 'valid'

    Handler->>AE: broadcastAssetExtraction(serverDir)
    Note over AE: Triggers full extraction flow (see Asset Extraction)

    ConfigStore-->>App: Re-render
    App->>App: configStatus === 'valid' -> render HashRouter + full UI

    Note over ConfigStore: On error, config-store catches and calls addToast() to show an error toast
```
