import type { Position } from '../types/player';

export function formatCoords(pos: Position): string {
  return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
}

export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDurability(current: number, max: number): string {
  if (max === 0) return '';
  return `${Math.round(current)}/${Math.round(max)}`;
}

export function durabilityPercent(current: number, max: number): number {
  if (max === 0) return 100;
  return Math.round((current / max) * 100);
}
