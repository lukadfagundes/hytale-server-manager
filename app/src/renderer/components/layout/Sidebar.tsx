import { NavLink } from 'react-router-dom';
import { useUpdaterStore } from '../../stores/updater-store';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '~' },
  { path: '/mods', label: 'Mods', icon: '&' },
  { path: '/players', label: 'Players', icon: '#' },
  { path: '/warps', label: 'Warps', icon: '@' },
];

export default function Sidebar() {
  const appVersion = useUpdaterStore((s) => s.appVersion);

  return (
    <aside className="w-56 bg-hytale-dark border-r border-hytale-accent/30 flex flex-col">
      <div className="p-4 border-b border-hytale-accent/30">
        <h1 className="text-lg font-bold text-hytale-highlight">HSM</h1>
        <p className="text-xs text-hytale-muted">Server Manager</p>
      </div>
      <nav aria-label="Main" className="flex-1 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-hytale-accent/40 text-hytale-text border-r-2 border-hytale-highlight'
                  : 'text-hytale-muted hover:text-hytale-text hover:bg-hytale-accent/20'
              }`
            }
          >
            <span className="w-5 text-center font-mono">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <nav aria-label="Documentation" className="py-2 border-t border-hytale-accent/30">
        <NavLink
          to="/docs"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isActive
                ? 'bg-hytale-accent/40 text-hytale-text border-r-2 border-hytale-highlight'
                : 'text-hytale-muted hover:text-hytale-text hover:bg-hytale-accent/20'
            }`
          }
        >
          <span className="w-5 text-center font-mono">?</span>
          <span>Docs</span>
        </NavLink>
      </nav>
      <div className="p-4 border-t border-hytale-accent/30">
        <p className="text-xs text-hytale-muted">v{appVersion}</p>
      </div>
    </aside>
  );
}
