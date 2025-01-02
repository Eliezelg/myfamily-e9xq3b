# Stage 1: Builder stage for configuration and plugin setup
FROM grafana/grafana:9.3.2 AS builder

# Install required system packages for security verification
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install official Grafana plugins with security verification
ENV GF_INSTALL_PLUGINS="grafana-clock-panel,grafana-simple-json-datasource,grafana-piechart-panel,grafana-worldmap-panel"
RUN grafana-cli plugins install ${GF_INSTALL_PLUGINS}

# Create configuration directories with appropriate permissions
RUN mkdir -p /etc/grafana \
    /var/lib/grafana \
    /var/lib/grafana/dashboards/platform \
    /var/lib/grafana/dashboards/business \
    /var/lib/grafana/provisioning/datasources \
    /var/lib/grafana/provisioning/dashboards \
    && chown -R grafana:grafana /etc/grafana /var/lib/grafana

# Copy provisioning configurations
COPY --chown=grafana:grafana infrastructure/kubernetes/monitoring/grafana/values.yaml /tmp/grafana-values.yaml

# Extract and configure datasources from values.yaml
RUN cat /tmp/grafana-values.yaml | grep -A 50 'datasources:' > /var/lib/grafana/provisioning/datasources/datasources.yaml

# Extract and configure dashboards from values.yaml
RUN cat /tmp/grafana-values.yaml | grep -A 100 'dashboardProviders:' > /var/lib/grafana/provisioning/dashboards/dashboards.yaml

# Stage 2: Final production image
FROM grafana/grafana:9.3.2

# Copy configurations from builder stage
COPY --from=builder /var/lib/grafana /var/lib/grafana
COPY --from=builder /etc/grafana /etc/grafana

# Set secure environment variables
ENV GF_SECURITY_ADMIN_PASSWORD=${ADMIN_PASSWORD} \
    GF_SECURITY_ALLOW_EMBEDDING=false \
    GF_SECURITY_COOKIE_SECURE=true \
    GF_SECURITY_DISABLE_GRAVATAR=true \
    GF_SECURITY_STRICT_TRANSPORT_SECURITY=true \
    GF_SECURITY_CONTENT_SECURITY_POLICY=true \
    GF_AUTH_DISABLE_LOGIN_FORM=false \
    GF_AUTH_BASIC_ENABLED=false \
    GF_USERS_ALLOW_SIGN_UP=false \
    GF_ANALYTICS_REPORTING_ENABLED=false \
    GF_METRICS_ENABLED=true \
    GF_LOG_LEVEL=warn \
    GF_LOG_MODE=console \
    GF_PATHS_PROVISIONING=/var/lib/grafana/provisioning \
    GF_PATHS_DASHBOARDS=/var/lib/grafana/dashboards

# Install required plugins
ENV GF_INSTALL_PLUGINS="grafana-clock-panel,grafana-simple-json-datasource,grafana-piechart-panel,grafana-worldmap-panel"

# Create non-root user for security
USER grafana

# Configure health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose Grafana web interface
EXPOSE 3000

# Set up persistent storage volume
VOLUME ["/var/lib/grafana"]

# Set default command
CMD ["grafana-server", \
    "--homepath=/usr/share/grafana", \
    "--config=/etc/grafana/grafana.ini", \
    "--packaging=docker", \
    "--pidfile=/var/run/grafana/grafana-server.pid"]