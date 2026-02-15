# React Frontend

React 19 single-page application rendered in Electron's Chromium process. Bundled by Vite 6. Styled with Tailwind CSS 3 using a custom Hytale dark theme.

## Overview

The renderer provides a 4-page interface for managing a Hytale dedicated server: a dashboard with server controls and live logs, a player viewer with gear/stats, a warp directory, and a mod manager.

## Application Flow

```
App.tsx mounts
  -> init updater-store, config-store, asset-store
  -> if configStatus === 'loading': show loading spinner
  -> if configStatus === 'invalid': render <ServerSetup />
  -> if configStatus === 'valid': render HashRouter with Sidebar + Header + Routes
```

## Routing

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Server toggle + live log panel |
| `/players` | Players | Player cards with expandable gear/stats views |
| `/warps` | Warps | Warp list with sort-by-name/date toggles |
| `/mods` | ModManager | Mod grid with enable/disable toggles |

## Structure

```
renderer/
├── App.tsx                 # Root: routing, store init, config gate
├── main.tsx                # React createRoot entry point
├── index.html              # HTML shell
├── index.css               # Tailwind imports + base styles
├── pages/                  # 4 page-level components
│   ├── Dashboard.tsx
│   ├── Players.tsx
│   ├── Warps.tsx
│   └── ModManager.tsx
├── components/             # 17 reusable UI components
│   ├── layout/             # Header, Sidebar, ToastContainer
│   ├── server/             # ServerToggle, ServerStatus, LogPanel
│   ├── players/            # PlayerCard, EquipmentTree, InventoryGrid,
│   │                       # ItemIcon, ItemTooltip
│   ├── mods/               # ModCard
│   ├── warps/              # WarpCard
│   ├── setup/              # ServerSetup (first-run path selection)
│   └── updates/            # UpdateNotification (download/install modal)
├── stores/                 # 7 Zustand stores
│   ├── server-store.ts     # Server status + log buffer (1000 max)
│   ├── universe-store.ts   # Players, warps, world data + refresh listeners
│   ├── mod-store.ts        # Mod list + toggle actions
│   ├── asset-store.ts      # Asset extraction status
│   ├── config-store.ts     # Server path config
│   ├── updater-store.ts    # Auto-update lifecycle
│   └── toast-store.ts      # Toast notification queue
├── services/
│   └── ipc-client.ts       # Type-safe IPC wrapper (window.electronAPI)
├── types/                  # TypeScript interfaces
└── utils/
    ├── asset-paths.ts      # asset:// URL builders + icon map loader
    ├── formatting.ts       # Number/byte/date display formatters
    └── translation.ts      # Hytale i18n key -> readable name
```

## State Management

All 7 Zustand stores follow the same pattern:
- `init()` method called from `App.tsx` useEffect, returns cleanup function
- Store actions call `ipc-client` functions (never `window.electronAPI` directly)
- IPC event listeners update store state reactively

## Tailwind Theme

Custom Hytale color palette (`tailwind.config.ts`):

| Token | Hex | Usage |
|-------|-----|-------|
| `hytale-dark` | `#1a1a2e` | Primary background |
| `hytale-darker` | `#16162a` | Deepest background |
| `hytale-accent` | `#0f3460` | Blue accent |
| `hytale-highlight` | `#e94560` | Red alerts, active states |
| `hytale-text` | `#eaeaea` | Primary text |
| `hytale-muted` | `#8b8b9e` | Secondary text |

## Documentation

See [CLAUDE.md](CLAUDE.md) for store-to-IPC event mapping, asset protocol usage, and component details.
