Containerization quickstart

This repository now includes simple Dockerfiles and a docker-compose setup to run the frontend (static Vite build served by nginx), backend (Node/Express), and ml_service (FastAPI/uvicorn).

Quick steps (local dev):

1. Build and start services (from repo root):

   docker compose up --build

   - Frontend will be available at http://localhost:3000
   - Backend API will be available at http://localhost:3001/api
   - ML microservice will be available at http://localhost:8001

2. Notes and storage

   - Backend uploads and reports are persisted to Docker named volumes `backend_uploads` and `backend_reports`.
   - By default the backend will allow the ML HTTP fallback so it can start even if the ML service is not reachable; see `ALLOW_ML_HTTP_FALLBACK` in `docker-compose.yml`.

3. Building images separately

   - docker build -f docker/backend.Dockerfile -t fdd-backend:local ./backend
   - docker build -f docker/frontend.Dockerfile -t fdd-frontend:local .
   - docker build -f docker/ml.Dockerfile -t fdd-ml:local ./ml_service

4. Customization

   - You may want to provide environment variables (API keys) via an `.env` file and reference it in `docker-compose.yml` or in a CI pipeline.

Next steps (suggested):

- Add a `docker-compose.override.yml` for local development that mounts source folders and runs hot-reload (vite, ts-node-dev, uvicorn --reload).
- Add GitHub Actions to build and push images to your registry on merge.
- Harden images (non-root users, smaller base images) and add healthchecks.
