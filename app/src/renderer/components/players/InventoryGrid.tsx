import { useState } from 'react';
import type { InventorySlot } from '../../types/player';
import { durabilityPercent } from '../../utils/formatting';
import { formatItemId } from '../../utils/translation';
import ItemIcon from './ItemIcon';
import ItemTooltip from './ItemTooltip';

interface InventoryGridProps {
  label: string;
  items: Record<number, InventorySlot>;
  capacity: number;
  columns: number;
}

export default function InventoryGrid({ label, items, capacity, columns }: InventoryGridProps) {
  const slots = Array.from({ length: capacity }, (_, i) => items[i] ?? null);
  const [hovered, setHovered] = useState<{ item: InventorySlot; x: number; y: number } | null>(
    null
  );

  function handleMouseEnter(e: React.MouseEvent, item: InventorySlot) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHovered({ item, x: rect.left + rect.width / 2, y: rect.top });
  }

  function handleFocus(e: React.FocusEvent, item: InventorySlot) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHovered({ item, x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div className="mb-3">
      <h4 className="text-xs text-hytale-muted mb-1">
        {label} ({Object.keys(items).length}/{capacity})
      </h4>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {slots.map((item, i) => (
          <div
            key={i}
            className={`aspect-square rounded border flex items-center justify-center p-1 relative ${
              item
                ? 'border-hytale-accent/50 bg-hytale-darker shadow-inner'
                : 'border-hytale-accent/20 bg-hytale-darker/50'
            }`}
            tabIndex={item ? 0 : undefined}
            aria-label={item ? formatItemId(item.id) : undefined}
            onMouseEnter={item ? (e) => handleMouseEnter(e, item) : undefined}
            onMouseLeave={() => setHovered(null)}
            onFocus={item ? (e) => handleFocus(e, item) : undefined}
            onBlur={() => setHovered(null)}
          >
            {item && (
              <>
                <ItemIcon itemId={item.id} />
                {item.quantity > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] text-hytale-highlight font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    {item.quantity}
                  </span>
                )}
                {item.maxDurability > 0 &&
                  (() => {
                    const pct = durabilityPercent(item.durability, item.maxDurability);
                    return (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-hytale-darker rounded-full"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Durability"
                      >
                        <div
                          className={`h-full rounded-full ${
                            pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
        ))}
      </div>
      {hovered && <ItemTooltip item={hovered.item} x={hovered.x} y={hovered.y} />}
    </div>
  );
}
