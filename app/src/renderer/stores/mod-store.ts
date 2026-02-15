import { create } from 'zustand';
import { getMods, toggleMod, onDataRefresh } from '../services/ipc-client';
import { useToastStore } from './toast-store';
import type { ModInfo } from '../types/mod';

interface ModStore {
  mods: ModInfo[];
  loading: boolean;
  error: string | null;
  fetchMods: () => Promise<void>;
  toggleMod: (modName: string, enabled: boolean) => Promise<void>;
  initRefreshListener: () => () => void;
}

export const useModStore = create<ModStore>((set, get) => ({
  mods: [],
  loading: false,
  error: null,
  fetchMods: async () => {
    set({ loading: true, error: null });
    try {
      const result = await getMods();
      if (result.errors.length > 0) {
        const addToast = useToastStore.getState().addToast;
        for (const err of result.errors) addToast(err, 'warning');
      }
      set({ mods: result.data, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  toggleMod: async (modName: string, enabled: boolean) => {
    try {
      await toggleMod(modName, enabled);
      const result = await getMods();
      set({ mods: result.data, error: null });
    } catch (err) {
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(msg, 'error');
      set({ error: msg });
    }
  },
  initRefreshListener: () => {
    return onDataRefresh((category) => {
      if (category === 'mods') {
        get().fetchMods().catch(console.error);
      }
    });
  },
}));
