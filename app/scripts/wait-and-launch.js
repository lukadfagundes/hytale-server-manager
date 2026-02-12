const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const VITE_URL = 'http://localhost:5173';
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

let retries = 0;

function checkServer() {
  http.get(VITE_URL, (res) => {
    if (res.statusCode === 200) {
      console.log('Vite dev server is ready. Launching Electron...');
      const electronPath = require('electron');
      const child = spawn(electronPath, ['.'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, VITE_DEV_SERVER_URL: VITE_URL },
        stdio: 'inherit',
      });
      child.on('close', (code) => {
        process.exit(code);
      });
    } else {
      retry();
    }
  }).on('error', () => {
    retry();
  });
}

function retry() {
  retries++;
  if (retries >= MAX_RETRIES) {
    console.error('Timed out waiting for Vite dev server.');
    process.exit(1);
  }
  setTimeout(checkServer, RETRY_INTERVAL);
}

checkServer();
