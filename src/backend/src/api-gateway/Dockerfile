# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files for layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions and security audit
RUN npm ci --only=production && \
    npm audit fix

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build && \
    npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Add labels
LABEL maintainer="MyFamily DevOps Team" \
      version="1.0.0" \
      description="MyFamily API Gateway Service"

# Install runtime dependencies
RUN apk add --no-cache curl tini

# Create non-root user
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Set working directory
WORKDIR /app

# Copy production artifacts from builder
COPY --from=builder --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodeapp /app/package.json ./

# Configure environment
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Set security configurations
RUN chmod -R 555 /app && \
    mkdir -p /app/logs && \
    chown -R nodeapp:nodeapp /app/logs

# Switch to non-root user
USER nodeapp

# Expose API port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/app.js"]

# Security options
STOPSIGNAL SIGTERM

# Read-only root filesystem
VOLUME ["/app/logs"]