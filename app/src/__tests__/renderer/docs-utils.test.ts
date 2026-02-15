import {
  extractTitle,
  extractPreview,
  getCategoryLabel,
  getCategories,
  getDocsByCategory,
  getDoc,
  setDocsModules,
} from '../../renderer/utils/docs';

// Mock import.meta.glob -- Jest doesn't support it, so we inject test data
const mockModules: Record<string, string> = {
  '../../../../docs/architecture/data-flow.md':
    '# Data Flow Patterns\n\nSequence diagrams covering server lifecycle.\n\n## Section Two\n\nMore content here.',
  '../../../../docs/architecture/component-hierarchy.md':
    '# Component Hierarchy\n\nReact 19 component tree with 4 pages and 16 components.\n\n```mermaid\ngraph TD\n```',
  '../../../../docs/architecture/ipc-channel-map.md':
    '# IPC Channel Map\n\nAll 30 IPC channels grouped by domain.',
  '../../../../docs/guides/getting-started.md':
    '# Getting Started\n\nDev environment setup and first run.',
  '../../../../docs/guides/installation.md':
    '# Installation Guide\n\nEnd-user download and install instructions.',
  '../../../../docs/modules/server-store.md':
    '# Server Store\n\nZustand store for server status and log management.',
  '../../../../docs/README.md': '# Project Documentation\n\nTechnical docs index.',
  '../../../../docs/CLAUDE.md': '# Claude Context\n\nAI context file.',
};

beforeEach(() => {
  setDocsModules(mockModules);
});

describe('extractTitle', () => {
  it('extracts title from first # heading', () => {
    expect(extractTitle('# My Title\n\nSome content', 'file.md')).toBe('My Title');
  });

  it('ignores ## headings and uses first # only', () => {
    expect(extractTitle('## Not This\n\n# Actual Title', 'file.md')).toBe('Actual Title');
  });

  it('falls back to formatted filename when no # heading', () => {
    expect(extractTitle('No heading here\nJust text', 'getting-started.md')).toBe(
      'Getting Started'
    );
  });

  it('falls back to formatted filename for empty content', () => {
    expect(extractTitle('', 'data-flow.md')).toBe('Data Flow');
  });

  it('trims whitespace from title', () => {
    expect(extractTitle('#   Spaced Title   \n', 'file.md')).toBe('Spaced Title');
  });
});

describe('extractPreview', () => {
  it('returns first non-heading paragraph', () => {
    expect(extractPreview('# Title\n\nFirst paragraph here.')).toBe('First paragraph here.');
  });

  it('skips headings, blank lines, and code fences', () => {
    expect(extractPreview('# Title\n\n```code\nfoo\n```\n\nActual preview.')).toBe(
      'Actual preview.'
    );
  });

  it('truncates long paragraphs to ~150 chars', () => {
    const long = 'A'.repeat(200);
    const preview = extractPreview(`# Title\n\n${long}`);
    expect(preview.length).toBeLessThanOrEqual(154); // 150 + "..."
    expect(preview).toMatch(/\.\.\.$/);
  });

  it('returns empty string for content with only headings', () => {
    expect(extractPreview('# Title\n## Subtitle\n### Sub-sub')).toBe('');
  });

  it('skips table rows and list items', () => {
    expect(extractPreview('# Title\n\n| col | col |\n- item\n\nActual text.')).toBe('Actual text.');
  });
});

describe('getCategoryLabel', () => {
  it('capitalizes single word', () => {
    expect(getCategoryLabel('architecture')).toBe('Architecture');
  });

  it('converts hyphenated to title case', () => {
    expect(getCategoryLabel('getting-started')).toBe('Getting Started');
  });

  it('handles already capitalized input', () => {
    expect(getCategoryLabel('API')).toBe('API');
  });
});

describe('getCategories', () => {
  it('returns all categories with correct counts', () => {
    const categories = getCategories();
    expect(categories).toHaveLength(3);

    const arch = categories.find((c) => c.name === 'architecture');
    expect(arch).toEqual({ name: 'architecture', label: 'Architecture', count: 3 });

    const guides = categories.find((c) => c.name === 'guides');
    expect(guides).toEqual({ name: 'guides', label: 'Guides', count: 2 });

    const modules = categories.find((c) => c.name === 'modules');
    expect(modules).toEqual({ name: 'modules', label: 'Modules', count: 1 });
  });

  it('excludes root-level README.md and CLAUDE.md', () => {
    const categories = getCategories();
    const names = categories.map((c) => c.name);
    expect(names).not.toContain('README');
    expect(names).not.toContain('CLAUDE');
  });

  it('returns categories sorted alphabetically by label', () => {
    const categories = getCategories();
    const labels = categories.map((c) => c.label);
    expect(labels).toEqual([...labels].sort());
  });
});

describe('getDocsByCategory', () => {
  it('returns docs for valid category', () => {
    const docs = getDocsByCategory('architecture');
    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.slug)).toContain('data-flow');
    expect(docs.map((d) => d.slug)).toContain('component-hierarchy');
    expect(docs.map((d) => d.slug)).toContain('ipc-channel-map');
  });

  it('extracts titles from # headings', () => {
    const docs = getDocsByCategory('architecture');
    const dataFlow = docs.find((d) => d.slug === 'data-flow');
    expect(dataFlow?.title).toBe('Data Flow Patterns');
  });

  it('extracts preview text', () => {
    const docs = getDocsByCategory('architecture');
    const dataFlow = docs.find((d) => d.slug === 'data-flow');
    expect(dataFlow?.preview).toBe('Sequence diagrams covering server lifecycle.');
  });

  it('returns empty array for unknown category', () => {
    expect(getDocsByCategory('nonexistent')).toEqual([]);
  });

  it('returns docs sorted by title', () => {
    const docs = getDocsByCategory('architecture');
    const titles = docs.map((d) => d.title);
    expect(titles).toEqual([...titles].sort());
  });
});

describe('getDoc', () => {
  it('returns content for valid category and slug', () => {
    const doc = getDoc('architecture', 'data-flow');
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe('Data Flow Patterns');
    expect(doc?.content).toContain('Sequence diagrams');
  });

  it('returns null for unknown slug', () => {
    expect(getDoc('architecture', 'nonexistent')).toBeNull();
  });

  it('returns null for unknown category', () => {
    expect(getDoc('nonexistent', 'data-flow')).toBeNull();
  });
});

describe('dynamic category discovery', () => {
  it('new subdirectory auto-surfaces as category', () => {
    setDocsModules({
      ...mockModules,
      '../../../../docs/tutorials/quick-start.md': '# Quick Start\n\nA tutorial.',
    });
    const categories = getCategories();
    const tutorials = categories.find((c) => c.name === 'tutorials');
    expect(tutorials).toEqual({ name: 'tutorials', label: 'Tutorials', count: 1 });
  });
});
