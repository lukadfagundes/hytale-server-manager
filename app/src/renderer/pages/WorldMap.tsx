import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import RegionGrid from '../components/world/RegionGrid';

export default function WorldMap() {
  const { worldMap, loading, fetchWorldMap } = useUniverseStore();

  useEffect(() => {
    fetchWorldMap();
  }, [fetchWorldMap]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">World Map</h1>

      {loading.worldMap ? (
        <p className="text-hytale-muted">Loading world data...</p>
      ) : !worldMap ? (
        <p className="text-hytale-muted">No world data available.</p>
      ) : (
        <RegionGrid data={worldMap} />
      )}
    </div>
  );
}
