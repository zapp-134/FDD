# LABELED_BY_TOOL
# File: docs/architecture.md
# Inferred role: Project file — please open to see specific role
# Note: auto-generated label. Please edit the file for a more accurate description.

## Financial Due Diligence (FDD) - Architecture & Repo Audit

This document summarizes the current repository architecture, runtime components, data flows, and a pragmatic path to make the project functionally complete and production-ready. It also lists acceptance criteria and test steps to verify functional correctness before we start adding DevOps pipelines.
### 1 — High-level summary
- Frontend: Vite + React/TypeScript SPA in `src/` (pages + components). Provides upload UI, job list, and chat/report viewer.
- Backend: Node.js + Express (TypeScript). Handles multipart uploads, job creation, worker orchestration, SQLite jobStore, writes reports to `reports/`.
- ML microservice: Python FastAPI. Handles embedding, FAISS indexing and retrieval, and a generate/search API. Index persisted to `ml_service/index/`.
- Dev orchestration: `docker-compose.yml` for local full-stack runs. Scripts: `scripts/smoke-test.ps1`, DOCX generator.
### 2 — 3‑tier logical diagram
```mermaid
flowchart LR
  subgraph client_tier[Client / Browser]
    A[React SPA]
  end

  subgraph app_tier[Application Tier]
    B[Backend API (Express/TS)]
  end

  subgraph data_tier[Data & ML Tier]
    C[ML Service (FastAPI, embeddings, FAISS)]
    D[SQLite (dev) / Postgres (prod)]
    E[Object store (filesystem dev / S3 prod)]
  end

  A -->|REST / WS| B
  B -->|HTTP JSON / base64 file| C
  B --> D
  B --> E
  C --> E
  C --> D
```

Notes: in dev we run all three tiers in Docker Compose. For production we recommend moving the data tier to managed Postgres, object storage (S3/MinIO), and a managed vector DB or hosted Weaviate/Pinecone.
### 3 — Contracts (tiny "contract" for key APIs)
- Upload endpoint (/api/ingest): accepts multipart/form-data file; returns { jobId, status } (201). Backend immediately creates a job and persists to jobStore. Worker processes file and writes report to `reports/report_<jobId>.json` and `reports/report_<jobId>.md`.
- ML `/process-file` (FastAPI): Accepts JSON payload with either `file_path` (dev mount) or `content_base64`. Returns { jobId, numChunks, indexed: boolean }.
- Chat `/api/chat`: Accepts { jobId, question } and returns { answer, evidence[] } where evidence are slices with source ids and text.

Success criteria (functionality):
- Upload a CSV or sample file via frontend (or curl) => backend returns 201 and jobId.
- Poll job endpoint until status `done` => report files present under `reports/` and jobStore status updated.
- ML service has indexed the chunks and returns search/chat responses referencing the report content.
- Smoke-test (`scripts/smoke-test.ps1`) runs end-to-end without manual steps.

### 4 — Edge cases & important checks
- Empty file uploads: backend should mark job `failed` and record error message.
- Large files: enforce reasonable limits in multer and ML service chunking; measure and document max payloads.
- Partial indexing failures: backend must retry ML calls (already implemented with exponential backoff). Ensure retries are visible in logs and job metadata.
- Persistence outages (SQLite/filestore): ensure the worker marks job error and exposes a re-run/resume mechanism.

### 5 — Test / verification checklist (functionality-first)
1. Install deps and start compose locally (dev):

```pwsh
# from repo root (PowerShell)
npm install
pip install -r ml_service/requirements-full.txt
docker compose up --build -d
```

2. Run unit tests (backend/frontend):

```pwsh
npm test # runs Jest unit tests for backend and frontend where configured
```

3. Run the smoke test (automated):

```pwsh
powershell -File scripts/smoke-test.ps1
```

4. Manual sanity checks (if smoke-test fails):
- POST a file: curl -F "file=@public/samples/sample_financial_data.csv" http://localhost:3001/api/ingest
- Poll job: GET /api/job/<jobId>
- Fetch report: open `reports/report_<jobId>.json` or use the frontend Report Viewer.

### 6 — Shortcomings found in repo (actionable list to reach "perfect functionality")
1. Persistence: jobStore is SQLite (dev). For multi-node/staging use Postgres. Add migrations and environment config.
2. Object persistence: reports and index files are on local fs. For reliability use S3/MinIO and persist FAISS snapshots to object store.
3. ML service reproducibility: large model downloads during image build; pinning and layer-caching strategies are required to avoid frequent downloads.
4. End-to-end tests: there exists a smoke test; expand coverage with deterministic unit tests for ML client and a reproducible small embedding model mock to avoid flakiness in CI.
5. Secrets/config: switch from env-only to a secrets manager and document required env vars in `.env.example`.

### 7 — Recommended immediate functional improvements (prioritized)
- (P0) Expand tests: add unit tests for `src/mlClient.ts` (mock ML service) and for `ml_service/service.py` endpoints using FastAPI TestClient. Aim for deterministic behavior in CI by mocking heavy model calls.
- (P0) Add end-to-end smoke-test to run in CI using Docker Compose with images built from the PR and a light-weight ML mock when running in CI.
- (P1) Add basic retry and idempotency guarantees for job processing (ensure re-runnable worker for partial failures).
- (P1) Add explicit file-size and chunking limits and surface helpful error messages to the UI.

### 8 — Acceptance test script (short)
- Automated: `scripts/smoke-test.ps1` must return exit code 0 on success. The test should:
	- Upload sample CSV
	- Confirm job created
	- Poll until status=done or timeout
	- Call chat endpoint and assert evidence returned

Manual acceptance: run smoke-test and spot-check `reports/Professional_FDD_Report.docx` generation.

### 9 — Next immediate steps (after this doc)
1. Implement the deterministic ML mock used for CI. This will let us assert functionality in CI without downloading large models.
2. Add unit tests for mlClient and FastAPI endpoints.
3. Run the smoke test locally and fix any failures uncovered by tests.

---
Audit completed: this file documents the current architecture and a focused checklist to reach functional completeness. I will mark the audit task done in the tracked todo list.

Generated on: 2025-10-31
