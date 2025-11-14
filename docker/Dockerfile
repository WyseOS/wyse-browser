# Multi-stage Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY browser/package.json browser/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY browser/ .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine

# Install dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    xvfb \
    mesa-gl \
    ffmpeg \
    libxi \
    libxcomposite \
    libxdamage \
    libxrandr \
    alsa-lib \
    libxscrnsaver \
    libc6-compat

# Set environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/local/bin/browsers
ENV NODE_ENV=production
ENV PORT=13100

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files from builder
COPY browser/package.json browser/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy any other necessary files
COPY browser/build_worklets.sh ./
RUN chmod +x ./build_worklets.sh

# Expose port
EXPOSE 13100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:13100/api/health || exit 1

# Run the application
CMD ["pnpm", "start:prod"]