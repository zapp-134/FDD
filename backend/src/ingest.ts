import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as mlClient from './mlClient';
import * as reportGenerator from './reportGenerator';
import chatRouter from './chat';
import { addJob, updateJob, getJob, getAllJobs, Job as DBJob } from './jobStore';

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
  redFlags: Array<{ id: string; title: string; severity: string; description: string }>;
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
        console.error('mlClient.processFile failed after retries:', err && (err as any).message ? (err as any).message : err);
        // mark job failed in SQLite
        getJob(jobId, (j) => {
          if (j) {
            j.status = 'failed';
            j.error = err && (err as any).message ? (err as any).message : String(err);
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
  res.sendFile(p);
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
      const rep = mlRes.report || {};
      const ana = mlRes.analysis || null;

      // Ensure runId, createdAt, completedAt
      rep.runId = rep.runId || jobId;
      rep.createdAt = rep.createdAt || job.startedAt || job.createdAt;
      rep.completedAt = rep.completedAt || completedAt;
      rep.files = Array.isArray(rep.files) ? rep.files : job.files;

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
    app.listen(port, () => {
      console.log(`FDD backend listening on http://localhost:${port}/api`);
      console.log('Uploads dir:', UPLOADS);
    });
  })();
}

export default app;

