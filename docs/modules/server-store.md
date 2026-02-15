# Server Store Module

**Source:** `app/src/renderer/stores/server-store.ts`

Zustand store for server status management and log buffering.

---

## Overview

The Server Store manages the game server's lifecycle state and log output in the renderer process. It provides reactive state updates via IPC event subscriptions and exposes actions for server control.

**Key responsibilities:**

- Track server status (`stopped`, `starting`, `running`, `stopping`)
- Buffer server log entries with unique IDs for React keys
- Provide `start()` and `stop()` actions with error handling
- Subscribe to IPC events for real-time updates
- Manage log buffer size (max 1000 entries)

---

## Store Interface

```typescript
interface ServerStore {
  // State
  status: ServerStatus;
  logs: StoreLogEntry[];

  // Actions
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
  init: () => () => void;
}
```

---

## State Shape

### status

```typescript
status: ServerStatus
```

| Type | Initial Value | Possible Values |
|------|---------------|-----------------|
| `ServerStatus` | `'stopped'` | `'stopped'`, `'starting'`, `'running'`, `'stopping'` |

The current server status. Updated reactively via the `server:status-changed` IPC event.

### logs

```typescript
logs: StoreLogEntry[]
```

| Type | Initial Value | Max Length |
|------|---------------|------------|
| `StoreLogEntry[]` | `[]` | 1000 entries |

Buffered log entries from the server process. Each entry is extended with a unique `id` for stable React keys:

```typescript
// Base LogEntry (from types/server.ts)
interface LogEntry {
  line: string;              // Log line content
  stream: 'stdout' | 'stderr'; // Output stream
  timestamp: number;         // Unix timestamp (ms)
}

// Extended for store
export interface StoreLogEntry extends LogEntry {
  id: number;  // Unique sequential ID
}
```

---

## Actions

### start()

```typescript
start: () => Promise<void>
```

Start the game server by invoking `server:start` via IPC.

**Behavior:**
- Calls `startServer()` from ipc-client
- On error, shows toast notification via `useToastStore`
- Does not update status directly (waits for `server:status-changed` event)

**Example:**

```typescript
const { start } = useServerStore();
await start();
```

### stop()

```typescript
stop: () => Promise<void>
```

Stop the game server by invoking `server:stop` via IPC.

**Behavior:**
- Calls `stopServer()` from ipc-client
- On error, shows toast notification via `useToastStore`
- Does not update status directly (waits for `server:status-changed` event)

**Example:**

```typescript
const { stop } = useServerStore();
await stop();
```

### clearLogs()

```typescript
clearLogs: () => void
```

Clear all buffered log entries and reset the log ID counter.

**Behavior:**
- Resets `logIdCounter` to 0
- Sets `logs` to empty array

**Example:**

```typescript
const { clearLogs } = useServerStore();
clearLogs();
```

### init()

```typescript
init: () => () => void
```

Initialize IPC event subscriptions. Returns an unsubscribe function for cleanup.

**Behavior:**
- Subscribes to `server:status-changed` event
- Subscribes to `server:log` event
- When status becomes `'starting'`, clears logs and resets counter
- Returns cleanup function that unsubscribes from both events

**Example:**

```typescript
const { init } = useServerStore();

useEffect(() => {
  const cleanup = init();
  return cleanup;
}, [init]);
```

---

## IPC Event Subscriptions

### server:status-changed

Received when the server transitions between states.

**Behavior:**
- Updates `status` state to the received value
- When status is `'starting'`:
  - Resets `logIdCounter` to 0
  - Clears `logs` array

**Rationale:** Clearing logs on server start provides a clean slate for each server session.

### server:log

Received when the server outputs a new log line.

**Behavior:**
- Assigns unique sequential `id` to the entry
- Appends entry to `logs` array
- If array exceeds `MAX_LOGS` (1000), trims oldest entries

---

## Log Buffer Management

