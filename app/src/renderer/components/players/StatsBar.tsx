interface StatsBarProps {
  label: string;
  current: number;
  max?: number;
  color: string;
}

export default function StatsBar({ label, current, max, color }: StatsBarProps) {
  const displayMax = max ?? current;
  const percent = displayMax > 0 ? Math.min(100, (current / displayMax) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-hytale-muted w-16">{label}</span>
      <div className="flex-1 bg-hytale-darker rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-hytale-muted w-16 text-right">
        {Math.round(current)}
        {displayMax !== current ? `/${Math.round(displayMax)}` : ''}
      </span>
    </div>
  );
}
