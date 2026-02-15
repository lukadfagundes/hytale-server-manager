import { useEffect } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import PlayerCard from '../components/players/PlayerCard';

export default function Players() {
  const { players, loading, errors, fetchPlayers } = useUniverseStore();

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const playerErrors = errors.players ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        <span className="text-sm text-hytale-muted">{players.length} player(s)</span>
      </div>

      {playerErrors.length > 0 && (
        <div
          role="alert"
          className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 space-y-1"
        >
          {playerErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {loading.players ? (
        <p className="text-hytale-muted">Loading player data...</p>
      ) : players.length === 0 ? (
        <p className="text-hytale-muted">No player data found in Server/universe/players/</p>
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
