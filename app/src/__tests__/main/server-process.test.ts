import { EventEmitter } from 'events';

// Mock electron before importing server-process
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('fs');
jest.mock('child_process');

import fs from 'fs';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

const mockFs = jest.mocked(fs);
const mockSpawn = jest.mocked(spawn);

// We need to re-import server-process fresh for each test to reset module state
// Since the module has module-level state (currentStatus, childProcess), we use jest.isolateModules
function getModule() {
  let mod: typeof import('../../main/server-process');
  jest.isolateModules(() => {
    // Re-mock electron in isolated context
    jest.doMock('electron', () => ({
      BrowserWindow: {
        getAllWindows: jest.fn().mockReturnValue([]),
      },
    }));
    mod = require('../../main/server-process');
  });
  return mod!;
}

function createMockProcess(): ChildProcess & EventEmitter {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = 12345;
  proc.kill = jest.fn();
  return proc;
}

describe('server-process', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getStatus', () => {
    it('should return stopped initially', () => {
      const mod = getModule();
      expect(mod.getStatus()).toBe('stopped');
    });
  });

  describe('start', () => {
    it('should set status to starting and spawn the correct script', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const startPromise = mod.start();

      // start() resolves immediately after spawning
      await startPromise;

      expect(mod.getStatus()).toBe('starting');
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('should reject when server is not stopped', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      await mod.start();

      // Try to start again while 'starting'
      await expect(mod.start()).rejects.toThrow('Cannot start: server is currently starting');
    });

    it('should reject when launcher script does not exist', async () => {
      const mod = getModule();
      mockFs.existsSync.mockReturnValue(false);

      await expect(mod.start()).rejects.toThrow('Launcher script not found');
    });

    it('should transition to running when startup keyword detected in stdout', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      await mod.start();

      expect(mod.getStatus()).toBe('starting');

      // Simulate server printing startup message
      mockProc.stdout.emit('data', Buffer.from('Server started on port 5520\n'));

      expect(mod.getStatus()).toBe('running');
    });

    it('should detect multiple startup keywords', async () => {
      const mod = getModule();

      for (const keyword of ['Server started', 'listening', 'Done', 'Listening on']) {
        const freshMod = getModule();
        const proc = createMockProcess();
        mockFs.existsSync.mockReturnValue(true);
        mockSpawn.mockReturnValue(proc as any);

        await freshMod.start();
        proc.stdout.emit('data', Buffer.from(`${keyword}\n`));

        expect(freshMod.getStatus()).toBe('running');
      }
    });

    it('should set status to stopped on process close', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      await mod.start();

      // Advance time past crash threshold
      jest.advanceTimersByTime(31000);
      mockProc.emit('close', 0);

      expect(mod.getStatus()).toBe('stopped');
    });

    it('should detect crash when exit within 30 seconds with non-zero code', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const statusChanges: string[] = [];
      mod.onStatusChange((s) => statusChanges.push(s));

      await mod.start();

      // Simulate crash within 30s
      jest.advanceTimersByTime(5000);
      mockProc.emit('close', 1);

      expect(mod.getStatus()).toBe('stopped');
      // Should have: 'starting' → 'stopped' (crash, no auto-restart)
      expect(statusChanges).toContain('starting');
      expect(statusChanges).toContain('stopped');
    });

    it('should log entries with correct stream type', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const logs: { line: string; stream: string }[] = [];
      mod.onLog((entry) => logs.push({ line: entry.line, stream: entry.stream }));

      await mod.start();

      mockProc.stdout.emit('data', Buffer.from('info line\n'));
      mockProc.stderr.emit('data', Buffer.from('error line\n'));

      expect(logs).toContainEqual(expect.objectContaining({ line: 'info line', stream: 'stdout' }));
      expect(logs).toContainEqual(expect.objectContaining({ line: 'error line', stream: 'stderr' }));
    });

    it('should handle spawn ENOENT error', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const startPromise = mod.start();

      const err = new Error('spawn ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockProc.emit('error', err);

      // start() already resolved, but status should be stopped
      await startPromise;
      expect(mod.getStatus()).toBe('stopped');
    });

    it('should handle spawn EACCES error', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const logs: string[] = [];
      mod.onLog((entry) => logs.push(entry.line));

      await mod.start();

      const err = new Error('Permission denied') as NodeJS.ErrnoException;
      err.code = 'EACCES';
      mockProc.emit('error', err);

      expect(mod.getStatus()).toBe('stopped');
      expect(logs.some(l => l.includes('Permission denied'))).toBe(true);
    });
  });

  describe('stop', () => {
    it('should reject when server is not running', async () => {
      const mod = getModule();

      await expect(mod.stop()).rejects.toThrow('Server is not running');
    });

    it('should set status to stopping', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      await mod.start();

      // Don't await stop — just call it
      const stopPromise = mod.stop();

      expect(mod.getStatus()).toBe('stopping');

      // Simulate process closing
      mockProc.emit('close', 0);
      await stopPromise;

      expect(mod.getStatus()).toBe('stopped');
    });

    it('should send kill signal to child process', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      await mod.start();

      const stopPromise = mod.stop();

      if (process.platform === 'win32') {
        // On Windows, stop() spawns taskkill instead of SIGTERM
        expect(mockSpawn).toHaveBeenCalledWith(
          'taskkill',
          expect.arrayContaining(['/pid', '12345', '/T', '/F']),
        );
      } else {
        expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      }

      mockProc.emit('close', 0);
      await stopPromise;
    });
  });

  describe('onStatusChange', () => {
    it('should register and call status callbacks', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const statuses: string[] = [];
      mod.onStatusChange((s) => statuses.push(s));

      await mod.start();

      expect(statuses).toContain('starting');
    });
  });

  describe('onLog', () => {
    it('should register and call log callbacks with timestamps', async () => {
      const mod = getModule();
      const mockProc = createMockProcess();
      mockFs.existsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockProc as any);

      const entries: { line: string; stream: string; timestamp: number }[] = [];
      mod.onLog((entry) => entries.push(entry));

      await mod.start();
      mockProc.stdout.emit('data', Buffer.from('test line\n'));

      expect(entries).toHaveLength(1);
      expect(entries[0].line).toBe('test line');
      expect(entries[0].stream).toBe('stdout');
      expect(typeof entries[0].timestamp).toBe('number');
    });
  });
});
