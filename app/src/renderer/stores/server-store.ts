import { create } from 'zustand';
import { startServer, stopServer, onServerStatusChanged, onServerLog } from '../services/ipc-client';
import { useToastStore } from './toast-store';

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
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(`Failed to start server: ${msg}`, 'error');
    }
  },
  stop: async () => {
    try {
      await stopServer();
    } catch (err) {
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(`Failed to stop server: ${msg}`, 'error');
    }
  },
  clearLogs: () => set({ logs: [] }),
  init: () => {
    const unsubStatus = onServerStatusChanged((status) => {
      if (status === 'starting') {
        set({ status: status as ServerStatus, logs: [] });
      } else {
        set({ status: status as ServerStatus });
      }
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
