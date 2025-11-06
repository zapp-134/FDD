#!/usr/bin/env bash
# Start backend and frontend concurrently for POSIX systems
set -e
(cd backend && npm run dev) &
(cd frontend && npm run dev) &
wait
#!/usr/bin/env bash
set -euo pipefail

(cd backend && npm run dev) &
(cd . && npm run dev:frontend) &
wait
