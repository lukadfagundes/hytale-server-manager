export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

export interface LogEntry {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}
