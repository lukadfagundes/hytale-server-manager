import { useEffect } from 'react';
import type { Warp } from '../../types/warp';
import { useUniverseStore } from '../../stores/universe-store';
import { formatCoords } from '../../utils/formatting';
import RegionGrid from '../world/RegionGrid';

interface WarpMapModalProps {
  warp: Warp | null;
  onClose: () => void;
}

export default function WarpMapModal({ warp, onClose }: WarpMapModalProps) {
  useEffect(() => {
    if (!warp) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [warp, onClose]);

  if (!warp) return null;

  const { worldMap } = useUniverseStore.getState();

  if (!worldMap) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
        <div className="bg-hytale-darker rounded-lg border border-hytale-accent/30 p-6 text-center">
          <p className="text-hytale-muted">World map data not available.</p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-1 text-sm bg-hytale-accent/20 rounded hover:bg-hytale-accent/40 text-hytale-text"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-hytale-darker rounded-lg border border-hytale-accent/30 max-w-4xl max-h-[90vh] overflow-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-hytale-accent/20">
          <div>
            <h2 className="text-lg font-bold text-hytale-text">{warp.id}</h2>
            <p className="text-xs text-hytale-muted">
              {warp.world} &middot; {formatCoords(warp.position)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-hytale-muted hover:text-hytale-text text-xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Map */}
        <div className="p-4">
          <RegionGrid data={worldMap} focusPosition={warp.position} />
        </div>
      </div>
    </div>
  );
}
