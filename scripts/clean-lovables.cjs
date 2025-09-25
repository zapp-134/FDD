#!/usr/bin/env node
// Simple scanner to find remaining "lovable" tokens in the repo (CommonJS)
const fs = require('fs');
const path = require('path');

const tokens = ['lovable', 'Lovable', 'lovable-tagger', 'componentTagger'];
const root = path.resolve(__dirname, '..');
let found = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full);
    } else {
      try {
        const content = fs.readFileSync(full, 'utf8');
        tokens.forEach(token => {
          if (content.includes(token)) {
            found.push({ file: path.relative(root, full), token });
          }
        });
      } catch (e) {
        // ignore binary files
      }
    }
  }
}

walk(root);

if (found.length) {
  console.error('Found remaining tokens:');
  found.forEach(f => console.error(`${f.file}: ${f.token}`));
  process.exit(2);
} else {
  console.log('No remaining Lovable tokens found.');
  process.exit(0);
}
