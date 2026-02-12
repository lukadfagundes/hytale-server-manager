import type { Memory } from '../../types/memory';
import { formatDate } from '../../utils/formatting';
import NpcPortrait from './NpcPortrait';

interface MemoryCardProps {
  memory: Memory;
}

export default function MemoryCard({ memory }: MemoryCardProps) {
  return (
    <div
      className="bg-hytale-dark rounded-lg border border-hytale-accent/30 p-3 flex items-start gap-3"
      title={`Role: ${memory.npcRole}`}
    >
      <NpcPortrait npcRole={memory.npcRole} displayName={memory.displayName} />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-hytale-text">{memory.displayName}</h3>
        <p className="text-xs text-hytale-muted mt-1">{memory.location}</p>
        <p className="text-xs text-hytale-muted/70 mt-1">{formatDate(memory.capturedAt)}</p>
        {memory.isNameOverridden && (
          <span className="text-[10px] text-hytale-highlight mt-1 inline-block">Named</span>
        )}
      </div>
    </div>
  );
}
