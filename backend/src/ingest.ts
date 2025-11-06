import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import * as mlClient from './mlClient';
import * as reportGenerator from './reportGenerator';
import chatRouter from './chat';
import { addJob, updateJob, getJob, getAllJobs } from './jobStore';

// Types
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Job {
  jobId: string;
  files: string[];
  status: JobStatus;
  progress: number; // 0-100
  createdAt: string; // ISO
  updatedAt: string; // ISO
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface Report {
  runId: string;
  createdAt: string;
  completedAt?: string;
  summary: string;
  kpis: Record<string, string>;
  redFlags: Array<{ id: string; title: string; severity: string; description: string; evidence?: Array<{ doc: string; snippet?: string }> }>;
  trends: Array<{ title: string; description: string }>;
  files: string[];
}

interface Analysis {
  analysisId: string;
  reportRunId: string;
  createdAt: string;
  sections: Array<{ title: string; content: string }>;
  insights: string[];
}

// Paths (computed relative to this file)
// Use __dirname to compute the backend root reliably regardless of current working directory.
const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');
const REPORTS = path.join(ROOT, 'reports');
const ANALYSIS = path.join(ROOT, 'analysis');
const JOBS_FILE = path.join(ROOT, 'jobs.json');

// Note: avoid performing filesystem side-effects at module-import time. Move
// directory creation and initial file writes into `ensureStorage()` which is
// invoked when the server is started directly. This reduces surprises when the
// module is imported by tests or other tools.
export async function ensureStorage(): Promise<void> {
  try {
    for (const dir of [UPLOADS, REPORTS, ANALYSIS]) {
      if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
    }

    // Initialize jobs.json if missing
    if (!fs.existsSync(JOBS_FILE)) {
      await fs.promises.writeFile(JOBS_FILE, JSON.stringify({ jobs: [] }, null, 2), 'utf8');
    }
  } catch (err) {
    // Do not throw here — surface errors when starting server instead. Tests can
    // call ensureStorage() and handle errors as needed.
    console.warn('ensureStorage encountered an error', err && (err as any).message ? (err as any).message : err);
  }
}

// Multer setup
const ALLOWED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${uuidv4()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES) || 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.pdf', '.csv', '.xls', '.xlsx', '.txt', '.md'];
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    if (allowedExt.includes(ext)) return cb(null, true);
    // fallback: accept if content type is missing but extension looks valid
    return cb(new Error(`Unsupported file type: ${file.mimetype || 'unknown'} (ext ${ext})`));
  },
});

// --- Local numeric analysis helpers (work without Gemini) ---
// These perform parsing of CSV/text uploads to compute source-aware totals and
// surface straightforward red flags (duplicates, negatives, outliers).
async function readTextFile(p: string): Promise<string> {
  try {
    return await fs.promises.readFile(p, 'utf8');
  } catch (e) {
    return '';
  }
}

