import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import PlayerCard from '../components/players/PlayerCard';

export default function Players() {
  const { players, loading, fetchPlayers } = useUniverseStore();

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <span className="text-sm text-hytale-muted">{players.length} player(s)</span>
      </div>

      {loading.players ? (
        <p className="text-hytale-muted">Loading player data...</p>
      ) : players.length === 0 ? (
        <p className="text-hytale-muted">No player data found.</p>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <PlayerCard key={player.uuid} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}
