#!/usr/bin/env bash

# MyFamily Platform Monitoring Stack Deployment Script
# Version: 1.0.0
# Dependencies:
# - helm v3.11+
# - kubectl v1.24+
# - yq v4.0+

set -euo pipefail

# Global variables
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly MONITORING_NAMESPACE="system"
readonly HELM_TIMEOUT="600s"
readonly RETRY_ATTEMPTS=3
readonly VALIDATION_TIMEOUT="300s"
readonly SECURITY_CONTEXT="restricted"
readonly LOG_LEVEL="INFO"
readonly TLS_VERIFY="true"
readonly BACKUP_ENABLED="true"

# Logging function
log() {
    local level="$1"
    local message="$2"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message"
}

# Validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating prerequisites..."

    # Check required tools
    for tool in helm kubectl yq; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "$tool is required but not installed"
            return 1
        fi
    done

    # Validate Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        return 1
    }

    # Validate YAML configurations
    local config_files=(
        "../kubernetes/monitoring/prometheus/values.yaml"
        "../kubernetes/monitoring/grafana/values.yaml"
        "../kubernetes/monitoring/jaeger/values.yaml"
        "../kubernetes/monitoring/elk/values.yaml"
    )

    for config in "${config_files[@]}"; do
        if ! yq eval '.' "$SCRIPT_DIR/$config" &> /dev/null; then
            log "ERROR" "Invalid YAML in $config"
            return 1
        fi
    done

    log "INFO" "Prerequisites validation successful"
    return 0
}

# Deploy Prometheus
deploy_prometheus() {
    log "INFO" "Deploying Prometheus..."
    
    local attempt=1
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        if helm upgrade --install prometheus prometheus-community/prometheus \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/prometheus/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic; then
            break
        fi
        
        log "WARN" "Prometheus deployment attempt $attempt failed, retrying..."
        ((attempt++))
        
        if [ $attempt -gt $RETRY_ATTEMPTS ]; then
            log "ERROR" "Failed to deploy Prometheus after $RETRY_ATTEMPTS attempts"
            return 1
        fi
        sleep 10
    done

    log "INFO" "Prometheus deployment successful"
    return 0
}

# Deploy Grafana
deploy_grafana() {
    log "INFO" "Deploying Grafana..."
    
    local attempt=1
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        if helm upgrade --install grafana grafana/grafana \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/grafana/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic; then
            break
        fi
        
        log "WARN" "Grafana deployment attempt $attempt failed, retrying..."
        ((attempt++))
        
        if [ $attempt -gt $RETRY_ATTEMPTS ]; then
            log "ERROR" "Failed to deploy Grafana after $RETRY_ATTEMPTS attempts"
            return 1
        fi
        sleep 10
    done

    log "INFO" "Grafana deployment successful"
    return 0
}

# Deploy Jaeger
deploy_jaeger() {
    log "INFO" "Deploying Jaeger..."
    
    local attempt=1
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        if helm upgrade --install jaeger jaegertracing/jaeger \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/jaeger/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic; then
            break
        fi
        
        log "WARN" "Jaeger deployment attempt $attempt failed, retrying..."
        ((attempt++))
        
        if [ $attempt -gt $RETRY_ATTEMPTS ]; then
            log "ERROR" "Failed to deploy Jaeger after $RETRY_ATTEMPTS attempts"
            return 1
        fi
        sleep 10
    done

    log "INFO" "Jaeger deployment successful"
    return 0
}

# Deploy ELK Stack
deploy_elk() {
    log "INFO" "Deploying ELK Stack..."
    
    local attempt=1
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        if helm upgrade --install elasticsearch elastic/elasticsearch \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/elk/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic && \
           helm upgrade --install kibana elastic/kibana \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/elk/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic && \
           helm upgrade --install logstash elastic/logstash \
            --namespace "$MONITORING_NAMESPACE" \
            --values "$SCRIPT_DIR/../kubernetes/monitoring/elk/values.yaml" \
            --timeout "$HELM_TIMEOUT" \
            --wait \
            --atomic; then
            break
        fi
        
        log "WARN" "ELK Stack deployment attempt $attempt failed, retrying..."
        ((attempt++))
        
        if [ $attempt -gt $RETRY_ATTEMPTS ]; then
            log "ERROR" "Failed to deploy ELK Stack after $RETRY_ATTEMPTS attempts"
            return 1
        fi
        sleep 10
    done

    log "INFO" "ELK Stack deployment successful"
    return 0
}

# Verify deployment
verify_deployment() {
    local component="$1"
    log "INFO" "Verifying $component deployment..."

    local timeout_seconds=300
    local interval=5
    local elapsed=0

    while [ $elapsed -lt $timeout_seconds ]; do
        if kubectl get pods -n "$MONITORING_NAMESPACE" -l "app=$component" \
            -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -q "True"; then
            log "INFO" "$component verification successful"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log "ERROR" "$component verification failed after ${timeout_seconds}s"
    return 1
}

# Setup backup procedures
setup_backup() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        log "INFO" "Backup setup skipped as BACKUP_ENABLED is not true"
        return 0
    fi

    log "INFO" "Setting up backup procedures..."

    # Create backup CronJobs for each component
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monitoring-backup
  namespace: $MONITORING_NAMESPACE
spec:
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl create snapshot pvc/prometheus-data -n $MONITORING_NAMESPACE
              kubectl create snapshot pvc/elasticsearch-data -n $MONITORING_NAMESPACE
              kubectl create snapshot pvc/grafana-data -n $MONITORING_NAMESPACE
          restartPolicy: OnFailure
EOF

    log "INFO" "Backup procedures setup successful"
    return 0
}

# Main function
main() {
    log "INFO" "Starting monitoring stack deployment..."

    # Validate prerequisites
    if ! validate_prerequisites; then
        log "ERROR" "Prerequisites validation failed"
        exit 1
    fi

    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$MONITORING_NAMESPACE" &> /dev/null; then
        kubectl create namespace "$MONITORING_NAMESPACE"
    fi

    # Deploy components
    local components=(
        "prometheus"
        "grafana"
        "jaeger"
        "elk"
    )

    for component in "${components[@]}"; do
        if ! "deploy_$component"; then
            log "ERROR" "Failed to deploy $component"
            exit 1
        fi

        if ! verify_deployment "$component"; then
            log "ERROR" "Failed to verify $component deployment"
            exit 1
        fi
    done

    # Setup backup procedures
    if ! setup_backup; then
        log "ERROR" "Failed to setup backup procedures"
        exit 1
    }

    log "INFO" "Monitoring stack deployment completed successfully"
    return 0
}

# Execute main function
main "$@"