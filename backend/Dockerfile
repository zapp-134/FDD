FROM node:20-bullseye AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --silent
COPY backend .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY backend/package.json ./
RUN npm ci --production --silent
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -qO- http://localhost:4000/ || exit 1
CMD ["node", "dist/index.js"]
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
