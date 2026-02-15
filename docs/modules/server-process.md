# Server Process Module

**Module:** `app/src/main/server-process.ts`
**Purpose:** Java server lifecycle management for the Hytale dedicated server
**Process:** Electron Main Process (Node.js)

---

## Overview

The `server-process` module manages the complete lifecycle of the Hytale dedicated server (`HytaleServer.jar`). It handles spawning the server process via platform-specific launcher scripts, monitoring stdout/stderr streams, detecting startup completion, implementing graceful shutdown with timeout-based force-kill, and auto-restart on specific exit codes.

This module is the core of the server control functionality, providing a state machine for server status and broadcasting status changes and log entries to all renderer windows via IPC.

---

## State Machine

The server follows a strict state machine with four states:

```
                    start()
    [stopped] ─────────────────> [starting]
        ^                            │
        │                            │ (stdout contains startup marker)
        │                            v
        │        stop()         [running]
        └──────────────────────────┘
                    │
                    v
               [stopping]
                    │
                    │ (process closed)
                    v
               [stopped]
```

### State Definitions

| State | Description |
|-------|-------------|
| `stopped` | Server process is not running. Ready to start. |
| `starting` | Server process has been spawned but has not yet emitted a startup marker. |
| `running` | Server has emitted a startup marker (`Server started`, `listening`, `Done`, or `Listening on`). |
| `stopping` | Graceful shutdown initiated. Waiting for process to exit or timeout. |

---

## Exported Functions

### `start(): Promise<void>`

Starts the Hytale server by spawning the platform-specific launcher script.

**Returns:** `Promise<void>` - Resolves immediately after spawning (does not wait for server to be `running`)

**Throws:**
- `Error` - When server is not in `stopped` state
- `Error` - When launcher script (`start.bat` or `start.sh`) is not found
- `Error` - When process spawn fails (ENOENT, EACCES)

**Behavior:**
1. Validates server is in `stopped` state
2. Determines platform and selects launcher script (`start.bat` for Windows, `start.sh` for Unix)
3. Validates launcher script exists at project root (parent of Server directory)
4. Sets status to `starting` and records start timestamp
5. Spawns child process with platform-specific shell (`cmd.exe /c` on Windows, `bash` on Unix)
6. Attaches stdout/stderr listeners for log broadcasting
7. Detects startup completion via stdout markers
8. Handles process close and error events

**Example:**
```typescript
import { start, onStatusChange, onLog } from './server-process';

onStatusChange((status) => {
  console.log(`Server status: ${status}`);
});

onLog((entry) => {
  console.log(`[${entry.stream}] ${entry.line}`);
});

try {
  await start();
  console.log('Server spawn initiated');
} catch (error) {
  console.error('Failed to start server:', error.message);
}
```

---

### `stop(): Promise<void>`

Initiates graceful shutdown of the server process.

**Returns:** `Promise<void>` - Resolves when process has fully exited

**Throws:**
- `Error` - When server is not running (`Server is not running`)

**Behavior:**
1. Validates server is running (has child process and not in `stopped` state)
2. Sets status to `stopping`
3. Initiates graceful shutdown:
   - **Windows:** `taskkill /pid <pid> /T` (sends WM_CLOSE)
   - **Unix:** `SIGTERM` signal
4. Starts 15-second timeout for force-kill
5. If process doesn't exit within timeout:
   - **Windows:** `taskkill /pid <pid> /T /F` (force kill)
   - **Unix:** `SIGKILL` signal
6. Resolves when process `close` event fires

**Example:**
```typescript
import { stop } from './server-process';

try {
  await stop();
  console.log('Server stopped successfully');
} catch (error) {
  console.error('Failed to stop server:', error.message);
}
```

---

### `getStatus(): ServerStatus`

Returns the current server status.

**Returns:** `ServerStatus` - One of `'stopped'`, `'starting'`, `'running'`, `'stopping'`

**Example:**
```typescript
import { getStatus } from './server-process';

const status = getStatus();
if (status === 'running') {
  console.log('Server is running');
}
```

---

### `onStatusChange(callback: StatusCallback): void`

Registers a callback for server status changes.

**Parameters:**
- `callback: (status: ServerStatus) => void` - Function called on each status change

**Note:** Callbacks are stored in memory and persist for the application lifetime. There is no unsubscribe mechanism.

**Example:**
```typescript
import { onStatusChange } from './server-process';

onStatusChange((status) => {
  console.log(`Status changed to: ${status}`);
});
```

---

### `onLog(callback: LogCallback): void`

Registers a callback for server log entries.

**Parameters:**
- `callback: (entry: LogEntry) => void` - Function called for each log line

