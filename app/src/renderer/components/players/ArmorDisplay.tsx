import type { ArmorSlots } from '../../types/player';
import { formatItemId } from '../../utils/translation';
import { formatDurability } from '../../utils/formatting';
import ItemIcon from './ItemIcon';

const SLOT_LABELS = ['Head', 'Chest', 'Hands', 'Legs'] as const;

interface ArmorDisplayProps {
  armor: ArmorSlots;
}

export default function ArmorDisplay({ armor }: ArmorDisplayProps) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs text-hytale-muted">Armor</h4>
      {SLOT_LABELS.map((label, i) => {
        const item = armor[i];
        return (
          <div
            key={label}
            className="flex items-center gap-2 bg-hytale-dark rounded px-2 py-1 border border-hytale-accent/20"
          >
            <span className="text-xs text-hytale-muted w-12">{label}</span>
            {item ? (
              <>
                <div className="w-6 h-6 flex-shrink-0">
                  <ItemIcon itemId={item.id} />
                </div>
                <span className="text-xs text-hytale-text flex-1">{formatItemId(item.id)}</span>
                {item.maxDurability > 0 && (
                  <span className="text-xs text-hytale-muted">
                    {formatDurability(item.durability, item.maxDurability)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-hytale-muted/50 flex-1">Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
