# Base image: prom/prometheus:v2.42.0
FROM prom/prometheus:v2.42.0 AS builder

# Build-time labels
LABEL maintainer="MyFamily DevOps Team" \
      version="1.0.0" \
      description="MyFamily Prometheus Monitoring"

# Create necessary directories
RUN mkdir -p /etc/prometheus \
    && mkdir -p /prometheus \
    && mkdir -p /etc/prometheus/rules.d

# Copy configuration files
COPY prometheus.yml /etc/prometheus/
COPY rules/*.yml /etc/prometheus/rules.d/

# Validate configuration files
RUN promtool check config /etc/prometheus/prometheus.yml \
    && for file in /etc/prometheus/rules.d/*.yml; do promtool check rules "$file"; done

# Create non-root user for security
RUN adduser --system --group --no-create-home prometheus \
    && chown -R prometheus:prometheus /etc/prometheus /prometheus

# Final production image
FROM prom/prometheus:v2.42.0

# Copy validated configurations from builder
COPY --from=builder --chown=prometheus:prometheus /etc/prometheus /etc/prometheus
COPY --from=builder --chown=prometheus:prometheus /prometheus /prometheus

# Set environment variables for Prometheus configuration
ENV PROMETHEUS_RETENTION_PERIOD="30d" \
    PROMETHEUS_STORAGE_TSDB_MIN_BLOCK_DURATION="2h" \
    PROMETHEUS_STORAGE_TSDB_RETENTION_SIZE="50GB"

# Configure storage and retention settings
RUN mkdir -p /prometheus \
    && chown -R prometheus:prometheus /prometheus

# Set up read-only root filesystem for security
RUN chmod -R 444 /etc/prometheus/* \
    && chmod 755 /prometheus

# Set resource limits and runtime configurations
RUN echo "storage.tsdb.retention.time=${PROMETHEUS_RETENTION_PERIOD}" >> /etc/prometheus/prometheus.yml \
    && echo "storage.tsdb.min-block-duration=${PROMETHEUS_STORAGE_TSDB_MIN_BLOCK_DURATION}" >> /etc/prometheus/prometheus.yml \
    && echo "storage.tsdb.retention.size=${PROMETHEUS_STORAGE_TSDB_RETENTION_SIZE}" >> /etc/prometheus/prometheus.yml

# Expose Prometheus web interface port
EXPOSE 9090

# Define volumes for persistence
VOLUME ["/prometheus", "/etc/prometheus"]

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --spider -S http://localhost:9090/-/healthy || exit 1

# Switch to non-root user
USER prometheus

# Set entrypoint with required flags
ENTRYPOINT [ "/bin/prometheus" ]
CMD [ \
    "--config.file=/etc/prometheus/prometheus.yml", \
    "--storage.tsdb.path=/prometheus", \
    "--web.console.libraries=/usr/share/prometheus/console_libraries", \
    "--web.console.templates=/usr/share/prometheus/consoles", \
    "--web.enable-lifecycle", \
    "--storage.tsdb.wal-compression" \
]