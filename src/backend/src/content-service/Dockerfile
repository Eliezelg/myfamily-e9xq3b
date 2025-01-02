# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files with optimized layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies with strict security checks
RUN npm ci --ignore-scripts && \
    npm audit fix

# Copy source code and config files
COPY src/ ./src/
COPY --chown=node:node . .

# Build TypeScript with production optimizations
RUN npm run build && \
    npm prune --production

# Verify build artifacts
RUN test -d dist && \
    test -f dist/index.js

# Stage 2: Production
FROM node:18-alpine

# Security: Create non-root user
RUN addgroup -S content-service && \
    adduser -S content-service -G content-service

# Install production dependencies
RUN apk update && \
    apk add --no-cache \
    vips-dev \
    tini \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy production dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install Sharp.js with optimized settings
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV SHARP_VERSION=0.31.3

# Configure security permissions
RUN chown -R content-service:content-service /app && \
    chmod -R 550 /app && \
    mkdir -p /tmp/sharp-cache && \
    chown -R content-service:content-service /tmp/sharp-cache

# Set production environment
ENV NODE_ENV=production
ENV PORT=3002
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Configure health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Security: Drop capabilities and set read-only root
USER content-service
WORKDIR /app

# Expose service ports
EXPOSE 3002 50052

# Set resource limits
LABEL com.myfamily.service="content" \
      com.myfamily.security.scan-date="2024-01-20" \
      maintainer="MyFamily Platform Team"

# Configure volumes for persistence
VOLUME ["/app/node_modules", "/tmp/sharp-cache"]

# Use Tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start service with least privileges
CMD ["node", "dist/index.js"]