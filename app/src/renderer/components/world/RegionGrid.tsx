import type { WorldMapData } from '../../types/world';
import { formatBytes } from '../../utils/formatting';

interface RegionGridProps {
  data: WorldMapData;
}

function sizeToColor(sizeBytes: number, maxSize: number): string {
  const ratio = maxSize > 0 ? sizeBytes / maxSize : 0;
  if (ratio > 0.75) return 'bg-hytale-highlight/80';
  if (ratio > 0.5) return 'bg-hytale-highlight/60';
  if (ratio > 0.25) return 'bg-hytale-accent/80';
  return 'bg-hytale-accent/50';
}

// Convert block coordinates to region coordinates (regions are 512x512 blocks)
function blockToRegion(blockCoord: number): number {
  return Math.floor(blockCoord / 512);
}

export default function RegionGrid({ data }: RegionGridProps) {
  const { regions, bounds, markers, playerPositions, warpPositions } = data;

  if (regions.length === 0) {
    return <p className="text-hytale-muted">No region data available.</p>;
  }

  const maxSize = Math.max(...regions.map(r => r.sizeBytes));
  const regionMap = new Map(regions.map(r => [`${r.x},${r.z}`, r]));

  const cols = bounds.maxX - bounds.minX + 1;
  const rows = bounds.maxZ - bounds.minZ + 1;

  return (
    <div className="space-y-3">
      {/* Grid */}
      <div className="overflow-auto">
        {/* X-axis labels */}
        <div className="flex ml-8 mb-1">
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} className="w-10 text-center text-[10px] text-hytale-muted">
              {bounds.minX + i}
            </div>
          ))}
        </div>

        {Array.from({ length: rows }, (_, row) => {
          const z = bounds.minZ + row;
          return (
            <div key={z} className="flex items-center">
              {/* Z-axis label */}
              <div className="w-8 text-right pr-1 text-[10px] text-hytale-muted">{z}</div>
              {Array.from({ length: cols }, (_, col) => {
                const x = bounds.minX + col;
                const region = regionMap.get(`${x},${z}`);

                // Check for overlays on this cell
                const overlayMarkers = markers.filter(m => blockToRegion(m.position.x) === x && blockToRegion(m.position.z) === z);
                const overlayPlayers = playerPositions.filter(p => blockToRegion(p.position.x) === x && blockToRegion(p.position.z) === z);
                const overlayWarps = warpPositions.filter(w => blockToRegion(w.position.x) === x && blockToRegion(w.position.z) === z);

                return (
                  <div
                    key={x}
                    className={`w-10 h-10 border border-hytale-darker/50 relative group ${
                      region ? sizeToColor(region.sizeBytes, maxSize) : 'bg-hytale-darker/30'
                    }`}
                    title={
                      region
                        ? `Region (${x}, ${z}) - ${formatBytes(region.sizeBytes)} - ${new Date(region.lastModified).toLocaleDateString()}`
                        : `(${x}, ${z}) - Unexplored`
                    }
                  >
                    {/* Overlay dots */}
                    {overlayPlayers.map((p, i) => (
                      <div
                        key={`p${i}`}
                        className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400 border border-green-600"
                        title={p.name}
                      />
                    ))}
                    {overlayWarps.map((w, i) => (
                      <div
                        key={`w${i}`}
                        className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-purple-400 border border-purple-600"
                        title={w.name}
                      />
                    ))}
                    {overlayMarkers.map((m, i) => (
                      <div
                        key={`m${i}`}
                        className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-yellow-600"
                        title={m.name}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-hytale-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400 border border-green-600 inline-block" /> Player
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-400 border border-purple-600 inline-block" /> Warp
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600 inline-block" /> Marker
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-hytale-accent/50 inline-block" /> Small region
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-hytale-highlight/80 inline-block" /> Large region
        </span>
      </div>

      <p className="text-xs text-hytale-muted">{regions.length} explored regions</p>
    </div>
  );
}
