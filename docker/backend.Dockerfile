FROM node:18-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
# Install system build deps required for native modules (sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
		python3 \
		build-essential \
		libsqlite3-dev \
	&& rm -rf /var/lib/apt/lists/*

# Install node deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
# Ensure native modules (sqlite3) are built for the container platform
RUN npm rebuild sqlite3 --build-from-source || true
# Copy backend source from the build context
COPY . ./
# Build TypeScript
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/ingest.js"]