function extractNumbersFromLine(line: string): number[] {
  // Find numbers like 1,234.56 or -1234.56 or 1234
  const matches = line.match(/-?\$?[0-9][0-9,]*\.?[0-9]*/g);
  if (!matches) return [];
  return matches.map((s) => {
    const cleaned = s.replace(/[^0-9\-\.]/g, '');
    const n = Number(cleaned.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }).filter((n) => Number.isFinite(n));
}

async function computeLocalKpisAndFlags(uploadDir: string, files: string[]) {
  // Helper: simple CSV parse (sufficient for our samples)
  const parseCsv = (txt: string) => {
    const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) return { header: [] as string[], rows: [] as string[][] };
    const header = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((ln) => ln.split(',').map((c) => c.trim()));
    return { header, rows };
  };

  const hashOf = (txt: string) => crypto.createHash('sha1').update(txt).digest('hex');

  // Classify CSV by header signature
  const classify = (header: string[]) => {
    const lower = header.map((h) => h.toLowerCase());
    const has = (k: string) => lower.includes(k);
    if (has('invoiceid') && has('duedate') && has('amount')) return 'invoices';
    if (has('vendor') && has('description') && has('amount')) return 'receipts';
    if (has('category') && has('amount') && has('currency')) return 'transactions';
    if (has('account') && has('amount')) return 'ledger';
    return 'unknown';
  };

  // Deduplicate exact file contents by SHA1
  const seenHashes = new Map<string, string>();
  const duplicateFiles: string[] = [];
  const csvFiles: { fname: string; kind: string; header: string[]; rows: string[][] }[] = [];

  for (const fname of files) {
    const p = path.join(uploadDir, fname);
    if (!fs.existsSync(p) || path.extname(fname).toLowerCase() !== '.csv') continue;
    const txt = await readTextFile(p);
    const h = hashOf(txt);
    if (seenHashes.has(h)) {
      duplicateFiles.push(fname);
      continue;
    }
    seenHashes.set(h, fname);
    const { header, rows } = parseCsv(txt);
    if (!header.length) continue;
    const kind = classify(header);
    csvFiles.push({ fname, kind, header, rows });
  }

  const haveTransactions = csvFiles.some((c) => c.kind === 'transactions');
  // Prefer transactions for KPI computation when present
  const includeForRevenueExpenses = (c: { kind: string }) => {
    if (haveTransactions) return c.kind === 'transactions' || c.kind === 'receipts';
    return c.kind === 'ledger' || c.kind === 'receipts';
  };

  let revenue = 0;
  let expenses = 0;
  let countValues = 0;
  const negativesByFile: Record<string, number> = {};
  const negativeSamplesByFile: Record<string, number[]> = {};
  const valuesForOutliers: number[] = [];
  // Keep a flat list of (value,file) for potential evidence sampling of outliers
  const valueOrigins: Array<{ value: number; file: string }> = [];
  let arTotal = 0;
  let cashOnHand: number | null = null;

  for (const c of csvFiles) {
    const lower = c.header.map((h) => h.toLowerCase());
    const idxAmount = lower.indexOf('amount');
    // We'll also probe for cash/balance columns if present
    const cashIdxCandidates: number[] = [];
    lower.forEach((h, i) => {
      if (h.includes('cash') || h.includes('balance')) cashIdxCandidates.push(i);
      if (h.includes('ending balance') || h.includes('closing balance')) cashIdxCandidates.push(i);
    });
    const hasAmount = idxAmount !== -1;
    if (!hasAmount && cashIdxCandidates.length === 0) continue;

    // Invoices: AR only
    if (c.kind === 'invoices') {
      if (hasAmount) {
        for (const r of c.rows) {
          const n = Number((r[idxAmount] || '').replace(/[^0-9\-\.]/g, ''));
          if (Number.isFinite(n)) arTotal += n;
        }
      }
      // also try to capture any explicit cash/balance from invoice tables (rare)
      if (cashIdxCandidates.length > 0) {
        for (let ci of cashIdxCandidates) {
          for (let i = c.rows.length - 1; i >= 0; i--) {
            const raw = c.rows[i][ci];
            if (!raw) continue;
            const n = Number(String(raw).replace(/[^0-9\-\.]/g, ''));
            if (Number.isFinite(n)) { cashOnHand = n; break; }
          }
          if (cashOnHand !== null) break;
        }
      }
      continue;
    }

    // Receipts: all amounts are expenses (positive numbers)
    if (c.kind === 'receipts') {
      if (hasAmount) {
        for (const r of c.rows) {
          const n = Number((r[idxAmount] || '').replace(/[^0-9\-\.]/g, ''));
          if (!Number.isFinite(n)) continue;
          const mag = Math.abs(n);
          expenses += mag;
          valuesForOutliers.push(n);
          valueOrigins.push({ value: n, file: c.fname });
          countValues++;
          if (n < 0) negativesByFile[c.fname] = (negativesByFile[c.fname] || 0) + 1;
          if (n < 0) {
            const arr = negativeSamplesByFile[c.fname] || (negativeSamplesByFile[c.fname] = []);
            if (arr.length < 5) arr.push(n);
          }
        }
      }
      // Look for any explicit cash/balance field and take the latest value as cash_on_hand
      if (cashIdxCandidates.length > 0) {
        for (let ci of cashIdxCandidates) {
          for (let i = c.rows.length - 1; i >= 0; i--) {
            const raw = c.rows[i][ci];
            if (!raw) continue;
            const n = Number(String(raw).replace(/[^0-9\-\.]/g, ''));
            if (Number.isFinite(n)) { cashOnHand = n; break; }
          }
          if (cashOnHand !== null) break;
        }
      }
      continue;
    }

    // Transactions or Ledger (when transactions absent): positive->revenue, negative->expenses
    if (hasAmount && (includeForRevenueExpenses(c) || (haveTransactions && c.kind === 'ledger'))) {
      for (const r of c.rows) {
        const raw = r[idxAmount] || '';
        const n = Number(raw.replace(/[^0-9\-\.]/g, ''));
        if (!Number.isFinite(n)) continue;
        if (c.kind === 'ledger' && haveTransactions) {
          // With transactions present, only treat negative ledger entries as expenses (avoid double-counting revenues)
          if (n < 0) expenses += Math.abs(n);
        } else {
          if (n > 0) revenue += n; else if (n < 0) expenses += Math.abs(n);
        }
        valuesForOutliers.push(n);
        valueOrigins.push({ value: n, file: c.fname });
        countValues++;
        if (n < 0) negativesByFile[c.fname] = (negativesByFile[c.fname] || 0) + 1;
        if (n < 0) {
          const arr = negativeSamplesByFile[c.fname] || (negativeSamplesByFile[c.fname] = []);
          if (arr.length < 5) arr.push(n);
        }
      }
    }

    // If there are cash/balance columns, capture the latest numeric as cash_on_hand
    if (cashIdxCandidates.length > 0) {
      for (let ci of cashIdxCandidates) {
        for (let i = c.rows.length - 1; i >= 0; i--) {
          const raw = c.rows[i][ci];
          if (!raw) continue;
          const n = Number(String(raw).replace(/[^0-9\-\.]/g, ''));
          if (Number.isFinite(n)) { cashOnHand = n; break; }
        }
        if (cashOnHand !== null) break;
      }
    }
  }

  // Outlier detection on gathered values
  let outliersCount = 0;
  if (valuesForOutliers.length >= 3) {
    const mean = valuesForOutliers.reduce((a, b) => a + b, 0) / valuesForOutliers.length;
    const variance = valuesForOutliers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valuesForOutliers.length;
    const std = Math.sqrt(variance);
    outliersCount = valuesForOutliers.filter((v) => Math.abs(v - mean) > 3 * std).length;
  }

  const kpis: any = {};
  if (revenue || expenses) {
    kpis.revenue_total = Number(revenue.toFixed(2));
    kpis.expenses_total = Number(expenses.toFixed(2));
    kpis.ebitda_total = Number((revenue - expenses).toFixed(2));
    if (revenue > 0) kpis.gross_margin_pct = Number((((revenue - expenses) / revenue) * 100).toFixed(1));
  }
  if (arTotal) kpis.ar_total = Number(arTotal.toFixed(2));
  if (cashOnHand !== null) kpis.cash_on_hand = Number(cashOnHand.toFixed(2));

  const redFlags: any[] = [];
  if (duplicateFiles.length > 0) {
    // Evidence: each duplicate file listed, referencing its original counterpart
    const evidence = duplicateFiles.map((dup) => {
      // Find original by matching hash again (reverse lookup) - since we stored hash->original in seenHashes
      // Recompute hash for the duplicate (cheap; files are small) to get original mapping
      try {
        const pDup = path.join(uploadDir, dup);
        const txtDup = fs.existsSync(pDup) ? fs.readFileSync(pDup, 'utf8') : '';
        const hDup = crypto.createHash('sha1').update(txtDup).digest('hex');
        const orig = seenHashes.get(hDup) || 'original-unknown';
        return { doc: dup, snippet: `Duplicate of ${orig}` };
      } catch {
        return { doc: dup, snippet: 'Duplicate of earlier file' };
      }
    });
    redFlags.push({ id: 'duplicate_files', title: 'Duplicate Data Files', severity: 'high', description: `Detected ${duplicateFiles.length} duplicate CSV file(s). Exact duplicates were excluded from aggregation.`, evidence });
  }
  const negFiles = Object.entries(negativesByFile).filter(([, c]) => c > 0);
  if (negFiles.length > 0) {
    const totalNeg = negFiles.reduce((a, [, c]) => a + (c as number), 0);
    const evidence = negFiles.map(([fname, count]) => {
      const samples = negativeSamplesByFile[fname] || [];
      return { doc: fname, snippet: `Negative values: ${count}${samples.length ? ` | samples: ${samples.map((v) => v.toFixed(2)).join(', ')}` : ''}` };
    });
    redFlags.push({ id: 'negative_amounts', title: 'Negative amounts found', severity: 'high', description: `Found ${totalNeg} negative numeric value(s) across ${negFiles.length} CSV file(s).`, evidence });
  }
  if (outliersCount > 0) {
    // Recompute mean/std to capture which specific values qualified (already computed above but we need threshold again)
    let outlierEvidence: Array<{ doc: string; snippet: string }> = [];
    if (valuesForOutliers.length >= 3) {
      const mean = valuesForOutliers.reduce((a, b) => a + b, 0) / valuesForOutliers.length;
      const variance = valuesForOutliers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valuesForOutliers.length;
      const std = Math.sqrt(variance);
      const threshold = 3 * std;
      const flagged = valueOrigins.filter((vo) => Math.abs(vo.value - mean) > threshold).slice(0, 8);
      outlierEvidence = flagged.map((vo) => ({ doc: vo.file, snippet: `Value ${vo.value.toFixed(2)} deviates >3σ (mean ${mean.toFixed(2)}, σ ${std.toFixed(2)})` }));
    }
    redFlags.push({ id: 'outliers', title: 'Outlier values detected', severity: 'low', description: `Found ${outliersCount} value(s) that are statistical outliers.`, evidence: outlierEvidence });
  }

  return { kpis, redFlags };
}

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// Error handler
function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('API error:', err && err.message ? err.message : err);
  res.status(500).json({ error: err && err.message ? err.message : 'Internal error' });
}

