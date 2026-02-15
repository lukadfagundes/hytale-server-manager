import { create } from 'zustand';
import {
  startServer,
  stopServer,
  onServerStatusChanged,
  onServerLog,
} from '../services/ipc-client';
import { useToastStore } from './toast-store';
import type { ServerStatus, LogEntry } from '../types/server';

// Extend LogEntry with a unique id for stable React keys
export interface StoreLogEntry extends LogEntry {
  id: number;
}

interface ServerStore {
  status: ServerStatus;
  logs: StoreLogEntry[];
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
  init: () => () => void;
}

const MAX_LOGS = 1000;
let logIdCounter = 0;

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
  clearLogs: () => {
    logIdCounter = 0;
    set({ logs: [] });
  },
  init: () => {
    const unsubStatus = onServerStatusChanged((status) => {
      if (status === 'starting') {
        logIdCounter = 0;
        set({ status: status as ServerStatus, logs: [] });
      } else {
        set({ status: status as ServerStatus });
      }
    });
    const unsubLog = onServerLog((entry) => {
      const entryWithId: StoreLogEntry = {
        ...entry,
        id: ++logIdCounter,
      };
      set((state) => {
        const logs = [...state.logs, entryWithId];
        return { logs: logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs };
      });
    });
    return () => {
      unsubStatus();
      unsubLog();
    };
  },
}));
