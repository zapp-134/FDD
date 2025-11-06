const fs = require('fs');
const path = require('path');
const p = process.argv[2] || path.join(__dirname, '..', 'backend', 'reports', 'report_7ba086b3-3d5c-4ca8-b28a-4942c4aa3cf5.json');
const raw = fs.readFileSync(p, 'utf8');

function extractCandidateText(s) {
  if (!s) return null;
  // try code-fence first
  const m = s.match(/```json\s*([\s\S]*?)```/i);
  if (m && m[1]) return m[1];
  // try to find first { ... } balanced block
  const firstBrace = s.indexOf('{');
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) return s.slice(firstBrace, i + 1);
    }
  }
  return null;
}

function tryParseJsonText(txt) {
  if (!txt) return null;
  // Try direct parse
  try { return JSON.parse(txt); } catch (e) {}
  // Try iterative unescape and parse
  try {
    let candidate = String(txt);
    for (let i = 0; i < 6; i++) {
      try {
        const parsed = JSON.parse(candidate);
        return parsed;
      } catch (e) {
        // attempt unescape transforms
        const next = candidate.replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '\\r').replace(/\\\\t/g, '\\t').replace(/\\\\\"/g, '\\"').replace(/\\\\\\/g, '\\\\');
        if (next === candidate) break;
        candidate = next;
        // also try replacing single-escaped sequences into real ones and retry
        const final = candidate.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\"/g, '\"').replace(/\\\\/g, '\\');
        try { return JSON.parse(final); } catch (e2) { /* continue */ }
      }
    }
  } catch (e) {}
  // Final attempt: extract balanced braces and parse
  try {
    const first = txt.indexOf('{');
    if (first !== -1) {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = first; i < txt.length; i++) {
        const ch = txt[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth === 0) {
            const candidate = txt.slice(first, i + 1);
            return JSON.parse(candidate);
          }
        }
      }
    }
  } catch (e) {
    // swallow
  }
  return null;
}

// Find candidate content sections
let candidateText = null;
try {
  const obj = JSON.parse(raw);
  if (obj && obj.candidates && Array.isArray(obj.candidates) && obj.candidates[0]) {
    const c = obj.candidates[0];
    if (typeof c.content === 'string') candidateText = c.content;
    else if (Array.isArray(c.content)) candidateText = c.content.map(p => typeof p === 'string' ? p : (p && (p.text || p.content)) || '').join('\n');
    else if (c.content && Array.isArray(c.content.parts)) candidateText = c.content.parts.map(p => p.text || '').join('\n');
  }
} catch (e) {
  // raw not JSON, fall back to direct string search
}
if (!candidateText) candidateText = extractCandidateText(raw) || raw;

// If candidateText looks like a quoted JSON string (starts with "{), strip surrounding quotes
if (candidateText && candidateText.trim().startsWith('\"{')) {
  // remove leading and trailing quote if present
  if (candidateText.trim().endsWith('\"')) {
    candidateText = candidateText.trim();
    candidateText = candidateText.substring(1, candidateText.length - 1);
  }
}

let parsed = tryParseJsonText(candidateText);
if (!parsed) {
  console.error('Failed to reliably parse embedded JSON');
  process.exit(3);
}

const report = parsed.report || parsed;
console.log('=== parsed report summary ===');
console.log('runId:', report.runId || report.run_id);
console.log('kpis:', report.kpis ? JSON.stringify(report.kpis, null, 2) : '<none>');
console.log('redFlags:', report.redFlags ? JSON.stringify(report.redFlags, null, 2) : '<none>');
console.log('\n=== full parsed report object ===');
console.log(JSON.stringify(report, null, 2));
