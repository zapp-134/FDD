const fs = require('fs');
const path = require('path');
const p = process.argv[2];
if (!p) {
  console.error('Usage: node rewrite-report.cjs <path-to-report.json>');
  process.exit(2);
}
const raw = fs.readFileSync(p, 'utf8');
let parsed;
try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }

function tryExtractFromParsed(parsed) {
  try {
    if (!parsed) return null;
    const cand = parsed.candidates && parsed.candidates[0];
    if (cand) {
      let txt = null;
      if (typeof cand.content === 'string') txt = cand.content;
      else if (Array.isArray(cand.content)) txt = cand.content.map(p => (typeof p === 'string' ? p : (p && (p.text || p.content)) || '')).join('\n');
      else if (cand.content && Array.isArray(cand.content.parts)) txt = cand.content.parts.map(p => p.text || '').join('\n');
      if (txt) {
        const m = String(txt).match(/```json\s*([\s\S]*?)```/i);
        const inner = m ? m[1].trim() : null;
        if (inner) {
          return JSON.parse(inner).report || JSON.parse(inner);
        }
      }
    }
    return null;
  } catch (e) { return null; }
}

let rep = null;
if (parsed) rep = parsed.report || tryExtractFromParsed(parsed) || parsed;
else {
  // try to extract code fence directly from raw text
  const m = raw.match(/```json\s*([\s\S]*?)```/i);
  if (m) {
    try { rep = JSON.parse(m[1]).report || JSON.parse(m[1]); } catch (e) { rep = null; }
  }
}

if (!rep) {
  console.error('Could not extract report object from', p);
  process.exit(3);
}

fs.writeFileSync(p, JSON.stringify(rep, null, 2), 'utf8');
console.log('Rewrote', p, 'with extracted report runId=', rep.runId || '<unknown>');
