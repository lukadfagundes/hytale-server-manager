import { create } from 'zustand';
import {
  getAssetStatus,
  extractAssets,
  onAssetsExtracting,
  onAssetsReady,
  onAssetsError,
} from '../services/ipc-client';

export type AssetStatus = 'unknown' | 'extracting' | 'ready' | 'error';

interface AssetStore {
  status: AssetStatus;
  error: string | null;
  init: () => () => void;
  triggerExtraction: () => Promise<void>;
}

export const useAssetStore = create<AssetStore>((set) => ({
  status: 'unknown',
  error: null,

  init: () => {
    // Check if assets are already cached
    getAssetStatus()
      .then(({ cached }) => {
        set({ status: cached ? 'ready' : 'unknown' });
      })
      .catch(() => {
        // Leave as unknown
      });

    // Subscribe to asset extraction events from main process
    const unsubExtracting = onAssetsExtracting(() => {
      set({ status: 'extracting', error: null });
    });

    const unsubReady = onAssetsReady(() => {
      set({ status: 'ready', error: null });
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
    set({ status: 'extracting', error: null });
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
