export default function Header() {
  return (
    <header className="h-12 bg-hytale-dark border-b border-hytale-accent/30 flex items-center justify-between px-6">
      <h2 className="text-sm font-medium text-hytale-text">Hytale Server Manager</h2>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-hytale-muted">Stopped</span>
      </div>
    </header>
  );
}
