import { useEffect } from 'react';
import { useModStore } from '../stores/mod-store';
import { useServerStore } from '../stores/server-store';
import ModCard from '../components/mods/ModCard';

export default function ModManager() {
  const mods = useModStore((s) => s.mods);
  const loading = useModStore((s) => s.loading);
  const error = useModStore((s) => s.error);
  const fetchMods = useModStore((s) => s.fetchMods);
  const toggleMod = useModStore((s) => s.toggleMod);
  const serverStatus = useServerStore((s) => s.status);
  const isServerRunning = serverStatus === 'running' || serverStatus === 'starting';

  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mod Manager</h1>
        <span className="text-sm text-hytale-muted">{mods.length} mod(s)</span>
      </div>

      {isServerRunning && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg px-4 py-3 text-sm text-yellow-200">
          Stop the server to manage mods.
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-hytale-muted">Loading mods...</p>
      ) : mods.length === 0 ? (
        <p className="text-hytale-muted">No mods installed.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {mods.map((mod) => (
            <ModCard
              key={mod.name}
              name={mod.name}
              enabled={mod.enabled}
              hasStateFile={mod.hasStateFile}
              sizeBytes={mod.sizeBytes}
              onToggle={(enabled) => toggleMod(mod.name, enabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
