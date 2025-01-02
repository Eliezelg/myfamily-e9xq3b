# Start with the official Jaeger base image
FROM jaegertracing/all-in-one:1.42.0 as builder

# Build stage for configuration and security setup
WORKDIR /build

# Install required utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create configuration directories
RUN mkdir -p /build/config/jaeger \
    && mkdir -p /build/config/security \
    && mkdir -p /build/config/monitoring

# Copy and validate sampling configuration
COPY sampling.json /build/config/jaeger/
RUN chmod 444 /build/config/jaeger/sampling.json

# Setup security configurations
RUN addgroup --system --gid 10001 jaeger \
    && adduser --system --uid 10001 --gid 10001 jaeger

# Final production image
FROM jaegertracing/all-in-one:1.42.0

# Copy configurations from builder
COPY --from=builder /build/config/jaeger /etc/jaeger
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Set environment variables for Elasticsearch integration
ENV SPAN_STORAGE_TYPE=elasticsearch \
    SAMPLING_STRATEGIES_FILE=/etc/jaeger/sampling.json \
    COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
    MEMORY_MAX_TRACES=50000 \
    ES_SERVER_URLS=http://elasticsearch:9200 \
    # Credentials will be mounted from Kubernetes secrets
    ES_USERNAME=from-secret \
    ES_PASSWORD=from-secret

# Configure resource limits and monitoring
ENV JAEGER_AGENT_TAGS=cluster=production \
    METRICS_STORAGE_TYPE=prometheus \
    METRICS_BACKEND_URL=http://prometheus:9090 \
    MAX_MEMORY_MB=1024 \
    CPU_TARGET_UTILIZATION=0.8

# Security hardening
RUN chmod -R 444 /etc/jaeger \
    && chmod 755 /usr/local/bin/jaeger-* \
    && chown -R jaeger:jaeger /etc/jaeger \
    && mkdir -p /tmp/jaeger \
    && chown -R jaeger:jaeger /tmp/jaeger \
    && chmod 755 /tmp/jaeger

# Set read-only filesystem where possible
VOLUME ["/etc/jaeger", "/tmp/jaeger"]

# Switch to non-root user
USER jaeger

# Expose required ports
# Collector gRPC and HTTP
EXPOSE 14250 14268
# Query UI
EXPOSE 16686
# Agent UDP ports
EXPOSE 5775/udp 6831/udp 6832/udp

# Health check configuration
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:16686/health || exit 1

# Set resource limits
LABEL com.myfamily.resource.memory.limit="1Gi" \
      com.myfamily.resource.cpu.limit="1000m" \
      com.myfamily.resource.memory.request="512Mi" \
      com.myfamily.resource.cpu.request="500m"

# Set security labels
LABEL com.myfamily.security.rootless="true" \
      com.myfamily.security.readonly-fs="partial" \
      com.myfamily.security.privileged="false"

# Set monitoring labels
LABEL com.myfamily.monitoring.prometheus="true" \
      com.myfamily.monitoring.metrics-port="16686" \
      com.myfamily.monitoring.health-port="16686"

# Command to run Jaeger with optimized settings
ENTRYPOINT ["/usr/local/bin/jaeger-all-in-one"]
CMD ["--sampling.strategies-file=/etc/jaeger/sampling.json", \
     "--collector.grpc.host-port=:14250", \
     "--collector.http.host-port=:14268", \
     "--query.base-path=/", \
     "--query.host-port=:16686", \
     "--log-level=info"]