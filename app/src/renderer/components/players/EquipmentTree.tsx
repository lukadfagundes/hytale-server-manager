import { useState } from 'react';
import type {
  ArmorSlots,
  InventorySlot,
  EntityStats,
  Position,
  RespawnPoint,
  DeathMarker,
} from '../../types/player';
import { durabilityPercent, formatCoords } from '../../utils/formatting';
import { formatItemId } from '../../utils/translation';
import ItemIcon from './ItemIcon';
import ItemTooltip from './ItemTooltip';

interface EquipmentTreeProps {
  armor: ArmorSlots;
  utility: Record<number, InventorySlot>;
  tool: Record<number, InventorySlot>;
  stats: EntityStats;
  position: Position;
  gameMode: string;
  world: string;
  respawnPoints: RespawnPoint[];
  deathMarkers: DeathMarker[];
  discoveredZones: string[];
}

const ARMOR_LABELS = ['Head', 'Chest', 'Hands', 'Legs'] as const;

function EquipmentSlot({
  item,
  label,
  onHover,
  onLeave,
}: {
  item: InventorySlot | null;
  label: string;
  onHover: (e: React.MouseEvent | React.FocusEvent, item: InventorySlot) => void;
  onLeave: () => void;
}) {
  const ariaLabel = item ? `${label}: ${formatItemId(item.id)}` : label;

  return (
    <div
      className={`w-20 h-20 rounded-lg border flex items-center justify-center relative ${
        item
          ? 'border-hytale-accent/50 bg-hytale-darker shadow-inner'
          : 'border-hytale-accent/20 bg-hytale-darker/50'
      }`}
      tabIndex={item ? 0 : undefined}
      aria-label={ariaLabel}
      onMouseEnter={item ? (e) => onHover(e, item) : undefined}
      onMouseLeave={onLeave}
      onFocus={item ? (e) => onHover(e, item) : undefined}
      onBlur={onLeave}
    >
      {item ? (
        <>
          <div className="w-16 h-16 p-0.5">
            <ItemIcon itemId={item.id} />
          </div>
          {item.maxDurability > 0 &&
            (() => {
              const pct = durabilityPercent(item.durability, item.maxDurability);
              return (
                <div
                  className="absolute bottom-0.5 left-1 right-1 h-1 bg-hytale-darker rounded-full"
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
      ) : (
        <span className="text-[9px] text-hytale-muted/40">{label}</span>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3 text-center">{icon}</span>
      <span className="text-[10px] text-hytale-muted w-12">{label}</span>
      <div
        className="flex-1 bg-hytale-darker rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-[10px] text-hytale-muted w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

export default function EquipmentTree({
  armor,
  utility,
  tool,
  stats,
  position,
  gameMode,
  world,
  respawnPoints,
  deathMarkers,
  discoveredZones,
}: EquipmentTreeProps) {
  const [hovered, setHovered] = useState<{ item: InventorySlot; x: number; y: number } | null>(
    null
  );

  function handleHover(e: React.MouseEvent | React.FocusEvent, item: InventorySlot) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHovered({ item, x: rect.left + rect.width / 2, y: rect.top });
  }

  function handleLeave() {
    setHovered(null);
  }

  const utilitySlots = Array.from({ length: 4 }, (_, i) => utility[i] ?? null);
  const toolSlot = tool[0] ?? null;

  return (
    <div>
      <div className="bg-hytale-darker/50 rounded-lg border border-hytale-accent/20 p-4">
        <div className="flex gap-5">
          {/* Left panel - Stats & Info */}
          <div className="w-64 flex-shrink-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-hytale-highlight uppercase tracking-wider">
                  {gameMode}
                </span>
                <span className="text-[10px] text-hytale-muted">|</span>
                <span className="text-[10px] text-hytale-muted">{world}</span>
              </div>
              <p className="text-[10px] text-hytale-muted">{formatCoords(position)}</p>
            </div>

            <div className="space-y-1.5">
              <StatRow label="Health" value={stats.health.current} color="bg-red-500" icon="+" />
              <StatRow
                label="Stamina"
                value={stats.stamina.current}
                color="bg-green-500"
                icon="~"
              />
              <StatRow label="Mana" value={stats.mana.current} color="bg-blue-500" icon="*" />
              <StatRow label="Oxygen" value={stats.oxygen.current} color="bg-cyan-500" icon="o" />
            </div>

            <div className="space-y-1.5 pt-1 border-t border-hytale-accent/10">
              {respawnPoints.length > 0 && (
                <div>
                  <span className="text-[9px] text-hytale-muted/60 uppercase tracking-wider">
                    Respawns
                  </span>
                  {respawnPoints.slice(0, 2).map((rp, i) => (
                    <p key={i} className="text-[10px] text-hytale-muted truncate">
                      {rp.world}: {formatCoords(rp.position)}
                    </p>
                  ))}
                  {respawnPoints.length > 2 && (
                    <p className="text-[10px] text-hytale-muted/50">
                      +{respawnPoints.length - 2} more
                    </p>
                  )}
                </div>
              )}
              {deathMarkers.length > 0 && (
                <div>
                  <span className="text-[9px] text-hytale-muted/60 uppercase tracking-wider">
                    Deaths
                  </span>
                  {deathMarkers.slice(0, 2).map((dm, i) => (
                    <p key={i} className="text-[10px] text-hytale-muted truncate">
                      Day {dm.day}: {formatCoords(dm.position)}
                    </p>
                  ))}
                  {deathMarkers.length > 2 && (
                    <p className="text-[10px] text-hytale-muted/50">
                      +{deathMarkers.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center - Equipment slots */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] text-hytale-muted/60 mb-0.5">Utility</span>
              {utilitySlots.map((item, i) => (
                <EquipmentSlot
                  key={`util-${i}`}
                  item={item}
                  label={`U${i + 1}`}
                  onHover={handleHover}
                  onLeave={handleLeave}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] text-hytale-muted/60 mb-0.5">Armor</span>
              {ARMOR_LABELS.map((label, i) => (
                <EquipmentSlot
                  key={label}
                  item={armor[i]}
                  label={label}
                  onHover={handleHover}
                  onLeave={handleLeave}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] text-hytale-muted/60 mb-0.5">Tool</span>
              <EquipmentSlot
                item={toolSlot}
                label="Tool"
                onHover={handleHover}
                onLeave={handleLeave}
              />
            </div>
          </div>

          {/* Right panel - Discovered Zones */}
          {discoveredZones.length > 0 && (
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-hytale-muted/60 uppercase tracking-wider">
                Discovered Zones ({discoveredZones.length})
              </span>
              <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5 pr-1">
                {discoveredZones.map((zone) => (
                  <div
                    key={zone}
                    className="text-[10px] bg-hytale-accent/20 text-hytale-text px-2 py-0.5 rounded truncate"
                  >
                    {zone.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {hovered && <ItemTooltip item={hovered.item} x={hovered.x} y={hovered.y} />}
    </div>
  );
}
