export function getItemIconPath(itemId: string): string {
  return `/assets/items/${itemId}.png`;
}

export function getNpcPortraitPath(npcRole: string): string {
  return `/assets/npcs/${npcRole}.png`;
}

export function getMapMarkerPath(markerType: string): string {
  return `/assets/map-markers/${markerType}.png`;
}
