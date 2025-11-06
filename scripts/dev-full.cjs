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
      s.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for ${host}:${port}`));
        setTimeout(tryConnect, 300);
      });
    })();
  });
}

function startProcess(cmd, args, opts = {}) {
  // Prefer shell:false to avoid deprecation warnings; allow per-call fallback to shell if spawn fails.
  try {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('exit', (code, sig) => {
      console.log(`Process ${cmd} ${args.join(' ')} exited with ${code || sig}`);
    });
    p.on('error', (err) => {
      console.error(`Failed to start ${cmd} ${args.join(' ')}:`, err && err.message ? err.message : err);
    });
    return p;
  } catch (err) {
    console.warn(`spawn failed for ${cmd} ${args.join(' ')}: ${err && err.message ? err.message : err}`);
    if (opts && opts.execFileFallback) {
      try {
        const { execFile } = require('node:child_process');
        const p2 = execFile(cmd, args, { cwd: opts.cwd, stdio: 'inherit' });
        p2.on('exit', (code, sig) => console.log(`Process ${cmd} ${args.join(' ')} exited with ${code || sig}`));
        p2.on('error', (e) => console.error(`execFile-fallback failed for ${cmd}:`, e && e.message ? e.message : e));
        return p2;
      } catch (e) {
        console.warn('execFile fallback failed:', e && e.message ? e.message : e);
      }
    }
    if (opts && opts.allowShellFallback) {
      console.log('Falling back to shell spawn for', cmd);
      const p2 = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
      p2.on('exit', (code, sig) => {
        console.log(`Process ${cmd} ${args.join(' ')} exited with ${code || sig}`);
      });
      p2.on('error', (e) => {
        console.error(`Shell-fallback failed for ${cmd}:`, e && e.message ? e.message : e);
      });
      return p2;
    }
    throw err;
  }
}

(async () => {
  try {
    const root = process.cwd();

    // If ports 8001 or 3001 are in use, attempt a best-effort cleanup so dev-full can start cleanly.
    function findPidForPort(port) {
      try {
        const { execSync } = require('node:child_process');
        const out = execSync('netstat -ano', { encoding: 'utf8' });
        const lines = out.split(/\r?\n/);
        for (const line of lines) {
          if (!line) continue;
          if (line.includes(':' + port)) {
            const cols = line.trim().split(/\s+/);
            const pid = cols[cols.length - 1];
            if (/^\d+$/.test(pid)) return Number(pid);
          }
        }
      } catch (e) {
        // ignore
      }
      return null;
    }

    function killPid(pid) {
      try {
        if (process.platform === 'win32') {
          const { execSync } = require('child_process');
          execSync(`taskkill /PID ${pid} /F`);
        } else {
          process.kill(pid, 'SIGTERM');
        }
        console.log(`Killed process ${pid} that was using a needed port`);
      } catch (e) {
        console.warn(`Failed to kill PID ${pid}:`, e && e.message ? e.message : e);
      }
    }

    const pid8001 = findPidForPort(8001);
    if (pid8001) {
      console.log(`Port 8001 is in use by PID ${pid8001}; attempting to terminate it for a clean dev run.`);
      killPid(pid8001);
    }
    const pid3001 = findPidForPort(3001);
    if (pid3001) {
      console.log(`Port 3001 is in use by PID ${pid3001}; attempting to terminate it for a clean dev run.`);
      killPid(pid3001);
    }
    const pid5173 = findPidForPort(5173);
    if (pid5173) {
      console.log(`Port 5173 is in use by PID ${pid5173}; attempting to terminate it so Vite can bind to 5173.`);
      killPid(pid5173);
    }

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
  // Start the frontend dev server in the frontend folder. Use npm run dev there.
  // Prefer the project's local vite binary to avoid invoking the root `dev` script which can spawn other services.
  const fs = require('node:fs');
  const frontendBin = path.join(root, 'frontend', 'node_modules', '.bin');
  let fe = null;
  if (process.platform === 'win32' && fs.existsSync(path.join(frontendBin, 'vite.cmd'))) {
    fe = startProcess(path.join(frontendBin, 'vite.cmd'), ['--port', '5173'], { cwd: path.join(root, 'frontend') });
  } else if (fs.existsSync(path.join(frontendBin, 'vite'))) {
    fe = startProcess(path.join(frontendBin, 'vite'), ['--port', '5173'], { cwd: path.join(root, 'frontend') });
  } else {
    // Fallback to npm run dev in the frontend folder (execFile or shell fallback allowed)
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    fe = startProcess(npmCmd, ['run', 'dev'], { cwd: path.join(root, 'frontend'), execFileFallback: true, allowShellFallback: true });
  }

    // Keep the script alive while child processes run
    process.on('SIGINT', () => {
      console.log('SIGINT received, killing child processes...');
      for (const p of [ml, be, fe]) {
        try {
          if (p && !p.killed) p.kill('SIGINT');
        } catch (e) {
          // ignore
        }
      }
      process.exit(0);
    });
  } catch (err) {
    console.error('dev-full failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
