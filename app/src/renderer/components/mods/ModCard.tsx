import { formatBytes } from '../../utils/formatting';
import { useServerStore } from '../../stores/server-store';

interface ModCardProps {
  name: string;
  enabled: boolean;
  hasStateFile: boolean;
  sizeBytes: number;
  onToggle: (enabled: boolean) => void;
}

export default function ModCard({ name, enabled, hasStateFile, sizeBytes, onToggle }: ModCardProps) {
  const serverStatus = useServerStore((s) => s.status);
  const isServerRunning = serverStatus === 'running' || serverStatus === 'starting';

  return (
    <div className="bg-hytale-dark rounded-lg border border-hytale-accent/30 p-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-hytale-text">{name}</h3>
        <div className="flex gap-3 mt-1">
          <span className="text-xs text-hytale-muted">{formatBytes(sizeBytes)}</span>
          {hasStateFile && <span className="text-xs text-hytale-accent">Has state</span>}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => onToggle(!enabled)}
          disabled={isServerRunning}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 rounded-full peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all ${
          isServerRunning
            ? 'bg-gray-600 after:bg-gray-400 cursor-not-allowed'
            : enabled
            ? 'bg-green-600 after:bg-white after:translate-x-full'
            : 'bg-gray-500 after:bg-gray-300'
        }`} />
      </label>
    </div>
  );
}
