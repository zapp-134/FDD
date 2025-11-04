/* LABELED_BY_TOOL
 * File: backend/src/jobStore.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'jobs.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    jobId TEXT PRIMARY KEY,
    files TEXT,
    status TEXT,
    progress INTEGER,
    createdAt TEXT,
    updatedAt TEXT,
    startedAt TEXT,
    completedAt TEXT,
    error TEXT
  )`);
});

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
    db.run(`INSERT INTO jobs (jobId, files, status, progress, createdAt, updatedAt, startedAt, completedAt, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      job.jobId, JSON.stringify(job.files), job.status, job.progress, job.createdAt, job.updatedAt, job.startedAt || null, job.completedAt || null, job.error || null,
      function (err: any) {
        if (err) return reject(err);
        resolve();
      });
  });
}

export function updateJob(job: Job) {
  db.run(`UPDATE jobs SET files=?, status=?, progress=?, createdAt=?, updatedAt=?, startedAt=?, completedAt=?, error=? WHERE jobId=?`,
    JSON.stringify(job.files), job.status, job.progress, job.createdAt, job.updatedAt, job.startedAt || null, job.completedAt || null, job.error || null, job.jobId);
}

export function getJob(jobId: string, cb: (job?: Job) => void) {
  db.get('SELECT * FROM jobs WHERE jobId=?', jobId, (err: any, row: any) => {
    if (err || !row) return cb(undefined);
    cb({
      jobId: row.jobId,
      files: JSON.parse(row.files),
      status: row.status,
      progress: row.progress,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt || undefined,
      completedAt: row.completedAt || undefined,
      error: row.error || undefined,
    });
  });
}

export function getAllJobs(cb: (jobs: Job[]) => void) {
  db.all('SELECT * FROM jobs', (err: any, rows: any[]) => {
    if (err) return cb([]);
    cb(rows.map((row: any) => ({
      jobId: row.jobId,
      files: JSON.parse(row.files),
      status: row.status,
      progress: row.progress,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt || undefined,
      completedAt: row.completedAt || undefined,
      error: row.error || undefined,
    })));
  });
}
