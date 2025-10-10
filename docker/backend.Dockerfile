# Build stage
FROM node:20-bullseye AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --silent
COPY backend .
RUN npm run build

# Runtime stage
FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --production --silent
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["sh","-c","node -e \"require('http').get('http://localhost:4000',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))\""]
CMD ["node","dist/start.js"]