// POST /api/ingest
app.post('/api/ingest', upload.array('files', 20), async (req, res, next) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    const jobId = uuidv4();
    const now = new Date().toISOString();
    const filenames = files.map((f) => path.basename(f.filename));

    const job: Job = { jobId, files: filenames, status: 'pending', progress: 0, createdAt: now, updatedAt: now };

    // Persist job and wait for DB write to complete before starting processing to avoid races
    await addJob(job);

  // Trigger async processing (non-blocking)
  // Start background processing for this job
  processJob(jobId);

    // Also call external ML microservice to process and index the file (non-blocking)
    const absPath = path.join(UPLOADS, filenames[0]);

    // Retry helper: attempts the asyncFn up to `retries` times with exponential backoff in ms
    async function retryWithBackoff<T>(asyncFn: () => Promise<T>, retries = 3, baseDelay = 500): Promise<T> {
      let attempt = 0;
      while (true) {
        try {
          return await asyncFn();
        } catch (err) {
          attempt++;
          if (attempt >= retries) throw err;
          const wait = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`mlClient attempt ${attempt} failed, retrying in ${wait}ms:`, err && (err as any).message ? (err as any).message : err);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }

    // Call external ML service with retries; only mark job failed if all retries exhausted
    retryWithBackoff(() => mlClient.processFile(jobId, absPath, filenames[0]), 3, 500)
      .then((r) => console.log('mlClient.processFile result:', r))
      .catch((err) => {
        // Do not mark the job failed here. processFile is an auxiliary/indexing call
        // and should not prevent the main report generation flow. Record the error
        // on the job but allow background processing to continue.
        console.error('mlClient.processFile failed after retries:', err && (err as any).message ? (err as any).message : err);
        getJob(jobId, (j) => {
          if (j) {
            // append to existing error information
            const prev = j.error ? `${j.error} | ` : '';
            j.error = prev + (err && (err as any).message ? (err as any).message : String(err));
            j.updatedAt = new Date().toISOString();
            updateJob(j);
          }
        });
      });

    return res.status(201).json({ jobId, status: job.status });
  } catch (err) {
    next(err);
  }
});

