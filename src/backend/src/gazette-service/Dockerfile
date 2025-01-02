# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ gcc

# Set working directory
WORKDIR /usr/src/app

# Copy package files for layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Install production dependencies
RUN apk add --no-cache \
    curl \
    ghostscript \
    imagemagick \
    libc6-compat \
    # Required for ICC profile handling
    lcms2 \
    # Required for PDF generation
    fontconfig \
    font-noto

# Set working directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV COLOR_PROFILE_PATH=/usr/src/app/icc/fogra39.icc
ENV PRINT_RESOLUTION=300

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package*.json ./

# Create required directories with correct permissions
RUN mkdir -p /usr/src/app/icc /usr/src/app/temp && \
    chown -R nodejs:nodejs /usr/src/app

# Set secure permissions
RUN chmod -R 550 /usr/src/app/dist && \
    chmod -R 550 /usr/src/app/node_modules && \
    chmod 550 /usr/src/app/package*.json && \
    chmod 770 /usr/src/app/temp

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Add container metadata
LABEL maintainer="MyFamily Platform Team" \
      service="gazette-service" \
      version="1.0.0" \
      print.dpi="300" \
      print.colorspace="cmyk" \
      print.icc="fogra39"

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set security options
SECURITY_OPTS --security-opt=no-new-privileges:true \
              --cap-drop=ALL \
              --cap-add=NET_BIND_SERVICE

# Mount points for persistent storage
VOLUME ["/usr/src/app/node_modules", "/usr/src/app/icc", "/usr/src/app/temp"]

# Start application
CMD ["node", "dist/main"]