import { useEffect, useState, useMemo } from 'react';
import { useUniverseStore } from '../stores/universe-store';
import MemoryCard from '../components/memories/MemoryCard';

type SortMode = 'newest' | 'oldest' | 'name';

export default function Memories() {
  const { memories, loading, fetchMemories } = useUniverseStore();
  const [activeTab, setActiveTab] = useState<string>('global');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const playerNames = Object.keys(memories.perPlayer);

  const activeMemories = useMemo(() => {
    const list = activeTab === 'global' ? memories.global : (memories.perPlayer[activeTab] ?? []);

    let filtered = list;
    if (search) {
      const q = search.toLowerCase();
      filtered = list.filter(
        (m) => m.displayName.toLowerCase().includes(q) || m.location.toLowerCase().includes(q),
      );
    }

    const sorted = [...filtered];
    if (sort === 'newest') sorted.sort((a, b) => b.capturedAt - a.capturedAt);
    else if (sort === 'oldest') sorted.sort((a, b) => a.capturedAt - b.capturedAt);
    else sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return sorted;
  }, [activeTab, memories, search, sort]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Memories</h1>

      {loading.memories ? (
        <p className="text-hytale-muted">Loading memories...</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                activeTab === 'global'
                  ? 'bg-hytale-accent/50 border-hytale-highlight text-white'
                  : 'border-hytale-accent/30 text-hytale-muted hover:text-hytale-text'
              }`}
            >
              All Memories ({memories.global.length})
            </button>
            {playerNames.map((name) => (
              <button
                key={name}
                onClick={() => setActiveTab(name)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  activeTab === name
                    ? 'bg-hytale-accent/50 border-hytale-highlight text-white'
                    : 'border-hytale-accent/30 text-hytale-muted hover:text-hytale-text'
                }`}
              >
                {name} ({memories.perPlayer[name].length}/48)
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by NPC name or location..."
              className="flex-1 bg-hytale-dark border border-hytale-accent/30 rounded-lg px-3 py-2 text-sm text-hytale-text placeholder-hytale-muted/50 focus:outline-none focus:border-hytale-highlight"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="bg-hytale-dark border border-hytale-accent/30 rounded-lg px-3 py-2 text-sm text-hytale-text focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Count */}
          <p className="text-xs text-hytale-muted">{activeMemories.length} memories</p>

          {/* Grid */}
          {activeMemories.length === 0 ? (
            <p className="text-hytale-muted">No memories found.</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeMemories.map((memory, i) => (
                <MemoryCard key={`${memory.npcRole}-${i}`} memory={memory} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
