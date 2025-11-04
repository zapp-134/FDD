/* LABELED_BY_TOOL
 * File: backend/test/e2e/ingest.e2e.test.ts
 * Inferred role: Backend project file (server)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Mock mlClient so tests don't require the external ML service to be running
jest.mock('../../src/mlClient', () => ({
  processFile: jest.fn(async (jobId: string) => ({ jobId, numChunks: 1, indexed: true })),
}));

import app from '../../src/ingest';
import { getJob } from '../../src/jobStore';

const ROOT = path.resolve(__dirname, '..', '..');
const SAMPLE = path.join(ROOT, '..', 'public', 'samples', 'sample_financial_data.csv');
const JOBS_FILE = path.join(ROOT, '..', 'backend', 'jobs.json');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('E2E /api/ingest', () => {
  it('uploads a file and produces a report', async () => {
    // ensure sample exists
  const samplePath = path.resolve(process.cwd(), '..', 'public', 'samples', 'sample_financial_data.csv');
    if (!fs.existsSync(samplePath)) throw new Error('Sample file missing: ' + samplePath);

    const res = await request(app)
      .post('/api/ingest')
      .attach('files', samplePath)
      .expect(201);

    const { jobId } = res.body as { jobId: string };
    expect(jobId).toBeTruthy();

    // poll SQLite job store until job is completed or failed (timeout ~15s)
    const deadline = Date.now() + 15000;
    let job: any = null;
    while (Date.now() < deadline) {
      job = await new Promise((resolve) => getJob(jobId, resolve));
      if (job && (job.status === 'completed' || job.status === 'failed')) break;
      await sleep(500);
    }

    expect(job).toBeTruthy();
    expect(['completed', 'failed']).toContain(job.status);

    if (job.status === 'completed') {
      const reportPath = path.join(process.cwd(), 'reports', `report_${jobId}.json`);
      expect(fs.existsSync(reportPath)).toBe(true);
    }
  }, 20000);
});
