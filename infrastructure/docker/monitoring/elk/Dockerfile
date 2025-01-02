# Elasticsearch Stage
FROM docker.elastic.co/elasticsearch/elasticsearch:7.17.3 as elasticsearch
LABEL maintainer="MyFamily Platform Team"
LABEL description="Production ELK Stack for MyFamily Platform"
LABEL version="7.17.3"

# Security hardening
USER root
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R elasticsearch:elasticsearch /usr/share/elasticsearch

USER elasticsearch

# Elasticsearch configuration
ENV discovery.type=single-node \
    ES_JAVA_OPTS="-Xms4g -Xmx4g" \
    xpack.security.enabled=true \
    xpack.security.transport.ssl.enabled=true \
    xpack.security.http.ssl.enabled=true \
    xpack.security.audit.enabled=true \
    xpack.monitoring.enabled=true \
    xpack.monitoring.collection.enabled=true \
    xpack.security.audit.logfile.events.include=access_denied,authentication_failed,connection_denied

# Configure Prometheus monitoring
COPY elasticsearch-prometheus-exporter.yml /usr/share/elasticsearch/config/
RUN chmod 644 /usr/share/elasticsearch/config/elasticsearch-prometheus-exporter.yml

EXPOSE 9200 9300

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -s -k -u ${ELASTIC_USER}:${ELASTIC_PASSWORD} https://localhost:9200/_cluster/health | grep -q 'status.*green'

VOLUME ["/usr/share/elasticsearch/data", "/usr/share/elasticsearch/config/certs"]

# Logstash Stage
FROM docker.elastic.co/logstash/logstash:7.17.3 as logstash
LABEL maintainer="MyFamily Platform Team"
LABEL description="Logstash for MyFamily Platform"
LABEL version="7.17.3"

# Security hardening
USER root
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R logstash:logstash /usr/share/logstash

USER logstash

# Logstash configuration
ENV LS_JAVA_OPTS="-Xms2g -Xmx2g" \
    xpack.monitoring.enabled=true \
    xpack.monitoring.elasticsearch.hosts=http://elasticsearch:9200 \
    config.reload.automatic=true

# Configure Prometheus monitoring
COPY logstash-prometheus-exporter.yml /usr/share/logstash/config/
RUN chmod 644 /usr/share/logstash/config/logstash-prometheus-exporter.yml

EXPOSE 5044 9600

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -s http://localhost:9600/_node/stats | grep -q 'status.*ok'

VOLUME ["/usr/share/logstash/pipeline", "/usr/share/logstash/config/certs"]

# Kibana Stage
FROM docker.elastic.co/kibana/kibana:7.17.3 as kibana
LABEL maintainer="MyFamily Platform Team"
LABEL description="Kibana for MyFamily Platform"
LABEL version="7.17.3"

# Security hardening
USER root
RUN apt-get update && apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/* && \
    chown -R kibana:kibana /usr/share/kibana

USER kibana

# Kibana configuration
ENV ELASTICSEARCH_HOSTS=http://elasticsearch:9200 \
    xpack.security.enabled=true \
    xpack.encryptedSavedObjects.encryptionKey=${ENCRYPTION_KEY} \
    xpack.security.audit.enabled=true \
    xpack.reporting.enabled=true \
    xpack.monitoring.enabled=true \
    server.ssl.enabled=true

# Configure Prometheus monitoring
COPY kibana-prometheus-exporter.yml /usr/share/kibana/config/
RUN chmod 644 /usr/share/kibana/config/kibana-prometheus-exporter.yml

EXPOSE 5601

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -s -k https://localhost:5601/api/status | grep -q 'status.*green'

VOLUME ["/usr/share/kibana/config/certs"]

# Common logging configuration for all services
LABEL logging.driver=json-file
LABEL logging.options.max-size=100m
LABEL logging.options.max-file=5
LABEL logging.options.compress=true
LABEL logging.options.labels=production_elk

# Set default command to run the service
CMD ["elasticsearch"]