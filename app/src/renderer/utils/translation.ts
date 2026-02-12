/**
 * Extract a readable name from a Hytale i18n translation key.
 * e.g. 'server.npcRoles.Goblin_Hermit.name' → 'Goblin Hermit'
 * e.g. 'server.map.region.Zone3_Tier1' → 'Zone3 Tier1'
 */
export function formatTranslationKey(key: string): string {
  const parts = key.split('.');
  const meaningful = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
  return meaningful.replace(/_/g, ' ');
}

/**
 * Format a Hytale item ID into a readable name.
 * e.g. 'Weapon_Daggers_Adamantite' → 'Daggers Adamantite'
 * e.g. 'Armor_Cobalt_Head' → 'Cobalt Head'
 */
export function formatItemId(id: string): string {
  const parts = id.split('_');
  // Remove common prefixes
  const prefixes = ['Weapon', 'Armor', 'Tool', 'Food', 'Furniture', 'Potion', 'EditorTool'];
  if (prefixes.includes(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return parts.join(' ');
}
