import { create } from 'zustand';
import { getPlayers, getMemories, getWarps, getWorldMap, onDataRefresh } from '../services/ipc-client';
import { useToastStore } from './toast-store';
import type { PlayerData } from '../types/player';
import type { Memory } from '../types/memory';
import type { Warp } from '../types/warp';
import type { WorldMapData } from '../types/world';

interface UniverseStore {
  players: PlayerData[];
  memories: { global: Memory[]; perPlayer: Record<string, Memory[]> };
  warps: Warp[];
  worldMap: WorldMapData | null;
  loading: Record<string, boolean>;
  errors: Record<string, string[]>;
  fetchPlayers: () => Promise<void>;
  fetchMemories: () => Promise<void>;
  fetchWarps: () => Promise<void>;
  fetchWorldMap: () => Promise<void>;
  initRefreshListener: () => () => void;
}

function reportErrors(errors: string[]): void {
  const addToast = useToastStore.getState().addToast;
  for (const err of errors) {
    addToast(err, 'warning');
  }
}

export const useUniverseStore = create<UniverseStore>((set, get) => ({
  players: [],
  memories: { global: [], perPlayer: {} },
  warps: [],
  worldMap: null,
  loading: {},
  errors: {},

  fetchPlayers: async () => {
    set((s) => ({ loading: { ...s.loading, players: true } }));
    try {
      const result = await getPlayers();
      if (result.errors.length > 0) reportErrors(result.errors);
      set((s) => ({
        players: result.data,
        errors: { ...s.errors, players: result.errors },
        loading: { ...s.loading, players: false },
      }));
    } catch (err) {
      const msg = String(err);
      set((s) => ({
        errors: { ...s.errors, players: [msg] },
        loading: { ...s.loading, players: false },
      }));
    }
  },

  fetchMemories: async () => {
    set((s) => ({ loading: { ...s.loading, memories: true } }));
    try {
      const result = await getMemories();
      if (result.errors.length > 0) reportErrors(result.errors);
      set((s) => ({
        memories: result.data,
        errors: { ...s.errors, memories: result.errors },
        loading: { ...s.loading, memories: false },
      }));
    } catch (err) {
      const msg = String(err);
      set((s) => ({
        errors: { ...s.errors, memories: [msg] },
        loading: { ...s.loading, memories: false },
      }));
    }
  },

  fetchWarps: async () => {
    set((s) => ({ loading: { ...s.loading, warps: true } }));
    try {
      const result = await getWarps();
      if (result.errors.length > 0) reportErrors(result.errors);
      set((s) => ({
        warps: result.data,
        errors: { ...s.errors, warps: result.errors },
        loading: { ...s.loading, warps: false },
      }));
    } catch (err) {
      const msg = String(err);
      set((s) => ({
        errors: { ...s.errors, warps: [msg] },
        loading: { ...s.loading, warps: false },
      }));
    }
  },

  fetchWorldMap: async () => {
    set((s) => ({ loading: { ...s.loading, worldMap: true } }));
    try {
      const result = await getWorldMap();
      if (result.errors.length > 0) reportErrors(result.errors);
      set((s) => ({
        worldMap: result.data,
        errors: { ...s.errors, worldMap: result.errors },
        loading: { ...s.loading, worldMap: false },
      }));
    } catch (err) {
      const msg = String(err);
      set((s) => ({
        errors: { ...s.errors, worldMap: [msg] },
        loading: { ...s.loading, worldMap: false },
      }));
    }
  },

  initRefreshListener: () => {
    const refreshMap: Record<string, () => Promise<void>> = {
      players: get().fetchPlayers,
      memories: get().fetchMemories,
      warps: get().fetchWarps,
      worldMap: get().fetchWorldMap,
    };

    return onDataRefresh((category) => {
      const fetcher = refreshMap[category];
      if (fetcher) {
        fetcher().catch(console.error);
      }
    });
  },
}));
