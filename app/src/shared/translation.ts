/**
 * Extract a readable name from a Hytale i18n translation key.
 *
 * Hytale translation keys use dot-separated paths where the meaningful
 * segment is typically the second-to-last part. For short keys (1-2 segments),
 * we fall back to the last segment.
 *
 * @example
 * formatTranslationKey('server.npcRoles.Goblin_Hermit.name') // → 'Goblin Hermit'
 * formatTranslationKey('server.map.region.Zone3_Tier1')      // → 'Zone3 Tier1'
 * formatTranslationKey('item.Sword')                         // → 'Sword'
 * formatTranslationKey('')                                   // → ''
 */
export function formatTranslationKey(key: string): string {
  if (!key) return '';
  const parts = key.split('.');
  const meaningful = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
  return meaningful.replace(/_/g, ' ');
}
