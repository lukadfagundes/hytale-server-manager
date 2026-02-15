import { NavLink } from 'react-router-dom';
import { getCategories } from '../../utils/docs';

export default function DocsSidebar() {
  const categories = getCategories();

  return (
    <nav
      aria-label="Documentation categories"
      className="w-44 shrink-0 border-r border-hytale-accent/20 pr-4"
    >
      <ul className="space-y-1">
        <li>
          <NavLink
            to="/docs"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-hytale-accent/40 text-hytale-text'
                  : 'text-hytale-muted hover:text-hytale-text hover:bg-hytale-accent/20'
              }`
            }
          >
            All Docs
          </NavLink>
        </li>
        {categories.map((cat) => (
          <li key={cat.name}>
            <NavLink
              to={`/docs/${cat.name}`}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-hytale-accent/40 text-hytale-text'
                    : 'text-hytale-muted hover:text-hytale-text hover:bg-hytale-accent/20'
                }`
              }
            >
              <span>{cat.label}</span>
              <span className="text-xs opacity-60">{cat.count}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
