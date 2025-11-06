#!/usr/bin/env node
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

function waitForPort(host, port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tryConnect() {
      const s = net.createConnection({ host, port }, () => {
        s.end();
        resolve(true);
      });
      s.on('error', (err) => {
        if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for ${host}:${port}`));
        setTimeout(tryConnect, 300);
      });
    })();
  });
}

function startProcess(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  p.on('exit', (code, sig) => {
    console.log(`Process ${cmd} ${args.join(' ')} exited with ${code || sig}`);
  });
  return p;
}

(async () => {
  try {
    const root = process.cwd();

    console.log('Starting ML service (uvicorn) in ml_service/');
    const ml = startProcess('python', ['-m', 'uvicorn', 'app:app', '--port', '8001'], { cwd: path.join(root, 'ml_service') });

    console.log('Waiting for ML service on 127.0.0.1:8001...');
    await waitForPort('127.0.0.1', 8001, 30000);
    console.log('ML service is up.');

    console.log('Starting compiled backend (node backend/dist/ingest.js)');
    const be = startProcess('node', ['dist/ingest.js'], { cwd: path.join(root, 'backend') });

    console.log('Waiting for backend on localhost:3001...');
    await waitForPort('127.0.0.1', 3001, 30000);
    console.log('Backend is up.');

    console.log('Starting frontend (vite) in frontend/');
    const fe = startProcess('npm', ['run', 'dev'], { cwd: path.join(root, 'frontend') });

    // Keep the script alive while child processes run
    process.on('SIGINT', () => {
      console.log('SIGINT received, killing child processes...');
      [ml, be, fe].forEach((p) => p && !p.killed && p.kill('SIGINT'));
      process.exit(0);
    });
  } catch (err) {
    console.error('dev-full failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
