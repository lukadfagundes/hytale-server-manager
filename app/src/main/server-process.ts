import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/constants';

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

type StatusCallback = (status: ServerStatus) => void;
type LogCallback = (entry: { line: string; stream: 'stdout' | 'stderr'; timestamp: number }) => void;

let childProcess: ChildProcess | null = null;
let currentStatus: ServerStatus = 'stopped';
const statusListeners: StatusCallback[] = [];
const logListeners: LogCallback[] = [];

function setStatus(status: ServerStatus): void {
  currentStatus = status;
  statusListeners.forEach(cb => cb(status));
  // Push to all renderer windows
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
  // app/ is at <projectRoot>/app, so go up one level
  return path.resolve(__dirname, '..', '..', '..');
}

export function start(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (currentStatus !== 'stopped') {
      reject(new Error(`Cannot start: server is ${currentStatus}`));
      return;
    }

    setStatus('starting');
    const projectRoot = getProjectRoot();
    const isWindows = process.platform === 'win32';
    const script = isWindows ? 'start.bat' : 'start.sh';
    const scriptPath = path.join(projectRoot, script);

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
        // Detect server ready state
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
      if (code === 8) {
        pushLog('[Launcher] Server requested restart for update', 'stdout');
        setStatus('stopped');
        // Auto-restart for updates
        start().catch(console.error);
      } else {
        if (code !== 0 && code !== null) {
          pushLog(`[Server] Exited with code ${code}`, 'stderr');
        }
        setStatus('stopped');
      }
    });

    childProcess.on('error', (err) => {
      pushLog(`[Server] Failed to start: ${err.message}`, 'stderr');
      childProcess = null;
      setStatus('stopped');
      reject(err);
    });

    // Resolve immediately - the server is "starting"
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
        pushLog('[Launcher] Force-killing server (timeout)', 'stderr');
        childProcess.kill('SIGKILL');
      }
    }, 15000);

    childProcess.on('close', () => {
      clearTimeout(killTimeout);
      resolve();
    });

    if (process.platform === 'win32') {
      // On Windows, use taskkill for the process tree
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
