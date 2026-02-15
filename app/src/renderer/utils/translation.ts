// Re-export from shared module for renderer compatibility
export { formatTranslationKey } from '@shared/translation';

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
