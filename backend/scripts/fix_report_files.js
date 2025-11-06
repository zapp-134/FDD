const fs = require('fs');
const path = require('path');

// Prefer fetching job records from a running backend API (useful when the
// in-process job store hasn't been persisted to jobs.json). If the backend is
// not reachable, fall back to reading backend/jobs.json on disk.
const BACKEND_API = 'http://localhost:3001/api/jobs';

const BACKEND_ROOT = path.resolve(__dirname, '..');
const JOBS_FILE = path.join(BACKEND_ROOT, 'jobs.json');
const REPORTS_DIR = path.join(BACKEND_ROOT, 'reports');

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8') || '{}');
  } catch (e) {
    console.error('Failed to read/parse', p, e.message || e);
    return null;
  }
}

function backupFile(p) {
  try {
    const bak = p + '.bak.' + Date.now();
    fs.copyFileSync(p, bak);
    return bak;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('jobs file:', JOBS_FILE);
  // Try to fetch jobs from the running backend first
  let jobs = [];
  async function tryFetchJobsApi() {
    try {
      if (typeof fetch === 'function') {
        const resp = await fetch(BACKEND_API, { method: 'GET' });
        if (resp.ok) {
          const body = await resp.json();
          if (Array.isArray(body.jobs)) return body.jobs;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  const apiJobs = await tryFetchJobsApi();
  if (Array.isArray(apiJobs) && apiJobs.length) {
    console.log(`Loaded ${apiJobs.length} jobs from backend API`);
    jobs = apiJobs;
  } else {
    const jobsJson = safeReadJson(JOBS_FILE);
    if (!jobsJson) {
      console.error('No jobs.json found or parse error; aborting.');
      process.exit(2);
    }
    jobs = Array.isArray(jobsJson.jobs) ? jobsJson.jobs : (jobsJson || []).filter(Boolean);
  }
  const jobById = new Map();
  jobs.forEach((j) => { if (j && j.jobId) jobById.set(String(j.jobId), j); });

  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.startsWith('report_') && f.endsWith('.json'));
  console.log(`Found ${files.length} report files in ${REPORTS_DIR}`);
  let updated = 0;
  let checked = 0;

  files.forEach((fname) => {
    const full = path.join(REPORTS_DIR, fname);
    const raw = safeReadJson(full);
    if (!raw) return;
    checked++;
    let jobId = null;
    // try to extract jobId from the filename: report_<jobId>.json
    const m = fname.match(/^report_(.+)\.json$/i);
    if (m) jobId = m[1];
    if (!jobId && raw.job && raw.job.jobId) jobId = raw.job.jobId;

    const filesArr = Array.isArray(raw.files) ? raw.files : [];
    if (filesArr.length > 0) return; // already populated

    if (!jobId) {
      console.warn('No jobId for report', fname, '- skipping');
      return;
    }

    const job = jobById.get(jobId);
    if (!job) {
      console.warn('No job entry found for jobId', jobId, 'for report', fname);
      return;
    }

    if (!Array.isArray(job.files) || job.files.length === 0) {
      console.warn('Job has no files list for', jobId, 'skipping');
      return;
    }

    // backup and write
    const bak = backupFile(full);
    try {
      raw.files = job.files.slice();
      fs.writeFileSync(full, JSON.stringify(raw, null, 2), 'utf8');
      updated++;
      console.log(`Updated ${fname}${bak ? ' (backup: ' + path.basename(bak) + ')' : ''}`);
    } catch (e) {
      console.error('Failed to write', full, e.message || e);
      if (bak) {
        console.log('Restoring from backup');
        try { fs.copyFileSync(bak, full); } catch (er) { console.error('Restore failed', er.message || er); }
      }
    }
  });

  console.log(`Checked ${checked} reports; updated ${updated}.`);
}

main();
