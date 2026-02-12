import ServerStatusBadge from '../server/ServerStatus';

export default function Header() {
  return (
    <header className="h-12 bg-hytale-dark border-b border-hytale-accent/30 flex items-center justify-between px-6">
      <h2 className="text-sm font-medium text-hytale-text">Hytale Server Manager</h2>
      <ServerStatusBadge />
    </header>
  );
}
