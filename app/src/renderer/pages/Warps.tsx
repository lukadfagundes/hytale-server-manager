import { useEffect, useState } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import WarpCard from '../components/warps/WarpCard';
import WarpMapModal from '../components/warps/WarpMapModal';
import type { Warp } from '../types/warp';

type SortMode = 'name' | 'date';

export default function Warps() {
  const { warps, loading, errors, fetchWarps, fetchWorldMap } = useUniverseStore();
  const [sort, setSort] = useState<SortMode>('name');
  const [selectedWarp, setSelectedWarp] = useState<Warp | null>(null);

  useEffect(() => {
    fetchWarps();
    fetchWorldMap();
  }, [fetchWarps, fetchWorldMap]);

  const warpErrors = errors.warps ?? [];

  const sorted = [...warps].sort((a, b) => {
    if (sort === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warps</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-hytale-muted">{warps.length} warp(s)</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-hytale-dark border border-hytale-accent/30 rounded-lg px-3 py-1 text-sm text-hytale-text focus:outline-none"
          >
            <option value="name">Name (A-Z)</option>
            <option value="date">Newest First</option>
          </select>
        </div>
      </div>

      {warpErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 space-y-1">
          {warpErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {loading.warps ? (
        <p className="text-hytale-muted">Loading warps...</p>
      ) : warps.length === 0 ? (
        <p className="text-hytale-muted">No warps created yet.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {sorted.map((warp) => (
            <WarpCard key={warp.id} warp={warp} onClick={() => setSelectedWarp(warp)} />
          ))}
        </div>
      )}

      <WarpMapModal warp={selectedWarp} onClose={() => setSelectedWarp(null)} />
    </div>
  );
}
