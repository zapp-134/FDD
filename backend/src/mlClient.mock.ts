/* LABELED_BY_TOOL
 * File: backend/src/mlClient.mock.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { SearchHit } from './types';
import fs from 'fs';
import path from 'path';

// Very small TF-IDF based fallback using natural JS (no heavy deps)
// We'll implement a naive bag-of-words vectorizer for the demo.

type Doc = { id: string; text: string; jobId: string; fileName: string };
let docs: Doc[] = [];

export async function ingestLocal(jobId: string, filePath: string, fileName: string) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    // naive chunking by 2000 chars
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 2000) chunks.push(text.slice(i, i + 2000));
    for (const c of chunks) {
      docs.push({ id: `${jobId}-${docs.length}`, text: c, jobId, fileName });
    }
    return { jobId, numChunks: chunks.length, indexed: true };
  } catch (e) {
    throw e;
  }
}

function score(query: string, docText: string) {
  const q = query.toLowerCase().split(/\W+/).filter(Boolean);
  const words = docText.toLowerCase().split(/\W+/).filter(Boolean);
  const set = new Set(words);
  let count = 0;
  for (const w of q) if (set.has(w)) count++;
  return count / Math.max(1, q.length);
}

export async function searchLocal(query: string, k = 5): Promise<SearchHit[]> {
  const scored = docs.map((d, i) => ({ d, s: score(query, d.text) }));
  scored.sort((a, b) => b.s - a.s);
  const hits: SearchHit[] = [];
  for (const s of scored.slice(0, k)) {
    if (s.s <= 0) continue;
    hits.push({ chunkId: s.d.id, jobId: s.d.jobId, fileName: s.d.fileName, score: s.s, snippet: s.d.text.slice(0, 300) });
  }
  return hits;
}

export async function generateLocal(jobId: string, question: string, topK = 5) {
  const hits = await searchLocal(question, topK);
  const answer = hits.map(h => h.snippet).join('\n\n');
  return { answer: answer || "I couldn't find relevant information.", sources: hits };
}
