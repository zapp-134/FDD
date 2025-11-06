/* LABELED_BY_TOOL
 * File: backend/src/mlClient.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import { ProcessFileResult, GenerateResult, SearchHit } from './mlClient.types';
import * as mock from './mlClient.mock';
import path from 'path';

// Usage tracking to avoid unexpected provider costs. This is a conservative,
// local-only guard that persists a simple daily counter in backend/data/llm_usage.json.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const USAGE_FILE = path.join(DATA_DIR, 'llm_usage.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

/**
 * Verify that the configured Gemini model exists and supports the generateContent
 * method. This is a lightweight preflight check that logs a warning if the
 * model is missing or doesn't support generation. Returns true when the model
 * looks healthy.
 */
export async function verifyModelHealth(): Promise<boolean> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const modelEnv = process.env.GEMINI_MODEL || 'models/gemini-2.5-pro';
  const GEMINI_MODEL_PATH = modelEnv.startsWith('models/') ? modelEnv : `models/${modelEnv}`;
  const url = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL_PATH}` + (GEMINI_KEY ? `?key=${encodeURIComponent(GEMINI_KEY)}` : '');
  const headers: any = { 'Content-Type': 'application/json' };
  // Prefer ADC if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !GEMINI_KEY) {
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      const client = await auth.getClient();
      const tokenRes = await client.getAccessToken();
      const accessToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes && (tokenRes as any).token) ? (tokenRes as any).token : null;
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    } catch (e) {
      console.warn('verifyModelHealth: failed to obtain ADC token', e);
    }
  }

  try {
    const resp = await axios.get(url, { headers, timeout: 10000 });
    if (resp && resp.status === 200 && resp.data) {
      const methods = resp.data.supportedGenerationMethods || resp.data.supportedGeneration || [];
      const ok = Array.isArray(methods) && methods.includes('generateContent');
      if (!ok) console.warn(`verifyModelHealth: model ${GEMINI_MODEL_PATH} does not advertize generateContent; methods=${JSON.stringify(methods)}`);
      else console.info(`verifyModelHealth: model ${GEMINI_MODEL_PATH} supports generateContent`);
      return ok;
    }
    console.warn(`verifyModelHealth: unexpected response for ${GEMINI_MODEL_PATH}: ${resp && resp.status}`);
    return false;
  } catch (err: any) {
    const status = err && err.response && err.response.status ? err.response.status : 'unknown';
    console.warn(`verifyModelHealth: failed to fetch model ${GEMINI_MODEL_PATH}: ${status}`);
    return false;
  }
}

function readUsage(): any {
  try {
    ensureDataDir();
    if (!fs.existsSync(USAGE_FILE)) return { date: today(), counts: {} };
    const raw = fs.readFileSync(USAGE_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return { date: today(), counts: {} };
  }
}

function writeUsage(u: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(USAGE_FILE, JSON.stringify(u, null, 2), 'utf8');
  } catch (e) {
    // best-effort
  }
}

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function incrementUsage(provider: string, tokensUsed = 0) {
  const u = readUsage();
  if (u.date !== today()) {
    u.date = today();
    u.counts = {};
  }
  if (!u.counts[provider]) u.counts[provider] = { calls: 0, tokens: 0 };
  u.counts[provider].calls += 1;
  u.counts[provider].tokens += tokensUsed;
  writeUsage(u);
  return u.counts[provider];
}

function getUsageFor(provider: string) {
  const u = readUsage();
  if (!u.counts) return { calls: 0, tokens: 0 };
  return u.counts[provider] || { calls: 0, tokens: 0 };
}

const BASE = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
const USE_MOCK = process.env.USE_ML_CLIENT_MOCK === 'true';
const ML_HTTP_TIMEOUT = Number(process.env.ML_HTTP_TIMEOUT_MS || '15000');

function makeClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    timeout: ML_HTTP_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Exponential backoff with small jitter
async function retry<T>(fn: () => Promise<T>, attempts = 3, backoffMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const base = backoffMs * Math.pow(2, i);
      const jitter = Math.floor(Math.random() * Math.min(1000, base));
      const wait = base + jitter;
      console.warn(`mlClient.retry: attempt ${i + 1} failed, retrying in ${wait}ms:`, err && err.message ? err.message : err);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export async function processFile(jobId: string, filePath: string, fileName: string): Promise<ProcessFileResult> {
  if (USE_MOCK) return mock.ingestLocal(jobId, filePath, fileName) as unknown as ProcessFileResult;
  const client = makeClient();

  // Prefer sending the absolute file path so the ML service (running locally) can read it directly.
  // If the environment explicitly requires sending file content (e.g., ML runs remotely), set ML_SEND_BASE64=true.
  const sendBase64 = (process.env.ML_SEND_BASE64 || 'false').toLowerCase() === 'true';
  const absPath = path.resolve(filePath);

  return retry(async () => {
    try {
      const payload: any = { jobId, file_name: fileName };
      if (sendBase64) {
        // include content as base64 only when explicitly requested
        const b = await fs.promises.readFile(absPath);
        payload.content_base64 = b.toString('base64');
      } else {
        payload.file_path = absPath;
      }

      const resp = await client.post('/process-file', payload);
      if (resp.status >= 200 && resp.status < 300) return resp.data as { jobId: string; numChunks: number; indexed: boolean };
      throw new Error(`ML service responded with status ${resp.status}`);
    } catch (err: any) {
      // If ML is unreachable and fallback is explicitly allowed, use local mock.
      const code = err?.code || err?.response?.status;
      if ((code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 502 || code === 503 || code === 504) && process.env.ALLOW_ML_HTTP_FALLBACK === 'true') {
        console.warn('mlClient.processFile: ML unreachable, falling back to local mock (ALLOW_ML_HTTP_FALLBACK=true)');
        return mock.ingestLocal(jobId, filePath, fileName) as unknown as ProcessFileResult;
      }
      throw err;
    }
  });
}

export async function search(query: string, k = 5): Promise<SearchHit[]> {
  if (USE_MOCK) return mock.searchLocal(query, k);
  const client = makeClient();
  return retry(async () => {
    try {
      const resp = await client.get('/search', { params: { q: query, k } });
      if (resp.status >= 200 && resp.status < 300) return resp.data.hits as SearchHit[];
      throw new Error(`ML service responded with status ${resp.status}`);
    } catch (err: any) {
      if ((err && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) && process.env.ALLOW_ML_HTTP_FALLBACK === 'true') return mock.searchLocal(query, k);
      throw err;
    }
  });
}

/**
 * Lightweight ML availability probe. Returns true when ML service responds to a simple search request.
 * Respects USE_MOCK and returns true immediately when mocking is enabled.
 */
export async function ensureMlAvailable(timeoutMs = 5000): Promise<boolean> {
  if (USE_MOCK) return true;
  const client = makeClient();
  try {
    // Prefer an explicit health endpoint if present for faster deterministic probes
    try {
      const h = await client.get('/health', { timeout: Math.min(timeoutMs, 2000) });
      if (h && h.status >= 200 && h.status < 300) return true;
    } catch (e) {
      // ignore and fallthrough to search probe
    }
    // fallback: perform a cheap search query; if the ML service is up it should return quickly (possibly empty hits)
    const resp = await client.get('/search', { params: { q: '__health_check__', k: 1 }, timeout: timeoutMs });
    return !!resp && resp.status >= 200 && resp.status < 300;
  } catch (err: any) {
    console.warn('mlClient.ensureMlAvailable: probe failed', err?.message ?? err);
    return false;
  }
}

export async function generate(jobId: string, question: string, topK = 5): Promise<GenerateResult> {
  if (USE_MOCK) return mock.generateLocal(jobId, question, topK) as unknown as GenerateResult;
  const client = makeClient();
  return retry(async () => {
    try {
      const resp = await client.post('/generate', { jobId, question, topK });
      if (resp.status >= 200 && resp.status < 300) return resp.data as GenerateResult;
      throw new Error(`ML service responded with status ${resp.status}`);
    } catch (err: any) {
      if (err && err.code === 'ECONNREFUSED' && process.env.ALLOW_ML_HTTP_FALLBACK === 'true') return mock.generateLocal(jobId, question, topK) as unknown as GenerateResult;
      throw err;
    }
  });
}

/**
 * Ask the ML service to produce a structured report + analysis JSON for the given job.
 * The ML service may return text that contains JSON; this helper attempts to extract and parse it.
 * If parsing fails, it will throw an error so the caller can decide how to proceed.
 */
// Helper: extract JSON substring (reused by parsing helper)
const tryExtractJson = (s: string): string | null => {
  const codeBlock = s.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlock && codeBlock[1]) return codeBlock[1].trim();
  const firstBrace = s.indexOf('{');
  if (firstBrace === -1) return null;
  let depth = 0;
  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      return s.slice(firstBrace, i + 1);
    }
  }
  return null;
};

// --- Helper functions for generateReport ---
async function callGeminiAPI(jobId: string, docText: string, topK: number): Promise<any> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-pro';
  const GEMINI_MODEL_PATH = GEMINI_MODEL.startsWith('models/') ? GEMINI_MODEL : `models/${GEMINI_MODEL}`;

  const prompt = `You are an analyst assistant. The following is assembled document text for job ${jobId}. It may contain CSV rows, invoices, receipts, and transactions. Carefully analyze the numeric data and text and produce a single JSON object only. The JSON MUST have two top-level keys: "report" and "analysis".

