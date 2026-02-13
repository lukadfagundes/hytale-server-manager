import { create } from 'zustand';
import { getServerPath, setServerPath, selectServerDir, onServerPathChanged } from '../services/ipc-client';
import { useToastStore } from './toast-store';

type ConfigStatus = 'loading' | 'valid' | 'invalid';

interface ConfigStore {
  status: ConfigStatus;
  serverPath: string;
  selectedPath: string;
  selectedValid: boolean;
  error: string | null;
  init: () => () => void;
  selectDirectory: () => Promise<void>;
  confirmPath: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  status: 'loading',
  serverPath: '',
  selectedPath: '',
  selectedValid: false,
  error: null,

  init: () => {
    // Fetch current server path on startup
    getServerPath()
      .then((info) => {
        set({
          serverPath: info.path,
          status: info.valid ? 'valid' : 'invalid',
        });
      })
      .catch(() => {
        set({ status: 'invalid' });
      });

    // Listen for path changes from the main process
    const unsub = onServerPathChanged((info) => {
      set({
        serverPath: info.path,
        status: info.valid ? 'valid' : 'invalid',
      });
    });

    return unsub;
  },

  selectDirectory: async () => {
    set({ error: null });
    try {
      const result = await selectServerDir();
      if (result.selected && result.path != null) {
        set({
          selectedPath: result.path,
          selectedValid: result.valid ?? false,
          error: result.valid ? null : 'Selected directory does not appear to be a valid Hytale Server directory',
        });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  confirmPath: async () => {
    const { selectedPath } = get();
    if (!selectedPath) return;

    set({ error: null });
    try {
      const result = await setServerPath(selectedPath);
      if (result.success) {
        set({
          serverPath: selectedPath,
          status: 'valid',
          selectedPath: '',
          selectedValid: false,
        });
      } else {
        set({ error: result.error ?? 'Failed to set server path' });
      }
    } catch (err) {
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(`Failed to set server path: ${msg}`, 'error');
      set({ error: msg });
    }
  },
}));
