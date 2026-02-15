/**
 * Tests for docs component logic -- validates link resolution,
 * utility function edge cases, and component file existence.
 */
import fs from 'fs';
import path from 'path';
import {
  extractTitle,
  extractPreview,
  getCategoryLabel,
  getCategories,
  getDocsByCategory,
  getDoc,
  setDocsModules,
} from '../../renderer/utils/docs';

// Verify component files exist at expected paths
describe('docs component files', () => {
  const componentsDir = path.join(__dirname, '../../renderer/components/docs');
  const pagesDir = path.join(__dirname, '../../renderer/pages');

  it('MermaidDiagram.tsx exists', () => {
    expect(fs.existsSync(path.join(componentsDir, 'MermaidDiagram.tsx'))).toBe(true);
  });

  it('MarkdownViewer.tsx exists', () => {
    expect(fs.existsSync(path.join(componentsDir, 'MarkdownViewer.tsx'))).toBe(true);
  });

  it('DocsSidebar.tsx exists', () => {
    expect(fs.existsSync(path.join(componentsDir, 'DocsSidebar.tsx'))).toBe(true);
  });

  it('Docs.tsx page exists', () => {
    expect(fs.existsSync(path.join(pagesDir, 'Docs.tsx'))).toBe(true);
  });
});

// Test the link resolution logic used by MarkdownViewer
describe('MarkdownViewer link resolution logic', () => {
  function resolveLink(href: string, basePath: string): string | null {
    if (href.startsWith('http://') || href.startsWith('https://')) return null;
    if (href.startsWith('#')) return null;
    if (!href.endsWith('.md')) return null;

    if (href.startsWith('../')) {
      const stripped = href.replace(/^(\.\.\/)+/, '');
      return `/docs/${stripped.replace(/\.md$/, '')}`;
    }

    if (href.includes('/')) {
      return `/docs/${href.replace(/\.md$/, '')}`;
    }

    return `${basePath}/${href.replace(/\.md$/, '')}`;
  }

  it('resolves same-category .md links', () => {
    expect(resolveLink('data-flow.md', '/docs/architecture')).toBe('/docs/architecture/data-flow');
  });

  it('resolves cross-category ../category/file.md links', () => {
    expect(resolveLink('../architecture/data-flow.md', '/docs/guides')).toBe(
      '/docs/architecture/data-flow'
    );
  });

  it('resolves links with category path prefix', () => {
    expect(resolveLink('architecture/data-flow.md', '/docs/guides')).toBe(
      '/docs/architecture/data-flow'
    );
  });

  it('returns null for external links', () => {
    expect(resolveLink('https://example.com', '/docs/guides')).toBeNull();
    expect(resolveLink('http://example.com', '/docs/guides')).toBeNull();
  });

  it('returns null for anchor links', () => {
    expect(resolveLink('#section', '/docs/guides')).toBeNull();
  });

  it('returns null for non-.md links', () => {
    expect(resolveLink('image.png', '/docs/guides')).toBeNull();
  });

  it('strips multiple ../ prefixes', () => {
    expect(resolveLink('../../architecture/data-flow.md', '/docs/guides')).toBe(
      '/docs/architecture/data-flow'
    );
  });
});

// Additional edge case tests for docs utilities
describe('docs utility edge cases', () => {
  beforeEach(() => {
    setDocsModules({
      '../../../../docs/architecture/data-flow.md': '# Data Flow\n\nContent here.',
      '../../../../docs/guides/getting-started.md': '## Only H2\n\nNo h1 heading present.',
      '../../../../docs/modules/server-store.md': '',
      '../../../../docs/README.md': '# Root README',
      '../../../../docs/CLAUDE.md': '# Claude Context',
    });
  });

  it('extractTitle falls back for content with only ## headings', () => {
    expect(extractTitle('## Only H2\n\nNo h1', 'getting-started.md')).toBe('Getting Started');
  });

  it('extractTitle falls back for empty content', () => {
    expect(extractTitle('', 'server-store.md')).toBe('Server Store');
  });

  it('extractPreview returns empty for empty content', () => {
    expect(extractPreview('')).toBe('');
  });

  it('getCategoryLabel handles multi-hyphen names', () => {
    expect(getCategoryLabel('my-cool-category')).toBe('My Cool Category');
  });

  it('getDoc returns null for root README', () => {
    // README.md is at root level, not in a category
    expect(getDoc('README', 'README')).toBeNull();
  });

  it('getCategories excludes root files', () => {
    const categories = getCategories();
    expect(categories.map((c) => c.name)).not.toContain('README');
    expect(categories.map((c) => c.name)).not.toContain('CLAUDE');
  });

  it('getDocsByCategory with empty module returns empty', () => {
    setDocsModules({});
    expect(getDocsByCategory('architecture')).toEqual([]);
    expect(getCategories()).toEqual([]);
  });
});