// GET job
app.get('/api/jobs/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    getJob(jobId, (job) => {
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(job);
    });
  } catch (err) {
    next(err);
  }
});

// GET all jobs (convenience endpoint for UI/debugging)
app.get('/api/jobs', async (_req, res, next) => {
  try {
    getAllJobs((jobs) => {
      res.json({ jobs });
    });
  } catch (err) {
    next(err);
  }
});

// SSE stream for job updates - clients can subscribe to get realtime job state
app.get('/api/jobs/:jobId/stream', (req, res) => {
  const { jobId } = req.params;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Ensure CORS headers are present for EventSource connections (some browsers require this on SSE endpoints)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Flush the headers to establish the SSE stream
  if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

  let closed = false;
  let lastPayload = '';

  const sendJob = () => {
    getJob(jobId, (job) => {
      if (closed) return;
      if (!job) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
        return;
      }
      const payload = JSON.stringify(job);
      if (payload !== lastPayload) {
        res.write(`event: job\ndata: ${payload}\n\n`);
        lastPayload = payload;
      }
      if (job.status === 'completed' || job.status === 'failed') {
        // send final event and mark closed immediately to avoid duplicate 'done' frames
        try {
          if (!closed) {
            res.write(`event: done\ndata: ${JSON.stringify({ status: job.status })}\n\n`);
            closed = true;
          }
        } catch (e) {
          // ignore write errors
        }
        // send a final SSE comment and delay closing slightly to reduce client-side race
        setTimeout(() => {
          try {
            // send a harmless SSE comment to ensure clients have a final frame
            res.write(`: stream closed\n\n`);
          } catch (e) {
            // ignore
          }
          try {
            res.end();
          } catch (e) {
            // ignore
          }
        }, 1000);
      }
    });
  };

  // send immediately then poll
  sendJob();
  const interval = setInterval(sendJob, 1000);

  req.on('close', () => {
    closed = true;
    clearInterval(interval);
  });
});

