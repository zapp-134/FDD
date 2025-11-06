/* LABELED_BY_TOOL
 * File: backend/src/jobStore.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

/*
 * Lightweight file-backed job store used for local/dev and container runs.
 * Replaces the sqlite-backed store to avoid native build issues inside lightweight
 * containers. If you prefer sqlite in production, set USE_SQLITE=true and ensure
 * the native module is built for your platform.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const JOBS_FILE = path.join(ROOT, 'jobs.json');

function ensureJobsFile() {
  try {
    if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [] }, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

ensureJobsFile();

export interface Job {
  jobId: string;
  files: string[];
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
export function addJob(job: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureJobsFile();
      const raw = fs.readFileSync(JOBS_FILE, 'utf8');
      const parsed = JSON.parse(raw || '{"jobs":[]}');
      parsed.jobs = parsed.jobs || [];
      parsed.jobs.push(job);
      fs.writeFileSync(JOBS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      try { console.info(`jobStore.addJob: added job ${job.jobId} (${job.files?.length || 0} files)`); } catch (_) {}
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export function updateJob(job: Job) {
  try {
    ensureJobsFile();
    const raw = fs.readFileSync(JOBS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{"jobs":[]}');
    parsed.jobs = parsed.jobs || [];
    const idx = parsed.jobs.findIndex((j: any) => j.jobId === job.jobId);
    if (idx === -1) parsed.jobs.push(job);
    else parsed.jobs[idx] = job;
    fs.writeFileSync(JOBS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    try { console.info(`jobStore.updateJob: updated job ${job.jobId} status=${job.status} progress=${job.progress}`); } catch (_) {}
  } catch (e) {
    // ignore write errors
  }
}

export function getJob(jobId: string, cb: (job?: Job) => void) {
  try {
    ensureJobsFile();
    const raw = fs.readFileSync(JOBS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{"jobs":[]}');
    const found = (parsed.jobs || []).find((j: any) => j.jobId === jobId);
    if (!found) return cb(undefined);
    cb(found as Job);
  } catch (e) {
    return cb(undefined);
  }
}

export function getAllJobs(cb: (jobs: Job[]) => void) {
  try {
    ensureJobsFile();
    const raw = fs.readFileSync(JOBS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{"jobs":[]}');
    cb(parsed.jobs || []);
  } catch (e) {
    cb([]);
  }
}