"report" must include: runId (string), createdAt (ISO timestamp), completedAt (ISO timestamp), summary (short 1-2 sentence executive summary), kpis (object of named KPI keys to numeric or human-friendly string values), redFlags (array of objects with id,title,severity (low|medium|high),description), trends (array of {title,description}), files (array of filenames).

"analysis" must include structured sections (array) with titles and content and optionally insights (array of short strings).

Important: return ONLY valid JSON. Do not emit any explanatory text. Use ISO timestamps, numeric values where appropriate, and keep summaries concise. If you cannot find relevant data, set report.status = "Failed" and provide an explanation in analysis with recommended next steps.

Document content:\n${docText}\n`;
  const geminiPayload: any = {
    contents: [ { role: 'user', parts: [{ text: prompt }] } ]
  };

  let url = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL_PATH}:generateContent`;
  const headers: any = { 'Content-Type': 'application/json' };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !GEMINI_KEY) {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ['https://www.googleapis.com/auth/generative-language', 'https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const accessToken = typeof tokenRes === 'string' ? tokenRes : (tokenRes && (tokenRes as any).token) ? (tokenRes as any).token : null;
    if (!accessToken) throw new Error('Failed to obtain access token for Gemini via ADC');
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (GEMINI_KEY) {
    url += `?key=${encodeURIComponent(GEMINI_KEY)}`;
  }

  try {
    const loggedHeaders = { ...headers };
    if (loggedHeaders.Authorization) loggedHeaders.Authorization = '[REDACTED]';
    console.info('Calling Gemini URL:', url);
    console.info('Gemini payload preview:', { promptPreview: String(prompt).slice(0, 200) });
  } catch (e) {
    // ignore
  }
  // Optional transient simulation for local dev/testing. Two modes supported:
  // 1) SIMULATE_GEMINI_TRANSIENTS=true -> randomly simulate a single transient 503 once per process
  // 2) FORCE_SIMULATE_GEMINI_TRANSIENTS=true -> deterministically simulate a single transient 503 once per jobId
  // Both modes are only active when NODE_ENV !== 'production'. Keep behavior limited so retries can exercise fallback logic.
  try {
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    // Module-scoped marker for job-level deterministic simulation. Use a Map to
    // track how many times we've simulated for a given job so we can simulate
    // a single transient and then return a mocked successful response (so
    // retry/fallback flow can be exercised deterministically without calling
    // the real Gemini API with test keys).
    (global as any).__force_simulated_gemini_jobs__ = (global as any).__force_simulated_gemini_jobs__ || new Map<string, number>();
    if (nodeEnv !== 'production') {
      if ((process.env.FORCE_SIMULATE_GEMINI_TRANSIENTS || '').toLowerCase() === 'true') {
        const seen: Map<string, number> = (global as any).__force_simulated_gemini_jobs__;
        const cnt = seen.get(jobId) || 0;
        if (cnt === 0) {
          // First call for this job -> simulate a transient 503
          seen.set(jobId, 1);
          console.warn(`Deterministic simulated transient 503 for job ${jobId} (FORCE_SIMULATE_GEMINI_TRANSIENTS=true)`);
          const se: any = new Error('Simulated transient 503 (forced)');
          se.response = { status: 503, data: 'Simulated transient 503 (forced)' };
          throw se;
        }
        if (cnt === 1) {
          // Second call for this job -> return a mocked successful Gemini-like response
          seen.set(jobId, 2);
          console.info(`Deterministic simulated Gemini success for job ${jobId} (FORCE_SIMULATE_GEMINI_TRANSIENTS=true)`);
          // Return a shape that extractTextFromGemini can handle. Provide JSON string in candidates[0].content
          return {
            candidates: [ { content: JSON.stringify({ report: { runId: jobId, createdAt: new Date().toISOString(), summary: 'Simulated report' }, analysis: { sections: [] } }) } ]
          };
        }
        // If >1, fall through to actual network call
      } else if ((process.env.SIMULATE_GEMINI_TRANSIENTS || '').toLowerCase() === 'true') {
        // simulate at most once per process to avoid flapping
        if (!(global as any).__simulated_gemini_transient__) {
          // 50% chance to simulate
          if (Math.random() < 0.5) {
            (global as any).__simulated_gemini_transient__ = true;
            console.warn('Simulated transient 503 (SIMULATE_GEMINI_TRANSIENTS=true)');
            const se: any = new Error('Simulated transient 503');
            se.response = { status: 503, data: 'Simulated transient 503' };
            throw se;
          }
          // mark even when we decide not to simulate so subsequent calls won't simulate again
          (global as any).__simulated_gemini_transient__ = true;
        }
      }
    }
    const resp = await axios.post(url, geminiPayload, { headers, timeout: 60000 });
    return resp.data;
  } catch (err: any) {
    // Normalize error with classification info
    const status = err?.response?.status;
    const rawData = err?.response?.data;
    const rawErr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
    const e = new Error(`Gemini request failed: ${status || err?.code || 'unknown'}`);
    (e as any).raw = rawErr;
    (e as any).status = status;
    if (status === 429 || status === 503) (e as any).isTransient = true;
    if (status === 400 || status === 401 || status === 403 || status === 404) (e as any).isAuthOrModel = true;
    throw e;
  }
}

function extractTextFromGemini(data: any): string {
  try {
    if (data?.candidates && Array.isArray(data.candidates) && data.candidates[0]) {
      const c = data.candidates[0];
      if (typeof c.content === 'string') return c.content;
      if (Array.isArray(c.content)) {
        const txtParts: string[] = [];
        for (const part of c.content) {
          if (typeof part === 'string') txtParts.push(part);
          else if (part && (part.text || part.content)) txtParts.push(part.text || part.content);
        }
        if (txtParts.length) return txtParts.join('\n');
      }
      if (typeof c.output_text === 'string') return c.output_text;
    }
    if (data?.output && Array.isArray(data.output) && data.output[0] && Array.isArray(data.output[0].content)) {
      const parts: string[] = [];
      for (const chunk of data.output[0].content) {
        if (chunk && (chunk.text || chunk.markup || chunk.content)) parts.push(chunk.text || chunk.markup || chunk.content);
      }
      if (parts.length) return parts.join('\n');
    }
    if (typeof data.output_text === 'string') return data.output_text;
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  } catch (e) {
    return JSON.stringify(data);
  }
}

function parseGeminiResponse(textOut: string): { report: any; analysis: any | null; raw: string } {
  const jsonText = tryExtractJson(String(textOut)) || String(textOut);
  // Try direct parse then recovery strategies
  try {
    const parsed = JSON.parse(jsonText);
    return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: String(textOut) };
  } catch (parseErr) {
    // double parse
    try {
      const once = JSON.parse(jsonText);
      if (typeof once === 'string') {
        const parsed = JSON.parse(once);
        return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: String(textOut) };
      }
    } catch (e) { /* ignore */ }
    // iterative unescape
    try {
      let candidate = String(jsonText);
      for (let i = 0; i < 4; i++) {
        const next = candidate.replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '\\r').replace(/\\\\t/g, '\\t').replace(/\\\\\"/g, '\\"').replace(/\\\\\\\\/g, '\\\\');
        if (next === candidate) break;
        candidate = next;
      }
      const final = candidate.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\\t').replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
      const parsed = JSON.parse(final);
      return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: String(textOut) };
    } catch (e) {
      // Final fallback: try progressively JSON.parse unwrapping if the model returned an escaped JSON string
      try {
        let candidate2 = String(jsonText);
        for (let i = 0; i < 6; i++) {
          try {
            const maybe = JSON.parse(candidate2);
            if (typeof maybe === 'string') {
              candidate2 = maybe;
              continue;
            }
            // parsed to an object
            return { report: (maybe as any).report || maybe, analysis: (maybe as any).analysis || null, raw: String(textOut) };
          } catch (e2) {
            // try simple unescape and loop
            const next = candidate2.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            if (next === candidate2) break;
            candidate2 = next;
          }
        }
      } catch (e3) {
        // fall through to try a balanced-brace extraction strategy below
      }

      // Final attempt: extract the nearest balanced JSON object from the raw text
      try {
        const rawStr = String(textOut);
        const extractBalanced = (s: string): string | null => {
          let idx = s.indexOf('{');
          while (idx !== -1) {
            let depth = 0;
            let inString = false;
            let escape = false;
            for (let i = idx; i < s.length; i++) {
              const ch = s[i];
              if (escape) {
                escape = false;
                continue;
              }
              if (ch === '\\') { escape = true; continue; }
              if (ch === '"') { inString = !inString; continue; }
              if (!inString) {
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
                if (depth === 0) return s.slice(idx, i + 1);
              }
            }
            idx = s.indexOf('{', idx + 1);
          }
          return null;
        };
        const candidate = extractBalanced(rawStr);
        if (candidate) {
          const parsed = JSON.parse(candidate);
          return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: String(textOut) };
        }
      } catch (e4) {
        // ignore and fall through
      }
      throw parseErr;
    }
  }
}