// GET report
app.get('/api/reports/:jobId', async (req, res) => {
  const p = path.join(REPORTS, `report_${req.params.jobId}.json`);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Report not found' });

  try {
    const raw = await fs.promises.readFile(p, 'utf8');
    // Helper: merge local KPIs/flags for historical wrapper files and persist canonical JSON
    const finalizeAndMaybePersist = async (repIn: any) => {
      try {
        const jobId = req.params.jobId;
        // Merge local KPIs/flags if we can load the job and its files
        await new Promise<void>((resolve) => {
          getJob(jobId, async (job) => {
            try {
              const rep = repIn || {};
              // normalize shapes
              rep.kpis = rep.kpis || {};
              rep.redFlags = Array.isArray(rep.redFlags) ? rep.redFlags : [];
              // Compute and merge local source-aware metrics
              if (job && Array.isArray(job.files) && job.files.length) {
                const local = await computeLocalKpisAndFlags(UPLOADS, job.files);
                if (local?.kpis) {
                  for (const [k, v] of Object.entries(local.kpis)) {
                    const num = typeof v === 'number' && Number.isFinite(v) ? v : null;
                    if (num !== null) {
                      rep.kpis[k] = num;
                      rep.kpis[`${k}_local`] = num;
                    } else {
                      rep.kpis[k] = v as any;
                    }
                  }
                  const kp = rep.kpis;
                  if (kp.revenue_total !== undefined) kp.revenue = kp.revenue ?? kp.revenue_total;
                  if (kp.expenses_total !== undefined) kp.expenses = kp.expenses ?? kp.expenses_total;
                  if (kp.ebitda_total !== undefined) kp.ebitda = kp.ebitda ?? kp.ebitda_total;
                }
                if (local?.redFlags && Array.isArray(local.redFlags)) {
                  const existing = new Map<string, any>();
                  for (const r of rep.redFlags) {
                    const k = r.id || r.title || JSON.stringify(r);
                    existing.set(k, r);
                  }
                  for (const rf of local.redFlags) {
                    const key = rf.id || rf.title || JSON.stringify(rf);
                    const curr = existing.get(key);
                    if (!curr) {
                      rep.redFlags.push(rf);
                      existing.set(key, rf);
                    } else if ((!curr.evidence || curr.evidence.length === 0) && rf.evidence && rf.evidence.length) {
                      curr.evidence = rf.evidence;
                    }
                  }
                }
                // Ensure files list is present
                rep.files = Array.isArray(rep.files) ? rep.files : job.files;
              }
              // Persist canonicalized report back to disk to repair historical files
              try {
                await fs.promises.writeFile(p, JSON.stringify(rep, null, 2), 'utf8');
              } catch (e) {
                // non-fatal
              }
              resolve();
            } catch (e) {
              resolve();
            }
          });
        });
      } catch (e) {
        // ignore merge errors; serve what we have
      }
      return repIn;
    };
    // If the file contains a plain JSON report, return it directly.
    try {
      const parsed = JSON.parse(raw);
      // If the saved object already wraps the real report under `report`, unwrap it.
      if (parsed && parsed.report && typeof parsed.report === 'object') {
        await finalizeAndMaybePersist(parsed.report);
        return res.json(parsed.report);
      }
      // Attempt candidate unwrap BEFORE treating as canonical simply because kpis exist.
      const candPre = parsed?.candidates?.[0];
      if (candPre) {
        let txtPre: string | null = null;
        if (typeof candPre.content === 'string') txtPre = candPre.content;
        else if (Array.isArray(candPre.content)) txtPre = candPre.content.map((p: any) => (typeof p === 'string' ? p : (p && (p.text || p.content)) || '')).join('\n');
        else if (candPre.content && Array.isArray(candPre.content.parts)) txtPre = candPre.content.parts.map((p: any) => p.text || '').join('\n');
        if (txtPre) {
          const mPre = String(txtPre).match(/```json\s*([\s\S]*?)```/i);
          const innerPre = mPre ? mPre[1].trim() : null;
          if (innerPre) {
            try {
              const parsedInnerPre = JSON.parse(innerPre);
              const repPre = parsedInnerPre.report || parsedInnerPre;
              await finalizeAndMaybePersist(repPre);
              return res.json(repPre);
            } catch (e) { /* ignore */ }
          }
        }
      }
      // If the saved JSON already looks like a canonical report (no candidates or unwrappable content), return it.
      if (parsed && (parsed.kpis || parsed.redFlags) && !parsed?.candidates) {
        await finalizeAndMaybePersist(parsed);
        return res.json(parsed);
      }

      // If the saved JSON is an LLM wrapper (candidates), try to extract nested text
      const cand = parsed?.candidates?.[0];
      if (cand) {
        let txt = null as any;
        if (typeof cand.content === 'string') txt = cand.content;
        else if (Array.isArray(cand.content)) txt = cand.content.map((p: any) => (typeof p === 'string' ? p : (p && (p.text || p.content)) || '')).join('\n');
        else if (cand.content && Array.isArray(cand.content.parts)) txt = cand.content.parts.map((p: any) => p.text || '').join('\n');
        if (txt) {
          // try to extract code-fenced JSON inside the candidate text
          const m2 = String(txt).match(/```json\s*([\s\S]*?)```/i);
          const inner = m2 ? m2[1].trim() : null;
          if (inner) {
            try {
              const parsedInner = JSON.parse(inner);
              const rep = parsedInner.report || parsedInner;
              await finalizeAndMaybePersist(rep);
              return res.json(rep);
            } catch (e) {
              // fall through
            }
          }
        }
      }
    } catch (e) {
      // fall through to textual extraction below
    }

    // Fallback: try to extract an embedded code-fenced JSON from the text
    const txt = raw;
    const m = txt.match(/```json\s*([\s\S]*?)```/i);
    const candidate = m ? m[1].trim() : null;
    if (candidate) {
      try {
        const parsed = JSON.parse(candidate);
        const rep = parsed.report || parsed;
        await finalizeAndMaybePersist(rep);
        return res.json(rep);
      } catch (e) {
        // fall through
      }
    }

    // As a last-ditch effort, try to locate the first balanced JSON object in the text
    const firstBrace = txt.indexOf('{');
    if (firstBrace >= 0) {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = firstBrace; i < txt.length; i++) {
        const ch = txt[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          if (depth === 0) {
            try {
              const candidate2 = txt.slice(firstBrace, i + 1);
              const parsed = JSON.parse(candidate2);
              const rep = parsed.report || parsed;
              await finalizeAndMaybePersist(rep);
              return res.json(rep);
            } catch (e) {
              break;
            }
          }
        }
      }
    }

    // If all else fails, return raw text as plain text for debugging
    res.type('text/plain').send(raw);
  } catch (err) {
    console.error('Failed to read/serve report file', err && (err as any).message ? (err as any).message : err);
    return res.status(500).json({ error: 'Failed to read report' });
  }
});

// GET analysis
app.get('/api/analysis/:jobId', async (req, res) => {
  const p = path.join(ANALYSIS, `analysis_${req.params.jobId}.json`);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Analysis not found' });
  res.sendFile(p);
});

// health
app.get('/api/health', (_req, res) => res.json({ status: 'ok', now: new Date().toISOString() }));

