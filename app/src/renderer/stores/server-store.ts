import { create } from 'zustand';
import { startServer, stopServer, onServerStatusChanged, onServerLog } from '../services/ipc-client';

type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

interface LogEntry {
  line: string;
  stream: string;
  timestamp: number;
}

interface ServerStore {
  status: ServerStatus;
  logs: LogEntry[];
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
  init: () => () => void;
}

const MAX_LOGS = 1000;

export const useServerStore = create<ServerStore>((set) => ({
  status: 'stopped',
  logs: [],
  start: async () => {
    try {
      await startServer();
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  },
  stop: async () => {
    try {
      await stopServer();
    } catch (err) {
      console.error('Failed to stop server:', err);
    }
  },
  clearLogs: () => set({ logs: [] }),
  init: () => {
    const unsubStatus = onServerStatusChanged((status) => {
      set({ status: status as ServerStatus });
    });
    const unsubLog = onServerLog((entry) => {
      set((state) => {
        const logs = [...state.logs, entry];
        return { logs: logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs };
      });
    });
    return () => {
      unsubStatus();
      unsubLog();
    };
  },
}));
