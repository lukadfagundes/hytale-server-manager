import { useServerStore } from '../../stores/server-store';

export default function ServerStatusBadge() {
  const status = useServerStore((s) => s.status);

  const color =
    status === 'running'
      ? 'bg-green-500'
      : status === 'starting' || status === 'stopping'
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const label =
    status === 'running'
      ? 'Running'
      : status === 'starting'
        ? 'Starting...'
        : status === 'stopping'
          ? 'Stopping...'
          : 'Stopped';

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-hytale-muted">{label}</span>
    </div>
  );
}
