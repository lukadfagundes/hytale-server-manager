import {
  formatCoords,
  formatDate,
  formatBytes,
  formatDurability,
  durabilityPercent,
} from '../../renderer/utils/formatting';

describe('formatCoords', () => {
  it('should format coordinates with 1 decimal place', () => {
    expect(formatCoords({ x: 123.456, y: 78.9, z: -42.1 })).toBe('X: 123.5, Y: 78.9, Z: -42.1');
  });

  it('should handle zero coordinates', () => {
    expect(formatCoords({ x: 0, y: 0, z: 0 })).toBe('X: 0.0, Y: 0.0, Z: 0.0');
  });

  it('should handle negative coordinates', () => {
    expect(formatCoords({ x: -500.0, y: 30.0, z: 800.5 })).toBe('X: -500.0, Y: 30.0, Z: 800.5');
  });

  it('should round to 1 decimal', () => {
    // Note: 3.05.toFixed(1) === '3.0' due to IEEE 754 floating point
    expect(formatCoords({ x: 1.999, y: 2.001, z: 3.15 })).toBe('X: 2.0, Y: 2.0, Z: 3.1');
  });
});

describe('formatDate', () => {
  it('should format a Date object', () => {
    const date = new Date('2026-02-12T15:45:00Z');
    const result = formatDate(date);
    // Date formatting is locale-dependent, so check it contains expected parts
    expect(result).toContain('2026');
    expect(result).toContain('Feb');
    expect(result).toContain('12');
  });

  it('should format a numeric timestamp', () => {
    const timestamp = new Date('2026-01-15T10:30:00Z').getTime();
    const result = formatDate(timestamp);
    expect(result).toContain('2026');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});

describe('formatBytes', () => {
  it('should format bytes below 1KB', () => {
    expect(formatBytes(500)).toBe('500.0 B');
  });

  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format exactly 1KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(5120)).toBe('5.0 KB');
  });

  it('should format exactly 1MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('should format megabytes with decimals', () => {
    expect(formatBytes(27704274)).toBe('26.4 MB');
  });

  it('should format 1023 bytes as B', () => {
    expect(formatBytes(1023)).toBe('1023.0 B');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});

describe('formatDurability', () => {
  it('should format durability as current/max', () => {
    expect(formatDurability(85, 100)).toBe('85/100');
  });

  it('should return empty string when max is 0', () => {
    expect(formatDurability(0, 0)).toBe('');
  });

  it('should round decimals', () => {
    expect(formatDurability(85.5, 100.7)).toBe('86/101');
  });
});

describe('durabilityPercent', () => {
  it('should calculate percentage', () => {
    expect(durabilityPercent(75, 100)).toBe(75);
  });

  it('should return 100 when max is 0', () => {
    expect(durabilityPercent(0, 0)).toBe(100);
  });

  it('should round to nearest integer', () => {
    expect(durabilityPercent(33, 100)).toBe(33);
    expect(durabilityPercent(1, 3)).toBe(33);
  });

  it('should handle full durability', () => {
    expect(durabilityPercent(100, 100)).toBe(100);
  });
});