// Debug: receive forwarded browser console logs (development only)
app.post('/api/debug/logs', (req, res) => {
  try {
    const body = req.body || {};
    const level = (body.level || 'log').toString();
    const msg = body.message || body.msg || body.data || '';
    const meta = body.meta || {};
    const out = `[browser:${level}] ${new Date().toISOString()} ${typeof msg === 'string' ? msg : JSON.stringify(msg)} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    // mirror to server console
    if (level === 'error' && console.error) console.error(out);
    else if (level === 'warn' && console.warn) console.warn(out);
    else if (level === 'info' && console.info) console.info(out);
    else console.log(out);
    // also append to a simple log file for short-term inspection
    try {
      const p = path.join(ROOT, 'browser_logs.txt');
      fs.appendFileSync(p, out + '\n', 'utf8');
    } catch (e) {
      // ignore file write errors
    }
    res.status(204).end();
  } catch (err) {
    // best-effort
    console.warn('Failed to record browser log', err);
    res.status(500).json({ error: 'failed' });
  }
});

app.use(errorHandler);

// mount chat router
app.use(chatRouter);

// Background job processor
function processJob(jobId: string) {
  getJob(jobId, async (job) => {
    if (!job) throw new Error('Job not found');
    job.status = 'processing';
    job.progress = 0;
    job.startedAt = new Date().toISOString();
    job.updatedAt = job.startedAt;
    updateJob(job);

    // simulate parsing each file (1-2s) and update progress
    const total = Math.max(1, job.files.length);
    for (let i = 0; i < total; i++) {
      const wait = 1000 + Math.floor(Math.random() * 1000);
      await new Promise((r) => setTimeout(r, wait));
      const progress = Math.min(95, Math.round(((i + 1) / total) * 90) + (Math.floor(Math.random() * 7) - 3));
      job.progress = Math.max(0, Math.min(95, progress));
      job.updatedAt = new Date().toISOString();
      updateJob(job);
      console.log(`Job ${jobId}: progress ${job.progress}%`);
    }

    // finalize: if an OpenAI key is available, prefer LLM-based generation; otherwise
    // use the free deterministic local report generator to avoid placeholders or external costs.
    try {
      let mlRes: any = null;
      // Use LLM-based generation if an LLM provider is configured (OpenAI or Gemini)
      if (process.env.OPENAI_API_KEY || (process.env.LLM_PROVIDER && process.env.LLM_PROVIDER.toLowerCase() === 'gemini')) {
        mlRes = await mlClient.generateReport(jobId);
      } else {
        // free local generator
        const local = await reportGenerator.generateLocalReport(jobId, UPLOADS, job.files);
        mlRes = { report: local.report, analysis: local.analysis, raw: 'local-generated' };
      }
      const completedAt = new Date().toISOString();

      // validate minimal fields and normalize
      // Some LLM providers (Gemini) may return a rich wrapper (candidates/content)
      // where the actual JSON report is embedded as a code-fenced string. Try to
      // extract and parse that here so we persist a canonical report object.
      const tryExtractFromCandidates = (obj: any): any | null => {
        try {
          if (!obj) return null;
          // common shapes: obj.candidates[0].content.parts[0].text (string)
          const cand = obj?.candidates?.[0];
          let txt: string | null = null;
          if (cand) {
            if (typeof cand.content === 'string') txt = cand.content;
            else if (Array.isArray(cand.content)) {
              // content may be an array of parts
              for (const p of cand.content) {
                if (typeof p === 'string') { txt = (txt || '') + p; }
                else if (p && (p.text || p.content)) txt = (txt || '') + (p.text || p.content);
              }
            } else if (cand.content && cand.content.parts && Array.isArray(cand.content.parts)) {
              for (const part of cand.content.parts) {
                if (part && part.text) txt = (txt || '') + part.text;
              }
            }
          }
          // also check for top-level output_text
          if (!txt && typeof obj.output_text === 'string') txt = obj.output_text;
          if (!txt && typeof obj === 'string') txt = obj;
          if (!txt) return null;

          // look for a ```json code block
          const m = txt.match(/```json\s*([\s\S]*?)```/i);
          let candidate = m ? m[1].trim() : null;
          if (!candidate) {
            // try first balanced JSON object
            const firstBrace = txt.indexOf('{');
            if (firstBrace >= 0) {
              let depth = 0;
              let inString = false;
              let escape = false;
              for (let i = firstBrace; i < txt.length; i++) {
                const ch = txt[i];
                if (escape) { escape = false; continue; }
                if (ch === '\\') { escape = true; continue; }
                if (ch === '"') { inString = !inString; continue; }
                if (!inString) {
                  if (ch === '{') depth++;
                  else if (ch === '}') depth--;
                  if (depth === 0) { candidate = txt.slice(firstBrace, i + 1); break; }
                }
              }
            }
          }
          if (!candidate) return null;
          const parsed = JSON.parse(candidate);
          return parsed && (parsed.report || parsed);
        } catch (e) {
          return null;
        }
      };

      const extracted = tryExtractFromCandidates(mlRes);
      const rep = extracted || mlRes.report || {};
      const ana = mlRes.analysis || null;

      // Normalize KPIs: ensure canonical numeric KPI keys exist so the UI can reliably
      // read them regardless of how the LLM named them. This prefers explicit
      // numeric values when available and will coerce common string forms to numbers.
      const normalizeKpis = (reportObj: any) => {
        try {
          const aliases: Record<string, string[]> = {
            total_amount: [
              'total_amount',
              'total',
              'total_amount_reported',
              'revenue_total',
              'total_amount_per_file',
              'sum',
              'amount_total',
            ],
            transaction_count: [
              'transaction_count',
              'count',
              'transactions',
              'transaction_total',
              'num_transactions',
              'rows',
            ],
            average_transaction_value: [
              'average_transaction_value',
              'avg',
              'avg_transaction_value',
              'mean_transaction_value',
              'average_value',
            ],
          };

          const sourceKpis: Record<string, any> = {};
          if (reportObj && typeof reportObj.kpis === 'object' && reportObj.kpis !== null) {
            Object.assign(sourceKpis, reportObj.kpis);
          }
          // Also surface top-level numeric-like keys that some models emit
          for (const k of Object.keys(reportObj || {})) {
            if (!(k in sourceKpis) && typeof reportObj[k] !== 'object') sourceKpis[k] = reportObj[k];
          }

          const out: Record<string, any> = {};
          const coerce = (v: any): number | null => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string') {
              // strip common non-numeric characters like $ and commas
              const cleaned = v.replace(/[^0-9\-\.]/g, '');
              if (cleaned === '') return null;
              const n = Number(cleaned);
              return Number.isFinite(n) ? n : null;
            }
            return null;
          };

          for (const [canon, names] of Object.entries(aliases)) {
            for (const name of names) {
              if (sourceKpis[name] !== undefined && sourceKpis[name] !== null) {
                const coerced = coerce(sourceKpis[name]);
                if (coerced !== null) {
                  out[canon] = coerced;
                  break;
                }
              }
            }
          }

          // Preserve any other KPI keys the model produced (non-numeric or extras)
          for (const [k, v] of Object.entries(sourceKpis)) {
            if (!(k in out)) out[k] = v;
          }

          reportObj.kpis = out;
        } catch (e) {
          // non-fatal: leave reportObj as-is
          console.warn('normalizeKpis failed', e && (e as any).message ? (e as any).message : e);
        }
        // Add UI-friendly alias keys so the existing frontend mapping (which
        // expects keys like `revenue_total` or `total_amount_reported`) still works.
        try {
          const kp = reportObj.kpis || {};
          if (kp.total_amount !== undefined) {
            kp.revenue_total = kp.revenue_total ?? kp.total_amount;
            kp.total_amount_reported = kp.total_amount_reported ?? kp.total_amount;
            kp.total_revenue = kp.total_revenue ?? kp.total_amount;
          }
          if (kp.transaction_count !== undefined) {
            kp.total_transactions = kp.total_transactions ?? kp.transaction_count;
            kp.num_transactions = kp.num_transactions ?? kp.transaction_count;
          }
          if (kp.average_transaction_value !== undefined) {
            kp.average_transaction_amount = kp.average_transaction_amount ?? kp.average_transaction_value;
            kp.avg_transaction_value = kp.avg_transaction_value ?? kp.average_transaction_value;
          }
          reportObj.kpis = kp;
        } catch (e) {
          // ignore aliasing errors
        }

        return reportObj;
      };

      normalizeKpis(rep);

      // Ensure runId, createdAt, completedAt
      rep.runId = rep.runId || jobId;
      rep.createdAt = rep.createdAt || job.startedAt || job.createdAt;
      rep.completedAt = rep.completedAt || completedAt;
      rep.files = Array.isArray(rep.files) ? rep.files : job.files;

      // Compute local source-aware KPIs and simple red-flags so basic analysis is
      // available even when Gemini/OpenAI is not used or returns incomplete data.
      try {
        const local = await computeLocalKpisAndFlags(UPLOADS, job.files);
        // ensure rep.kpis exists
        rep.kpis = rep.kpis || {};
        // Merge source-aware KPIs (authoritative for numeric totals) and also
        // keep *_local copies for transparency.
        if (local.kpis) {
          for (const [k, v] of Object.entries(local.kpis)) {
            const num = typeof v === 'number' && Number.isFinite(v) ? v : null;
            if (num !== null) {
              rep.kpis[k] = num;
              rep.kpis[`${k}_local`] = num;
            } else {
              rep.kpis[k] = v as any;
            }
          }
          // Derive aliases for UI
          const kp = rep.kpis;
                  if (kp.revenue_total !== undefined) kp.revenue = kp.revenue_total;
                  if (kp.expenses_total !== undefined) kp.expenses = kp.expenses_total;
                  if (kp.ebitda_total !== undefined) kp.ebitda = kp.ebitda_total;
        }

        // Merge red flags (model-produced + local heuristics), deduplicate by id/title
        rep.redFlags = Array.isArray(rep.redFlags) ? rep.redFlags : [];
        const existingIds = new Set(rep.redFlags.map((r: any) => r.id || JSON.stringify(r)));
        if (local.redFlags && Array.isArray(local.redFlags)) {
          for (const rf of local.redFlags) {
            const key = rf.id || rf.title || JSON.stringify(rf);
            const existing = rep.redFlags.find((r: any) => (r.id || r.title || JSON.stringify(r)) === key);
            if (!existing) {
              rep.redFlags.push(rf);
              existingIds.add(key);
            } else if ((!existing.evidence || existing.evidence.length === 0) && rf.evidence && rf.evidence.length) {
              // augment existing flag with evidence if it lacks it
              existing.evidence = rf.evidence;
            }
          }
        }
      } catch (e) {
        console.warn('Local KPI analysis failed for job', jobId, e && (e as any).message ? (e as any).message : e);
      }

      // If analysis is missing, create an analysis container using ML output if present
      let finalAnalysis = ana;
      if (!finalAnalysis) {
        finalAnalysis = {
          analysisId: `an-${uuidv4()}`,
          reportRunId: jobId,
          createdAt: completedAt,
          sections: [],
          insights: [],
        };
      } else {
        finalAnalysis.analysisId = finalAnalysis.analysisId || `an-${uuidv4()}`;
        finalAnalysis.reportRunId = finalAnalysis.reportRunId || jobId;
        finalAnalysis.createdAt = finalAnalysis.createdAt || completedAt;
      }

      // write files
      const reportPath = path.join(REPORTS, `report_${jobId}.json`);
      const analysisPath = path.join(ANALYSIS, `analysis_${jobId}.json`);
      // if the ML client returned raw text (LLM output), persist it for debugging
      try {
        if (mlRes && mlRes.raw) {
          const rawPath = path.join(REPORTS, `report_raw_${jobId}.txt`);
          await fs.promises.writeFile(rawPath, String(mlRes.raw), 'utf8');
        }
      } catch (e) {
        // non-fatal: log and continue
        console.warn('Failed to persist raw ML output for job', jobId, e && (e as any).message ? (e as any).message : e);
      }
      await fs.promises.writeFile(reportPath, JSON.stringify(rep, null, 2), 'utf8');
      await fs.promises.writeFile(analysisPath, JSON.stringify(finalAnalysis, null, 2), 'utf8');

      // mark completed
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = rep.completedAt;
      job.updatedAt = rep.completedAt;
      updateJob(job);
      console.log(`Job ${jobId}: completed (ML-generated report)`);
    } catch (err) {
        console.error('Failed to generate ML report for job', jobId, err && (err as any).message ? (err as any).message : err);
        // If the ML client attached raw text to the error (for debugging), persist it
        try {
          const maybeRaw = (err as any) && ((err as any).raw || (err as any).responseText);
          if (maybeRaw) {
            const rawPath = path.join(REPORTS, `report_raw_${jobId}.txt`);
            await fs.promises.writeFile(rawPath, String(maybeRaw), 'utf8');
          }
        } catch (e) {
          console.warn('Failed to persist raw ML error output for job', jobId, e && (e as any).message ? (e as any).message : e);
        }

        // Attempt a deterministic local generation fallback before marking the job failed.
        const LLM_FAIL_OPEN = (process.env.LLM_FAIL_OPEN || 'true').toLowerCase() !== 'false';
        if (LLM_FAIL_OPEN) {
          try {
            console.log(`Job ${jobId}: attempting local report generator fallback`);
            const local = await reportGenerator.generateLocalReport(jobId, UPLOADS, job.files);
            const completedAt = new Date().toISOString();
            const rep = local.report || {};
            const ana = local.analysis || null;
            rep.runId = rep.runId || jobId;
            rep.createdAt = rep.createdAt || job.startedAt || job.createdAt;
            rep.completedAt = rep.completedAt || completedAt;
            rep.files = Array.isArray(rep.files) ? rep.files : job.files;
            const finalAnalysis = ana || {
              analysisId: `an-${uuidv4()}`,
              reportRunId: jobId,
              createdAt: completedAt,
              sections: [],
              insights: [],
            };
            const reportPath = path.join(REPORTS, `report_${jobId}.json`);
            const analysisPath = path.join(ANALYSIS, `analysis_${jobId}.json`);
            await fs.promises.writeFile(reportPath, JSON.stringify(rep, null, 2), 'utf8');
            await fs.promises.writeFile(analysisPath, JSON.stringify(finalAnalysis, null, 2), 'utf8');
            // mark completed
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = rep.completedAt;
            job.updatedAt = rep.completedAt;
            updateJob(job);
            console.log(`Job ${jobId}: completed (local-generated report after ML fallback)`);
          } catch (localErr) {
            console.error('Local fallback generator also failed for job', jobId, localErr && (localErr as any).message ? (localErr as any).message : localErr);
            job.status = 'failed';
            job.error = (err && (err as any).message) || String(err);
            job.updatedAt = new Date().toISOString();
            updateJob(job);
            console.log(`Job ${jobId}: failed during ML report generation`);
          }
        } else {
          // Strict mode: do not fall back to local generator
          console.log(`LLM_FAIL_OPEN=false — not attempting local fallback for job ${jobId}`);
          job.status = 'failed';
          job.error = (err && (err as any).message) || String(err);
          job.updatedAt = new Date().toISOString();
          updateJob(job);
          console.log(`Job ${jobId}: failed during ML report generation`);
        }
    }
  });
}

// Start server when script is executed directly
const port = process.env.PORT ? Number(process.env.PORT) : 3001;
if (require.main === module) {
  (async () => {
    await ensureStorage();
    // Verify ML service availability before starting the server unless a mock fallback is explicitly allowed.
    try {
      const mlOk = await mlClient.ensureMlAvailable(5000);
      if (!mlOk) {
        if (process.env.ALLOW_ML_HTTP_FALLBACK === 'true' || process.env.USE_ML_CLIENT_MOCK === 'true') {
          console.warn('ML service probe failed but fallback/mock is enabled; starting backend in degraded mode.');
        } else {
          console.error('ML service probe failed and no fallback is configured. Please start the ML service (see `npm run dev:ml`) or set ALLOW_ML_HTTP_FALLBACK=true to proceed with the local mock.');
          process.exit(1);
        }
      } else {
        console.log('ML service probe successful.');
      }
    } catch (e) {
      console.warn('Error checking ML availability:', e && (e as any).message ? (e as any).message : e);
    }

    app.listen(port, () => {
      console.log(`FDD backend listening on http://localhost:${port}/api`);
      console.log('Uploads dir:', UPLOADS);
    });
  })();
}

export default app;

