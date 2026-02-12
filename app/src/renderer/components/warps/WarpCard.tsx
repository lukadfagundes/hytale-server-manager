import type { Warp } from '../../types/warp';
import { formatCoords, formatDate } from '../../utils/formatting';

interface WarpCardProps {
  warp: Warp;
  onClick?: () => void;
}

export default function WarpCard({ warp, onClick }: WarpCardProps) {
  return (
    <div
      className="bg-hytale-dark rounded-lg border border-hytale-accent/30 p-4 cursor-pointer hover:border-hytale-highlight transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-hytale-text">{warp.id}</h3>
          <p className="text-xs text-hytale-muted mt-1">World: {warp.world}</p>
        </div>
        <span className="text-xs text-hytale-muted">{warp.creator}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-hytale-text/70">{formatCoords(warp.position)}</span>
        <span className="text-xs text-hytale-muted">{formatDate(new Date(warp.createdAt))}</span>
      </div>
    </div>
  );
}
