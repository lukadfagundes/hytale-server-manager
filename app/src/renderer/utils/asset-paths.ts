let itemIconMap: Record<string, string> | null = null;

async function loadIconMap(): Promise<Record<string, string>> {
  if (itemIconMap) return itemIconMap;
  try {
    const res = await fetch('asset:///item-icon-map.json');
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

export function getItemIconPath(itemId: string): string {
  const resolved = itemIconMap?.[itemId] ?? itemId;
  return `asset:///items/${resolved}.png`;
}

export { loadIconMap as itemIconMapReady };

export function getNpcPortraitPath(npcRole: string): string {
  return `asset:///npcs/${npcRole}.png`;
}

export function getMapMarkerPath(markerType: string): string {
  return `asset:///map-markers/${markerType}.png`;
}

export function reloadIconMap(): Promise<Record<string, string>> {
  itemIconMap = null;
  return loadIconMap();
}

export function resetIconMap(): void {
  itemIconMap = null;
}
