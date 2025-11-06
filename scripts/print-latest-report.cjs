const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '..', 'backend', 'reports');
if (!fs.existsSync(reportsDir)) {
  console.error('No reports directory found:', reportsDir);
  process.exit(1);
}
const files = fs.readdirSync(reportsDir)
  .filter(f => f.startsWith('report_') && f.endsWith('.json'))
  .map(f => ({ name: f, mtime: fs.statSync(path.join(reportsDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);
if (!files.length) {
  console.error('No report files found in', reportsDir);
  process.exit(1);
}
const latest = files[0].name;
const runId = latest.replace(/^report_(.*)\.json$/, '$1');
console.log(runId);
