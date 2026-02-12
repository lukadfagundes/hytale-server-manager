import { create } from 'zustand';
import { getMods, toggleMod } from '../services/ipc-client';

interface ModInfo {
  name: string;
  enabled: boolean;
  path: string;
  hasStateFile: boolean;
  sizeBytes: number;
}

interface ModStore {
  mods: ModInfo[];
  loading: boolean;
  error: string | null;
  fetchMods: () => Promise<void>;
  toggleMod: (modName: string, enabled: boolean) => Promise<void>;
}

export const useModStore = create<ModStore>((set) => ({
  mods: [],
  loading: false,
  error: null,
  fetchMods: async () => {
    set({ loading: true, error: null });
    try {
      const mods = await getMods();
      set({ mods: mods as ModInfo[], loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },
  toggleMod: async (modName: string, enabled: boolean) => {
    try {
      await toggleMod(modName, enabled);
      const mods = await getMods();
      set({ mods: mods as ModInfo[] });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
