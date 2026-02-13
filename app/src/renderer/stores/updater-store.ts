import { create } from 'zustand';
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getAppVersion,
  onUpdaterChecking,
  onUpdaterAvailable,
  onUpdaterNotAvailable,
  onUpdaterProgress,
  onUpdaterDownloaded,
  onUpdaterError,
} from '../services/ipc-client';
import type { UpdateInfo, DownloadProgress } from '../services/ipc-client';
import { useToastStore } from './toast-store';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

const SKIPPED_VERSION_KEY = 'hytale-server:skipped-update-version';

interface UpdaterStore {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  skippedVersion: string | null;
  dismissed: boolean;
  appVersion: string;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
  skipVersion: (version: string) => void;
  remindLater: () => void;
  init: () => () => void;
}

export const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  status: 'idle',
  updateInfo: null,
  downloadProgress: null,
  error: null,
  skippedVersion: localStorage.getItem(SKIPPED_VERSION_KEY),
  dismissed: false,
  appVersion: '',

  checkForUpdates: async () => {
    try {
      await checkForUpdates();
    } catch (err) {
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(`Update check failed: ${msg}`, 'error');
    }
  },

  downloadUpdate: async () => {
    set({ status: 'downloading', downloadProgress: null });
    try {
      await downloadUpdate();
    } catch (err) {
      const msg = (err as Error).message || String(err);
      useToastStore.getState().addToast(`Download failed: ${msg}`, 'error');
    }
  },

  installUpdate: () => {
    installUpdate();
  },

  skipVersion: (version: string) => {
    localStorage.setItem(SKIPPED_VERSION_KEY, version);
    set({ skippedVersion: version, dismissed: true, status: 'idle' });
  },

  remindLater: () => {
    set({ dismissed: true });
  },

  init: () => {
    getAppVersion().then((version) => {
      set({ appVersion: version });
    });

    const unsubChecking = onUpdaterChecking(() => {
      set({ status: 'checking' });
    });

    const unsubAvailable = onUpdaterAvailable((info) => {
      const { skippedVersion } = get();
      if (skippedVersion && info.version === skippedVersion) {
        set({ status: 'not-available' });
        return;
      }
      set({ status: 'available', updateInfo: info, dismissed: false });
    });

    const unsubNotAvailable = onUpdaterNotAvailable(() => {
      set({ status: 'not-available' });
    });

    const unsubProgress = onUpdaterProgress((progress) => {
      set({ status: 'downloading', downloadProgress: progress });
    });

    const unsubDownloaded = onUpdaterDownloaded((info) => {
      set({ status: 'downloaded', updateInfo: info, dismissed: false });
    });

    const unsubError = onUpdaterError((error) => {
      set({ status: 'error', error: error.message, dismissed: false });
    });

    return () => {
      unsubChecking();
      unsubAvailable();
      unsubNotAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  },
}));
