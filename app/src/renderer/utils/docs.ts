/**
 * Build-time documentation loader and indexer.
 *
 * In Vite (dev/build), import.meta.glob bundles all docs as raw strings.
 * In Jest, tests call setDocsModules() to inject mock data before importing.
 *
 * All parsing functions are pure and testable independently of Vite.
 */

let docsModules: Record<string, string> = {};

/** Inject the docs module map. Called by Vite loader or tests. */
export function setDocsModules(modules: Record<string, string>): void {
  docsModules = modules;
}

/** Get the current modules map (for components that need raw access) */
export function getDocsModules(): Record<string, string> {
  return docsModules;
}

export interface DocCategory {
  name: string;
  label: string;
  count: number;
}

export interface DocEntry {
  slug: string;
  title: string;
  preview: string;
}

export interface DocContent {
  title: string;
  content: string;
}

/**
 * Parse a glob key into category and slug.
 * Key format: ../../../../docs/architecture/data-flow.md
 * Returns null for root-level files (no subdirectory).
 */
function parseKey(key: string): { category: string; slug: string } | null {
  const docsIndex = key.indexOf('docs/');
  if (docsIndex === -1) return null;

  const relativePath = key.slice(docsIndex + 5);
  const parts = relativePath.split('/');

  // Root-level files have only 1 part -- exclude them
  if (parts.length < 2) return null;

  const category = parts[0];
  const filename = parts[parts.length - 1];
  const slug = filename.replace(/\.md$/, '');

  return { category, slug };
}

/** Format a directory name as a human-readable label */
export function getCategoryLabel(dirName: string): string {
  return dirName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Extract the title from markdown content (first # heading) or format the filename */
export function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) return match[1].trim();
  }
  return getCategoryLabel(filename.replace(/\.md$/, ''));
}

/** Extract a preview from markdown content (first non-heading, non-empty paragraph) */
export function extractPreview(content: string): string {
  const lines = content.split('\n');
  let inCodeFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('<')) continue;
    if (trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) continue;
    if (trimmed.startsWith('|')) continue;

    const maxLen = 150;
    if (trimmed.length > maxLen) {
      return trimmed.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
    }
    return trimmed;
  }
  return '';
}

/** Get all documentation categories with their doc counts */
export function getCategories(): DocCategory[] {
  const categoryMap = new Map<string, number>();

  for (const key of Object.keys(docsModules)) {
    const parsed = parseKey(key);
    if (!parsed) continue;
    categoryMap.set(parsed.category, (categoryMap.get(parsed.category) ?? 0) + 1);
  }

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      label: getCategoryLabel(name),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Get all documents in a category */
export function getDocsByCategory(category: string): DocEntry[] {
  const docs: DocEntry[] = [];

  for (const [key, content] of Object.entries(docsModules)) {
    const parsed = parseKey(key);
    if (!parsed || parsed.category !== category) continue;

    const filename = key.split('/').pop() ?? '';
    docs.push({
      slug: parsed.slug,
      title: extractTitle(content, filename),
      preview: extractPreview(content),
    });
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

/** Get a single document's content */
export function getDoc(category: string, slug: string): DocContent | null {
  for (const [key, content] of Object.entries(docsModules)) {
    const parsed = parseKey(key);
    if (!parsed || parsed.category !== category || parsed.slug !== slug) continue;

    const filename = key.split('/').pop() ?? '';
    return {
      title: extractTitle(content, filename),
      content,
    };
  }
  return null;
}
