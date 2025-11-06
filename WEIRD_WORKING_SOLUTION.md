# Weird Working Solution

Committed: 2025-11-06
Branch: local-branch

This repository snapshot is intentionally captured as a "weird working solution" — a pragmatic, demo-ready local/dev build that prioritizes reproducibility, recoverability and rapid developer iteration over full production hardening.

Summary of what this snapshot contains:

- Frontend
  - React + Vite + TypeScript UI with PDF export and a relocated "raw JSON" toggle (`src/components/ReportViewer.tsx`, `src/components/Header.tsx`).

- Backend
  - Express.js + TypeScript backend with a file-backed job store (`backend/jobs.json`), ingest/reprocess endpoints, defensive merges, and a reprocess API (`backend/src/ingest.ts`, `backend/src/jobStore.ts`).

- ML integration
  - Local Python `ml_service/` microservice and direct Gemini API integration with deterministic local generator fallbacks (`backend/src/mlClient.ts`, `backend/src/reportGenerator.ts`).

- Reliability tooling
  - `backend/scripts/fix_report_files.js` to backfill missing `files` arrays in persisted reports, plus code to persist and repair report JSONs when missing metadata.

- Devops
  - `Dockerfile`s and `docker-compose.yml` for local orchestration of frontend, backend and ml_service. Environment-based config (.env) for keys.

Important notes (what's NOT included / planned):
- This snapshot does NOT include CI/CD workflows, production monitoring (Prometheus/Grafana), enterprise RBAC/SSO, image signing or a production vector DB.
- These items are planned as next steps before productionization.

Purpose:
- Keep a human-readable tag in the repo describing the current state so reviewers and auditors understand this is a deliberate, functioning local/dev snapshot.

If you'd like, I can also create a Git tag (e.g. `weird-working-solution`) or a dedicated release note.  

---
