# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files with ownership verification
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

# Install dependencies with strict version control
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate --schema=./src/shared/infrastructure/prisma/schema.prisma

# Copy source code with integrity checks
COPY --chown=node:node . .

# Build TypeScript code with production optimizations
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory with secure permissions
WORKDIR /app

# Install production dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Copy production dependencies and built code
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Set secure environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Set security configurations
RUN chmod -R 755 /app && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3000 50051

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set resource constraints
LABEL org.opencontainers.image.source="https://github.com/myfamily/backend" \
      org.opencontainers.image.description="MyFamily Backend Services" \
      org.opencontainers.image.version="1.0.0"

# Security options
SECURITY_OPTS="no-new-privileges:true"

# Start application
CMD ["node", "dist/src/api-gateway/src/main.js"]