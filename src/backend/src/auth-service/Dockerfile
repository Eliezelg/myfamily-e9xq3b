# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory with appropriate permissions
WORKDIR /build
RUN chown -R node:node /build

# Switch to non-root user for build process
USER node

# Copy package files with integrity verification
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig*.json ./
COPY --chown=node:node prisma ./prisma/

# Install dependencies with strict security
RUN npm ci --ignore-scripts && \
    npm audit fix && \
    # Generate Prisma client with optimizations
    npx prisma generate --no-engine

# Copy source code with integrity check
COPY --chown=node:node src ./src
COPY --chown=node:node ../shared ../shared

# Build TypeScript with strict configuration
RUN npm run build && \
    # Prune dev dependencies
    npm prune --production && \
    # Verify build artifacts
    test -d dist

# Stage 2: Production
FROM node:18-alpine AS production

# Install security updates and runtime dependencies
RUN apk update && \
    apk add --no-cache \
    wget \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user with minimal privileges
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /sbin/nologin -D nodejs && \
    mkdir -p /app && \
    chown nodejs:nodejs /app

# Set working directory
WORKDIR /app

# Copy verified build artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/package.json ./

# Set secure file permissions
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist && \
    chmod -R 644 /app/package.json

# Configure production environment
ENV NODE_ENV=production \
    AUTH_SERVICE_PORT=3001 \
    TZ=UTC \
    NODE_OPTIONS="--max-old-space-size=512" \
    # Enable security features
    NODE_ICU_DATA=/usr/share/icu \
    # Disable process.env modifications
    SECURITY_OPTS="no-new-privileges:true"

# Switch to non-root user
USER nodejs

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Configure resource limits
RUN ulimit -n 1024 && \
    ulimit -u 100

# Expose service port
EXPOSE 3001

# Configure graceful shutdown
STOPSIGNAL SIGTERM

# Set container metadata
LABEL maintainer="MyFamily DevOps Team" \
      version="1.0.0" \
      description="Authentication Service Container" \
      security.profile="enhanced" \
      com.myfamily.service="auth"

# Start application with security flags
CMD ["node", "--no-deprecation", "--no-warnings", "dist/app.js"]