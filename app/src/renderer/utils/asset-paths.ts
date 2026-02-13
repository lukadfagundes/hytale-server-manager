let itemIconMap: Record<string, string> | null = null;

async function loadIconMap(): Promise<Record<string, string>> {
  if (itemIconMap) return itemIconMap;
  try {
    const res = await fetch('/assets/item-icon-map.json');
    if (res.ok) {
      itemIconMap = await res.json();
    } else {
      itemIconMap = {};
    }
  } catch {
    itemIconMap = {};
  }
  return itemIconMap!;
}

// Eagerly start loading the map on module import
const mapReady = loadIconMap();

export function getItemIconPath(itemId: string): string {
  const resolved = itemIconMap?.[itemId] ?? itemId;
  return `/assets/items/${resolved}.png`;
}

export { mapReady as itemIconMapReady };

export function getNpcPortraitPath(npcRole: string): string {
  return `/assets/npcs/${npcRole}.png`;
}

export function getMapMarkerPath(markerType: string): string {
  return `/assets/map-markers/${markerType}.png`;
}
