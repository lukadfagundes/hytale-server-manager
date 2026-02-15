import { create } from 'zustand';
import {
  getAssetStatus,
  extractAssets,
  onAssetsExtracting,
  onAssetsReady,
  onAssetsError,
} from '../services/ipc-client';
import { resetIconMap, itemIconMapReady } from '../utils/asset-paths';

export type AssetStatus = 'unknown' | 'extracting' | 'ready' | 'error';

// Module-level deduplication: only one in-flight icon map reload at a time
let iconMapLoadPromise: Promise<void> | null = null;

interface AssetStore {
  status: AssetStatus;
  error: string | null;
  iconMapReady: boolean;
  init: () => () => void;
  triggerExtraction: () => Promise<void>;
  reloadIconMap: () => Promise<void>;
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  status: 'unknown',
  error: null,
  iconMapReady: false,

  reloadIconMap: async () => {
    // Deduplicate: if a reload is already in progress, return the existing promise
    if (iconMapLoadPromise) {
      await iconMapLoadPromise;
      return;
    }

    iconMapLoadPromise = (async () => {
      try {
        resetIconMap();
        await itemIconMapReady();
        set({ iconMapReady: true });
      } finally {
        iconMapLoadPromise = null;
      }
    })();

    await iconMapLoadPromise;
  },

  init: () => {
    // Check if assets are already cached
    getAssetStatus()
      .then(({ cached }) => {
        if (cached) {
          set({ status: 'ready' });
          // Trigger icon map reload once when assets are already cached
          get().reloadIconMap();
        }
      })
      .catch(() => {
        // Leave as unknown
      });

    // Subscribe to asset extraction events from main process
    const unsubExtracting = onAssetsExtracting(() => {
      set({ status: 'extracting', error: null, iconMapReady: false });
    });

    const unsubReady = onAssetsReady(() => {
      set({ status: 'ready', error: null });
      // Trigger icon map reload once when assets become ready
      get().reloadIconMap();
    });

    const unsubError = onAssetsError((err) => {
      set({ status: 'error', error: err.message });
    });

    return () => {
      unsubExtracting();
      unsubReady();
      unsubError();
    };
  },

  triggerExtraction: async () => {
    set({ status: 'extracting', error: null, iconMapReady: false });
    try {
      const result = await extractAssets();
      if (!result.success) {
        set({ status: 'error', error: result.error ?? 'Extraction failed' });
      }
      // On success, the main process broadcasts ASSETS_READY which updates status
    } catch (err) {
      set({ status: 'error', error: (err as Error).message });
    }
  },
}));
