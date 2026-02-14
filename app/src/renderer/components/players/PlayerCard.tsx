import { useState } from 'react';
import type { PlayerData } from '../../types/player';
import InventoryGrid from './InventoryGrid';
import EquipmentTree from './EquipmentTree';

interface PlayerCardProps {
  player: PlayerData;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-hytale-dark rounded-lg border border-hytale-accent/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-hytale-accent/10 transition-colors text-left"
      >
        <div>
          <span className="font-medium text-hytale-text">{player.name}</span>
          <span className="text-sm text-hytale-muted ml-3">{player.gameMode}</span>
          <span className="text-sm text-hytale-muted ml-3">World: {player.world}</span>
        </div>
        <span className="text-hytale-muted text-sm">{expanded ? '[-]' : '[+]'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-hytale-accent/20 pt-3">
          {/* Player HUD - Equipment + Stats + Info */}
          <EquipmentTree
            armor={player.armor}
            utility={player.inventory.utility}
            tool={player.inventory.tool}
            stats={player.stats}
            position={player.position}
            gameMode={player.gameMode}
            world={player.world}
            respawnPoints={player.respawnPoints}
            deathMarkers={player.deathMarkers}
            discoveredZones={player.discoveredZones}
          />

          {/* Inventory sections */}
          <div>
            <InventoryGrid
              label="Hotbar"
              items={player.inventory.hotbar}
              capacity={9}
              columns={9}
            />
            <InventoryGrid
              label="Backpack"
              items={player.inventory.backpack}
              capacity={9}
              columns={9}
            />
            <InventoryGrid
              label="Storage"
              items={player.inventory.storage}
              capacity={36}
              columns={9}
            />
          </div>
        </div>
      )}
    </div>
  );
}