The store maintains a sliding window of the most recent 1000 log entries:

```typescript
const MAX_LOGS = 1000;
let logIdCounter = 0;

// In onServerLog handler:
const entryWithId: StoreLogEntry = {
  ...entry,
  id: ++logIdCounter,
};

set((state) => {
  const logs = [...state.logs, entryWithId];
  return { logs: logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs };
});
```

**Design decisions:**

| Aspect | Implementation | Rationale |
|--------|----------------|-----------|
| Max size | 1000 entries | Balance memory usage vs. useful history |
| Trimming | Oldest removed | FIFO queue semantics |
| ID counter | Module-level variable | Persists across renders, resets on clear |
| ID assignment | Pre-increment (`++logIdCounter`) | Ensures first ID is 1, not 0 |

---

## Cleanup Pattern

The `init()` function returns an unsubscribe function for proper cleanup:

```typescript
init: () => {
  const unsubStatus = onServerStatusChanged((status) => {
    // ... update status
  });

  const unsubLog = onServerLog((entry) => {
    // ... append log
  });

  // Return cleanup function
  return () => {
    unsubStatus();
    unsubLog();
  };
}
```

**Integration pattern:**

```typescript
// In App.tsx or page component
useEffect(() => {
  const cleanup = useServerStore.getState().init();
  return cleanup;
}, []);
```

**Why this pattern?**
- Prevents memory leaks from orphaned listeners
- Allows React strict mode double-mount to work correctly
- Centralizes subscription logic in the store

---

## Component Integration Examples

### Dashboard Page

```typescript
// pages/Dashboard.tsx
import { useEffect } from 'react';
import { useServerStore } from '../stores/server-store';
import { ServerToggle } from '../components/server/ServerToggle';
import { LogPanel } from '../components/server/LogPanel';

export function Dashboard() {
  const init = useServerStore((s) => s.init);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return (
    <div>
      <ServerToggle />
      <LogPanel />
    </div>
  );
}
```

### ServerToggle Component

```typescript
// components/server/ServerToggle.tsx
import { useServerStore } from '../../stores/server-store';

export function ServerToggle() {
  const status = useServerStore((s) => s.status);
  const start = useServerStore((s) => s.start);
  const stop = useServerStore((s) => s.stop);

  const isRunning = status === 'running';
  const isTransitioning = status === 'starting' || status === 'stopping';

  return (
    <button
      onClick={isRunning ? stop : start}
      disabled={isTransitioning}
    >
      {isRunning ? 'Stop Server' : 'Start Server'}
    </button>
  );
}
```

### LogPanel Component

```typescript
// components/server/LogPanel.tsx
import { useServerStore } from '../../stores/server-store';

export function LogPanel() {
  const logs = useServerStore((s) => s.logs);
  const clearLogs = useServerStore((s) => s.clearLogs);

  return (
    <div>
      <button onClick={clearLogs}>Clear</button>
      <ul>
        {logs.map((log) => (
          <li
            key={log.id}
            className={log.stream === 'stderr' ? 'text-red-500' : ''}
          >
            {log.line}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## State Flow Diagram

```
User clicks "Start"
       |
       v
  start() action
       |
       v
startServer() IPC invoke
       |
       v
Main process starts server
       |
       v
server:status-changed ('starting')
       |
       v
Store: status = 'starting', logs = [], counter = 0
       |
       v
server:log events (multiple)
       |
       v
Store: logs = [entry1, entry2, ...]
       |
       v
server:status-changed ('running')
       |
       v
Store: status = 'running'
```

---

## Related Modules

- **IPC Client:** `services/ipc-client.ts` (startServer, stopServer, onServerStatusChanged, onServerLog)
- **Types:** `types/server.ts` (ServerStatus, LogEntry)
- **Toast Store:** `stores/toast-store.ts` (error notifications)
- **Components:** `components/server/` (ServerToggle, ServerStatus, LogPanel)
