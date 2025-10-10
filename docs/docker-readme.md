# Docker for FDD

Build locally:

```bash
# frontend image and backend image
npm run docker:build
```

Start services:

```bash
npm run docker:up
# or
docker compose up --build -d
```

Smoke tests:

```bash
curl -I http://localhost:5173/
curl -I http://localhost:4000/health
```

CI notes:

- The GitHub Actions workflow has a `docker` job that builds images using Buildx and will push images when `DOCKER_REGISTRY`, `DOCKER_USERNAME`, and `DOCKER_PASSWORD` are configured as secrets.
- To enable pushes, set those secrets in the repository settings.
