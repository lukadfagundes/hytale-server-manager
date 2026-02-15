import { formatBytes, formatSpeed } from '../../renderer/utils/formatting';

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes (< 1 KB)', () => {
    expect(formatBytes(512)).toBe('512.0 B');
    expect(formatBytes(1)).toBe('1.0 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });

  it('should cap at GB for very large values', () => {
    // 1 TB should still show as GB since we only have up to GB in sizes array
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1024.0 GB');
  });
});

describe('formatSpeed', () => {
  it('should append /s to formatted bytes', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
    expect(formatSpeed(1024)).toBe('1.0 KB/s');
    expect(formatSpeed(5 * 1024 * 1024)).toBe('5.0 MB/s');
  });
});
