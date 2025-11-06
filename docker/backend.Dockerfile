FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
# Install build deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --no-audit --no-fund
# Copy backend source
COPY backend ./
# Build TypeScript
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/ingest.js"]
