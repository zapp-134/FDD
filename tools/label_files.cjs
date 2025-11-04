const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = ['node_modules', '.git', '.file_labels'];

const inlineExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.scss', '.html', '.md', '.txt', '.yml', '.yaml', '.sh', '.ps1', '.sql', '.go', '.java', '.rb', '.c', '.cpp', '.h']);
const nonCommentable = new Set(['.json', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz', '.woff', '.woff2', '.ico', '.bin', '.exe', '.dll', '.db', '.sqlite']);

function inferRole(rel) {
  if (rel.includes(path.join('backend', 'src'))) return 'Backend TypeScript source (server logic)';
  if (rel.includes(path.join('backend'))) return 'Backend project file (server)';
  if (rel.includes(path.join('src', 'components'))) return 'React component (UI)';
  if (rel.includes(path.join('src'))) return 'Frontend source (React + Vite)';
  if (rel.includes('public')) return 'Public static asset';
  if (rel.includes('mock-server')) return 'Local mock server for development/testing';
  if (rel.includes('tools')) return 'Developer tool / utility script';
  if (rel.endsWith('package.json')) return 'NPM package manifest for the project or package';
  if (rel.endsWith('docker-compose.yml')) return 'Docker Compose orchestration for local services';
  if (rel.endsWith('README.md')) return 'Repository README / documentation';
  if (rel.includes('components.json')) return 'Component manifest used by the app';
  if (rel.includes('backend') && rel.endsWith('.json')) return 'Backend JSON configuration or persisted artifact';
  return 'Project file — please open to see specific role';
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let results = [];
  for (const ent of entries) {
    if (SKIP.includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(await walk(full));
    } else if (ent.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function makeHeader(rel, role) {
  const lines = [];
  lines.push('LABELED_BY_TOOL');
  lines.push(`File: ${rel}`);
  lines.push(`Inferred role: ${role}`);
  lines.push('Note: auto-generated label. Please edit the file for a more accurate description.');
  return lines.join('\n');
}

function commentWrap(text, ext) {
  // Prefer block comment for JS/TS/Python-compatible files
  if (['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html', '.java', '.c', '.cpp', '.h', '.go', '.py', '.rb'].includes(ext)) {
    return `/* ${text.replace(/\n/g, '\n * ')} */\n\n`;
  }
  // Hash-style
  if (['.sh', '.ps1', '.py', '.yml', '.yaml', '.md', '.txt', '.sql'].includes(ext)) {
    return text.split('\n').map(l => `# ${l}`).join('\n') + '\n\n';
  }
  // Default to JS block comment
  return `/* ${text.replace(/\n/g, '\n * ')} */\n\n`;
}

async function ensureDir(d) {
  try { await fs.mkdir(d, { recursive: true }); } catch (e) {}
}

(async () => {
  console.log('Scanning repository for files...');
  const all = await walk(ROOT);
  const labelsDir = path.join(ROOT, '.file_labels');
  await ensureDir(labelsDir);
  let modified = 0;
  for (const file of all) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    // Skip this script itself
    if (rel === 'tools/label_files.cjs' || rel === 'tools/label_files.js') continue;

    const role = inferRole(rel);
    const headerText = makeHeader(rel, role);

    try {
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('LABELED_BY_TOOL')) {
        // already labeled
        continue;
      }
      if (inlineExt.has(ext)) {
        const wrapped = commentWrap(headerText, ext) + content;
        await fs.writeFile(file, wrapped, 'utf8');
        modified++;
        console.log(`Prepended header to: ${rel}`);
      } else if (nonCommentable.has(ext) || ext === '.json' || ext === '') {
        // create sidecar label
        const labelPath = path.join(labelsDir, rel + '.label.txt');
        await ensureDir(path.dirname(labelPath));
        const labelContent = `Auto-generated label for ${rel}\n\n${headerText}\n`;
        await fs.writeFile(labelPath, labelContent, 'utf8');
        modified++;
        console.log(`Created sidecar label for: ${rel} -> ${path.relative(ROOT, labelPath)}`);
      } else {
        // fallback to sidecar
        const labelPath = path.join(labelsDir, rel + '.label.txt');
        await ensureDir(path.dirname(labelPath));
        const labelContent = `Auto-generated label for ${rel}\n\n${headerText}\n`;
        await fs.writeFile(labelPath, labelContent, 'utf8');
        modified++;
        console.log(`Created sidecar label for: ${rel} -> ${path.relative(ROOT, labelPath)}`);
      }
    } catch (err) {
      console.error(`Failed to label ${rel}: ${err.message}`);
    }
  }
  console.log(`Labeling complete. Modified or created labels for ${modified} items.`);
})();