function classifyProviderError(err: any) {
  const status = err?.status;
  return {
    isTransient: status === 429 || status === 503 || !!err?.isTransient,
    isAuthOrModel: status === 400 || status === 401 || status === 403 || status === 404 || !!err?.isAuthOrModel,
    status,
    raw: err?.raw || null,
  };
}

async function handleFallback(jobId: string, topK: number) {
  // call local ml_service.generate fallback and parse output
  const gen = await generate(jobId, `Produce a JSON object with two top-level fields: "report" and "analysis". Return ONLY valid JSON. Ensure runId equals the provided jobId.`, topK);
  const text = gen.answer || '';
  const jsonText = tryExtractJson(text) || text;
  try {
    const parsed = JSON.parse(jsonText);
    return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: text };
  } catch (err) {
    const e = new Error('Failed to parse JSON from ML generate output');
    (e as any).raw = text;
    throw e;
  }
}

export async function generateReport(jobId: string, topK = 10): Promise<{ report: any; analysis: any | null; raw: string }> {
  const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MAX_CALLS = Number(process.env.LLM_MAX_CALLS_PER_DAY || '100');
  const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS_PER_CALL || '1024');
  const LLM_FAIL_OPEN = (process.env.LLM_FAIL_OPEN || 'true').toLowerCase() !== 'false';

  // If provider is Gemini
  if (LLM_PROVIDER === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    const usage = getUsageFor('gemini');
    if (usage.calls >= MAX_CALLS) {
      const e = new Error(`LLM daily call limit reached (${usage.calls} >= ${MAX_CALLS}); using local generator`);
      (e as any).budgetExceeded = true;
      throw e;
    }

    // assemble document
  // Ask the local indexer to assemble a larger context and prioritize numeric/tabular content
  const assembleQuestion = `Assemble up to ${Math.min(8000, topK * 1000)} characters of the most relevant text for job ${jobId}. Prioritize CSV rows, invoice/receipt/transaction numeric rows and headers. Return plain concatenated text.`;
  const gen = await generate(jobId, assembleQuestion, Math.max(topK, 15));
    const docText = gen?.answer || '';

    // Try callGeminiAPI with retry-then-fallback
    let lastErr: any = null;
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const out = await callGeminiAPI(jobId, docText, topK);
        const textOut = extractTextFromGemini(out);
        const parsed = parseGeminiResponse(textOut);
        try { incrementUsage('gemini', MAX_TOKENS); } catch (e) { /* best-effort */ }
        return parsed;
      } catch (err: any) {
        lastErr = err;
        // Log detailed raw error for diagnostics (helps debug 500s or provider responses)
        try {
          const raw = err?.raw || err?.response?.data || err?.message || err;
          console.error('Gemini provider call error (raw):', typeof raw === 'string' ? raw.slice(0, 2000) : JSON.stringify(raw).slice(0, 2000));
        } catch (e) {
          console.error('Gemini provider call error (failed to stringify error)');
        }
        const cls = classifyProviderError(err);
        // If hard auth/model error -> fail immediately
        if (cls.isAuthOrModel) {
          throw err;
        }
        // transient
        if (cls.isTransient) {
          if (attempt < maxRetries) {
            console.warn(`Transient provider error (attempt ${attempt + 1}/${maxRetries}) - retrying in 2s:`, err.message || err);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          // final retry exhausted
          if (!LLM_FAIL_OPEN) throw err;
          console.warn('Transient provider error after retries — falling back to local generator');
          return await handleFallback(jobId, topK);
        }
        // other provider errors: respect LLM_FAIL_OPEN
        if (!LLM_FAIL_OPEN) throw err;
        console.warn('Provider error and LLM_FAIL_OPEN=true — falling back to local generator', err.message || err);
        return await handleFallback(jobId, topK);
      }
    }
    // if we reached here, rethrow lastErr
    throw lastErr || new Error('Unknown provider error');
  }

  // Fallback path or OpenAI path (if configured)
  if (LLM_PROVIDER === 'openai' && OPENAI_KEY) {
    // Keep original OpenAI flow for now (unchanged)
    const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS_PER_CALL || '1024');
    const usage = getUsageFor('openai');
    if (usage.calls >= MAX_CALLS) {
      const e = new Error(`LLM daily call limit reached (${usage.calls} >= ${MAX_CALLS}); using local generator`);
      (e as any).budgetExceeded = true;
      throw e;
    }
    const gen = await generate(jobId, `Assemble relevant document content for job ${jobId}.`, topK);
    const docText = gen?.answer || '';
    const system = `You are an assistant that MUST output valid JSON only. Do not output any explanatory text.`;
    const user = `Document content:\n${docText}\n\nNow generate a JSON object with top-level fields \"report\" and \"analysis\".\nEnsure runId equals ${jobId}. Use ISO timestamps. Return ONLY valid JSON.`;
    const openaiResp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
      temperature: 0.0,
      max_tokens: MAX_TOKENS,
    }, { headers: { Authorization: `Bearer ${OPENAI_KEY}` }, timeout: 60000 });
    const out = openaiResp?.data?.choices?.[0]?.message?.content || '';
    const jsonText = tryExtractJson(out) || out;
    const parsed = JSON.parse(jsonText);
    try { incrementUsage('openai', MAX_TOKENS); } catch (e) { /* best-effort */ }
    return { report: parsed.report || parsed, analysis: parsed.analysis || null, raw: out };
  }

  // Default: call local generator
  return await handleFallback(jobId, topK);
}
