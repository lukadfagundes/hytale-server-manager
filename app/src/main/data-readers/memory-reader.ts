import fs from 'fs';
import path from 'path';

export interface Memory {
  npcRole: string;
  displayName: string;
  location: string;
  capturedAt: number;
  isNameOverridden: boolean;
}

export interface MemoriesResult {
  data: Memory[];
  error: string | null;
}

function formatTranslationKey(key: string): string {
  const parts = key.split('.');
  const meaningful = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
  return meaningful.replace(/_/g, ' ');
}

export function readGlobalMemories(serverDir: string): MemoriesResult {
  const filePath = path.join(serverDir, 'universe', 'memories.json');

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const memories = data.Memories ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Memory[] = memories.map((m: any) => ({
      npcRole: m.NPCRole ?? '',
      displayName: formatTranslationKey(m.TranslationKey ?? ''),
      location: formatTranslationKey(m.FoundLocationNameKey ?? ''),
      capturedAt: m.CapturedTimestamp ?? 0,
      isNameOverridden: m.IsMemoriesNameOverridden ?? false,
    }));

    return { data: parsed, error: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { data: [], error: null }; // File not existing is normal for fresh servers
    }
    const msg = err instanceof SyntaxError
      ? `Failed to parse memories.json: ${err.message}`
      : `Failed to read memories.json: ${(err as Error).message}`;
    return { data: [], error: msg };
  }
}
