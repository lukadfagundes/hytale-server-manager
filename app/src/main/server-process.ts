import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

type StatusCallback = (status: ServerStatus) => void;
type LogCallback = (entry: { line: string; stream: 'stdout' | 'stderr'; timestamp: number }) => void;

let childProcess: ChildProcess | null = null;
let currentStatus: ServerStatus = 'stopped';
let startTimestamp = 0;
const statusListeners: StatusCallback[] = [];
const logListeners: LogCallback[] = [];

const CRASH_THRESHOLD_MS = 30_000;

function setStatus(status: ServerStatus): void {
  currentStatus = status;
  statusListeners.forEach(cb => cb(status));
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.SERVER_STATUS, status);
  }
}

function pushLog(line: string, stream: 'stdout' | 'stderr'): void {
  const entry = { line, stream, timestamp: Date.now() };
  logListeners.forEach(cb => cb(entry));
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.SERVER_LOG, entry);
  }
}

function getProjectRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

export function start(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (currentStatus !== 'stopped') {
      reject(new Error(`Cannot start: server is currently ${currentStatus}`));
      return;
    }

    const projectRoot = getProjectRoot();
    const isWindows = process.platform === 'win32';
    const script = isWindows ? 'start.bat' : 'start.sh';
    const scriptPath = path.join(projectRoot, script);

    // Validate launcher script exists
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Launcher script not found: ${script}\nExpected at: ${scriptPath}`));
      return;
    }

    setStatus('starting');
    startTimestamp = Date.now();

    if (isWindows) {
      childProcess = spawn('cmd.exe', ['/c', scriptPath], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } else {
      childProcess = spawn('bash', [scriptPath], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }

    let startDetected = false;

    childProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        pushLog(line, 'stdout');
        if (!startDetected && (
          line.includes('Server started') ||
          line.includes('listening') ||
          line.includes('Done') ||
          line.includes('Listening on')
        )) {
          startDetected = true;
          setStatus('running');
        }
      }
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        pushLog(line, 'stderr');
      }
    });

    childProcess.on('close', (code) => {
      childProcess = null;
      const uptime = Date.now() - startTimestamp;

      if (code === 8) {
        pushLog('[Launcher] Server requested restart for update', 'stdout');
        setStatus('stopped');
        start().catch(console.error);
      } else if (code !== 0 && code !== null && uptime < CRASH_THRESHOLD_MS) {
        pushLog(`[Server] Crashed after ${Math.round(uptime / 1000)}s (exit code ${code}) — not auto-restarting`, 'stderr');
        setStatus('stopped');
      } else {
        if (code !== 0 && code !== null) {
          pushLog(`[Server] Exited with code ${code}`, 'stderr');
        }
        setStatus('stopped');
      }
    });

    childProcess.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      let msg = `Failed to start server: ${err.message}`;
      if (code === 'ENOENT') {
        msg = `Launcher script not found or not executable: ${scriptPath}`;
      } else if (code === 'EACCES') {
        msg = `Permission denied running launcher script: ${scriptPath}`;
      }
      pushLog(`[Server] ${msg}`, 'stderr');
      childProcess = null;
      setStatus('stopped');
      reject(new Error(msg));
    });

    resolve();
  });
}

export function stop(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!childProcess || currentStatus === 'stopped') {
      reject(new Error('Server is not running'));
      return;
    }

    setStatus('stopping');

    const killTimeout = setTimeout(() => {
      if (childProcess) {
        pushLog('[Launcher] Force-killing server (graceful stop timed out after 15s)', 'stderr');
        childProcess.kill('SIGKILL');
      }
    }, 15000);

    childProcess.on('close', () => {
      clearTimeout(killTimeout);
      resolve();
    });

    if (process.platform === 'win32') {
      if (childProcess.pid) {
        spawn('taskkill', ['/pid', childProcess.pid.toString(), '/T', '/F']);
      }
    } else {
      childProcess.kill('SIGTERM');
    }
  });
}

export function getStatus(): ServerStatus {
  return currentStatus;
}

export function onStatusChange(callback: StatusCallback): void {
  statusListeners.push(callback);
}

export function onLog(callback: LogCallback): void {
  logListeners.push(callback);
}
