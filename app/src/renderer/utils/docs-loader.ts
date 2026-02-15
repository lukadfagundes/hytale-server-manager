/**
 * Vite build-time loader for documentation files.
 * This module uses import.meta.glob which is a Vite-only API.
 * It should be imported once at app startup to populate the docs index.
 *
 * Jest tests should NOT import this file -- they use setDocsModules() directly.
 */
import { setDocsModules } from './docs';

const modules = import.meta.glob('../../../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

setDocsModules(modules);
