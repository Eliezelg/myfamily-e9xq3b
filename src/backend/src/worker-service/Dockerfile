# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && npm install -g node-gyp@latest

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Runtime stage
FROM node:18-alpine

# Install Sharp runtime dependencies
RUN apk add --no-cache \
    vips-dev \
    fftw-dev \
    libc6-compat

# Create non-root user
RUN addgroup -g 1001 -S node && \
    adduser -u 1001 -S node -G node

# Set working directory
WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV WORKER_SERVICE_PORT=3005
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV SHARP_IGNORE_GLOBAL=1

# Create and set permissions for required directories
RUN mkdir -p /tmp/processing && \
    chown -R node:node /tmp/processing && \
    chmod 755 /tmp/processing

# Switch to non-root user
USER node

# Expose health check port
EXPOSE 3005

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Set volume mount points
VOLUME ["/usr/src/app/node_modules", "/tmp"]

# Set security options
LABEL security.capabilities=NET_BIND_SERVICE
LABEL security.read_only=true
LABEL security.no_new_privileges=true

# Start the application
CMD ["node", "dist/index.js"]