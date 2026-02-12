import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import RegionGrid from '../components/world/RegionGrid';

export default function WorldMap() {
  const { worldMap, loading, errors, fetchWorldMap } = useUniverseStore();

  useEffect(() => {
    fetchWorldMap();
  }, [fetchWorldMap]);

  const worldErrors = errors.worldMap ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">World Map</h1>

      {worldErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 space-y-1">
          {worldErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {loading.worldMap ? (
        <p className="text-hytale-muted">Loading world data...</p>
      ) : !worldMap || worldMap.regions.length === 0 ? (
        <p className="text-hytale-muted">No explored regions found.</p>
      ) : (
        <RegionGrid data={worldMap} />
      )}
    </div>
  );
}
