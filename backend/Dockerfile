FROM node:20-bullseye AS build
WORKDIR /app
# Copy only package files first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci --silent
# Copy source and build
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
# Copy package.json from the build image to install production deps
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --production --silent
EXPOSE 4000
# Use a Node-based healthcheck to avoid requiring wget/curl in the runtime image
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
	CMD ["sh", "-c", "node -e \"require('http').get('http://localhost:4000', res => { process.exit(res.statusCode===200?0:1); }).on('error', ()=>process.exit(1))\""]
CMD ["node", "dist/start.js"]
