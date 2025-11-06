# Multi-stage build: build Vite app and serve with nginx
# Build stage: install dev dependencies so Vite is available during build
FROM node:18-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund
# Copy sources and build
COPY . .
RUN npm run build

# Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Basic nginx config: serve single-page app
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
