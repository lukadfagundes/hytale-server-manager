import { create } from 'zustand';
import { getPlayers, getMemories, getWarps, getWorldMap } from '../services/ipc-client';
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
  error: string | null;
  fetchPlayers: () => Promise<void>;
  fetchMemories: () => Promise<void>;
  fetchWarps: () => Promise<void>;
  fetchWorldMap: () => Promise<void>;
}

export const useUniverseStore = create<UniverseStore>((set) => ({
  players: [],
  memories: { global: [], perPlayer: {} },
  warps: [],
  worldMap: null,
  loading: {},
  error: null,

  fetchPlayers: async () => {
    set((s) => ({ loading: { ...s.loading, players: true } }));
    try {
      const players = await getPlayers();
      set((s) => ({ players, loading: { ...s.loading, players: false } }));
    } catch (err) {
      set((s) => ({ error: String(err), loading: { ...s.loading, players: false } }));
    }
  },

  fetchMemories: async () => {
    set((s) => ({ loading: { ...s.loading, memories: true } }));
    try {
      const memories = await getMemories();
      set((s) => ({ memories, loading: { ...s.loading, memories: false } }));
    } catch (err) {
      set((s) => ({ error: String(err), loading: { ...s.loading, memories: false } }));
    }
  },

  fetchWarps: async () => {
    set((s) => ({ loading: { ...s.loading, warps: true } }));
    try {
      const warps = await getWarps();
      set((s) => ({ warps, loading: { ...s.loading, warps: false } }));
    } catch (err) {
      set((s) => ({ error: String(err), loading: { ...s.loading, warps: false } }));
    }
  },

  fetchWorldMap: async () => {
    set((s) => ({ loading: { ...s.loading, worldMap: true } }));
    try {
      const worldMap = await getWorldMap();
      set((s) => ({ worldMap, loading: { ...s.loading, worldMap: false } }));
    } catch (err) {
      set((s) => ({ error: String(err), loading: { ...s.loading, worldMap: false } }));
    }
  },
}));
