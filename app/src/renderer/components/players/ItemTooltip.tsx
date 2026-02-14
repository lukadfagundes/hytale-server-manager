import type { InventorySlot } from '../../types/player';
import { formatItemId } from '../../utils/translation';
import { formatDurability, durabilityPercent } from '../../utils/formatting';
import ItemIcon from './ItemIcon';

interface ItemTooltipProps {
  item: InventorySlot;
  x: number;
  y: number;
}

export default function ItemTooltip({ item, x, y }: ItemTooltipProps) {
  const pct = item.maxDurability > 0 ? durabilityPercent(item.durability, item.maxDurability) : -1;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
    >
      <div className="bg-hytale-dark border border-hytale-accent/40 rounded-lg shadow-xl p-3 min-w-[180px] max-w-[240px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex-shrink-0 bg-hytale-darker rounded border border-hytale-accent/30 p-1">
            <ItemIcon itemId={item.id} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-hytale-text leading-tight">
              {formatItemId(item.id)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-hytale-muted">Quantity: {item.quantity}</p>
            )}
          </div>
        </div>

        {pct >= 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-hytale-muted">Durability</span>
              <span className="text-[10px] text-hytale-muted">
                {formatDurability(item.durability, item.maxDurability)}
              </span>
            </div>
            <div className="h-1.5 bg-hytale-darker rounded-full">
              <div
                className={`h-full rounded-full ${
                  pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-[10px] text-hytale-muted/60 truncate">{item.id}</p>
      </div>
    </div>
  );
}
