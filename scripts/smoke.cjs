const http = require('http');

function check(url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      resolve({ url, ok, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ url, ok: false, error: err.message }));
    req.setTimeout(timeout, () => {
      req.abort();
      resolve({ url, ok: false, error: 'timeout' });
    });
  });
}

async function main() {
  const targets = [
    { name: 'frontend', url: 'http://localhost:5173/' },
    { name: 'backend', url: 'http://localhost:4000/health' }
  ];

  for (const t of targets) {
    process.stdout.write(`Checking ${t.name} ${t.url} ... `);
    const r = await check(t.url, 7000);
    if (r.ok) {
      console.log(`OK (${r.status})`);
    } else {
      console.error(`FAIL: ${r.error || 'status ' + r.status}`);
      process.exitCode = 2;
      return;
    }
  }
  console.log('All checks passed');
}

main();