**LogEntry Structure:**
```typescript
{
  line: string;        // Log line content (trimmed)
  stream: 'stdout' | 'stderr';  // Source stream
  timestamp: number;   // Unix timestamp (Date.now())
}
```

**Example:**
```typescript
import { onLog } from './server-process';

onLog((entry) => {
  if (entry.stream === 'stderr') {
    console.error(`[ERROR] ${entry.line}`);
  } else {
    console.log(`[INFO] ${entry.line}`);
  }
});
```

---

## Internal Functions

### `setStatus(status: ServerStatus): void`

Internal function that updates the current status and broadcasts to all listeners.

**Broadcasts:**
- Calls all registered `StatusCallback` functions
- Sends `IPC.SERVER_STATUS` (`server:status-changed`) to all `BrowserWindow` instances

---

### `pushLog(line: string, stream: 'stdout' | 'stderr'): void`

Internal function that creates a log entry and broadcasts to all listeners.

**Broadcasts:**
- Calls all registered `LogCallback` functions
- Sends `IPC.SERVER_LOG` (`server:log`) to all `BrowserWindow` instances

---

## Exit Code Handling

The module interprets exit codes to determine post-exit behavior:

| Exit Code | Meaning | Behavior |
|-----------|---------|----------|
| `0` | Normal exit | Set status to `stopped` |
| `8` | Auto-restart request | Log message, set to `stopped`, then call `start()` |
| Other (non-zero) | Error exit | Log error, set status to `stopped` |

### Crash Detection

A crash is detected when:
- Exit code is non-zero (and not 8)
- Server runtime is less than `CRASH_THRESHOLD_MS` (30 seconds)

**Crash behavior:** Log crash message with uptime, set status to `stopped`, do NOT auto-restart

**Normal error exit (uptime > 30s):** Log exit code, set status to `stopped`

---

## Graceful Shutdown Sequence

```
stop() called
    │
    v
Set status to 'stopping'
    │
    v
Send graceful signal ─────────────────────┐
    │                                     │
    │ Windows: taskkill /pid /T           │ Unix: SIGTERM
    │         (sends WM_CLOSE)            │
    v                                     v
Start 15-second timeout
    │
    ├── Process exits within timeout ────> Clear timeout, resolve
    │
    └── Timeout fires ────────────────────┐
                                          │
                                          v
                              Send force-kill signal
                                          │
                              Windows: taskkill /pid /T /F
                              Unix: SIGKILL
                                          │
                                          v
                              Process exits, resolve
```

---

## Platform Differences

| Aspect | Windows | Unix (macOS/Linux) |
|--------|---------|-------------------|
| Launcher script | `start.bat` | `start.sh` |
| Shell command | `cmd.exe /c <script>` | `bash <script>` |
| Graceful shutdown | `taskkill /pid <pid> /T` | `SIGTERM` |
| Force kill | `taskkill /pid <pid> /T /F` | `SIGKILL` |

**Note:** The `/T` flag in `taskkill` terminates the process tree, ensuring child processes (Java) are also terminated.

---

## Startup Detection

The module detects successful startup by scanning stdout for marker strings:

- `Server started`
- `listening`
- `Done`
- `Listening on`

When any of these markers are found, the status transitions from `starting` to `running`.

---

## Error Handling

### Spawn Errors

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `ENOENT` | Script not found | `Launcher script not found or not executable: <path>` |
| `EACCES` | Permission denied | `Permission denied running launcher script: <path>` |
| Other | Generic failure | `Failed to start server: <message>` |

### Pre-Start Validation

- Server must be in `stopped` state (rejects with current state)
- Launcher script must exist (rejects with expected path)

---

## IPC Events

| Channel | Direction | Payload | When |
|---------|-----------|---------|------|
| `server:status-changed` | Main -> Renderer | `ServerStatus` | On any status change |
| `server:log` | Main -> Renderer | `{ line, stream, timestamp }` | On each stdout/stderr line |

---

## Type Definitions

```typescript
type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

type StatusCallback = (status: ServerStatus) => void;

type LogCallback = (entry: {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}) => void;
```

---

## Module Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CRASH_THRESHOLD_MS` | `30000` (30s) | Uptime below which non-zero exit is considered a crash |

---

## Related Modules

- **`server-path.ts`** - Provides `getServerDir()` for locating the Server directory
- **`ipc-handlers.ts`** - Exposes `start()` and `stop()` via IPC handlers
- **`shared/constants.ts`** - Defines `IPC.SERVER_STATUS` and `IPC.SERVER_LOG` channels

---

**Last Updated:** 2026-02-15
**Trinity Version:** 2.1.0
