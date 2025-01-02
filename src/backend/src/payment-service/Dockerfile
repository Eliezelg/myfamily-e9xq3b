# Build stage
FROM node:18-alpine AS builder

# Build arguments
ARG NODE_ENV=production
ARG PORT=3003

# Set working directory
WORKDIR /usr/src/app

# Copy package files for layer caching
COPY package*.json ./

# Install dependencies with npm ci for reproducible builds
# Clean install, exact versions, no updates to package.json
RUN npm ci --only=production

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code with optimizations
RUN npm run build

# Security scan stage
FROM aquasec/trivy:latest AS security-scan
COPY --from=builder /usr/src/app /app
RUN trivy filesystem --no-progress --exit-code 1 --severity HIGH,CRITICAL /app

# Production stage
FROM node:18-alpine

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3003
ENV NODE_OPTIONS="--max-old-space-size=512"

# Create non-root user and set ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Set secure permissions
RUN chmod -R 550 . && \
    chmod -R 770 ./dist/logs

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose service port
EXPOSE ${PORT}

# Set resource limits and security options
ENV SECURITY_OPTS="no-new-privileges:true"

# Start the payment service
CMD ["node", "dist/app.js"]

# Labels for container metadata
LABEL maintainer="MyFamily Platform Team" \
      version="1.0.0" \
      description="Payment service for MyFamily platform" \
      security.privileged="false" \
      security.capabilities="none"