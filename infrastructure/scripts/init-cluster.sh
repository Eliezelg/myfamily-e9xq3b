#!/bin/bash

# MyFamily Platform - Kubernetes Cluster Initialization Script
# Version: 1.0.0
# Dependencies:
# - kubectl v1.24+
# - helm v3.11+
# - aws-cli v2.0+

set -euo pipefail

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUBERNETES_DIR="${SCRIPT_DIR}/../kubernetes"
LOG_FILE="/var/log/myfamily-cluster-init.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log messages with timestamp
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to validate prerequisites
validate_prerequisites() {
    log "INFO" "Validating prerequisites..."

    # Check AWS CLI version
    if ! aws --version | grep -q "aws-cli/2"; then
        log "ERROR" "AWS CLI v2.0+ is required"
        exit 1
    fi

    # Check kubectl version
    if ! kubectl version --client | grep -q "v1.24"; then
        log "ERROR" "kubectl v1.24+ is required"
        exit 1
    }

    # Check helm version
    if ! helm version | grep -q "v3.11"; then
        log "ERROR" "Helm v3.11+ is required"
        exit 1
    }

    # Validate AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log "ERROR" "Invalid AWS credentials"
        exit 1
    }

    log "INFO" "Prerequisites validation completed"
}

# Function to initialize EKS cluster
init_cluster() {
    local cluster_name=$1
    local aws_region=$2
    local log_level=$3

    log "INFO" "Initializing EKS cluster: ${cluster_name} in ${aws_region}"

    # Create EKS cluster with security hardening
    eksctl create cluster \
        --name "${cluster_name}" \
        --region "${aws_region}" \
        --version 1.24 \
        --node-type t3.large \
        --nodes 3 \
        --nodes-min 3 \
        --nodes-max 10 \
        --with-oidc \
        --ssh-access=false \
        --ssh-public-key="" \
        --managed \
        --alb-ingress-access \
        --full-ecr-access \
        --vpc-private-subnets="subnet-xxx,subnet-yyy" \
        --vpc-public-subnets="subnet-aaa,subnet-bbb" \
        --asg-access \
        --external-dns-access \
        --appmesh-access \
        --enable-ssm

    # Configure RBAC
    kubectl apply -f "${KUBERNETES_DIR}/base/rbac/"

    # Apply security contexts
    kubectl apply -f "${KUBERNETES_DIR}/base/security/"

    return 0
}

# Function to setup namespaces with enhanced isolation
setup_namespaces() {
    local environment=$1

    log "INFO" "Setting up namespaces for environment: ${environment}"

    # Apply namespace configurations
    kubectl apply -f "${KUBERNETES_DIR}/base/namespaces.yaml"

    # Apply network policies
    kubectl apply -f "${KUBERNETES_DIR}/base/network-policies.yaml"

    # Setup resource quotas
    kubectl apply -f "${KUBERNETES_DIR}/base/resource-quotas/"

    # Validate namespace isolation
    for ns in production staging system; do
        if ! kubectl get namespace "$ns" &>/dev/null; then
            log "ERROR" "Namespace $ns creation failed"
            return 1
        fi
    done

    return 0
}

# Function to install monitoring stack
install_monitoring() {
    log "INFO" "Installing monitoring stack"

    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update

    # Install Prometheus with custom values
    helm upgrade --install prometheus prometheus-community/prometheus \
        --namespace system \
        --create-namespace \
        --values "${KUBERNETES_DIR}/monitoring/prometheus/values.yaml" \
        --wait

    # Install Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace system \
        --create-namespace \
        --values "${KUBERNETES_DIR}/monitoring/grafana/values.yaml" \
        --wait

    # Setup logging with EFK stack
    kubectl apply -f "${KUBERNETES_DIR}/monitoring/efk/"

    return 0
}

# Function to install API Gateway
install_api_gateway() {
    log "INFO" "Installing API Gateway"

    helm upgrade --install api-gateway nginx-ingress/nginx-ingress \
        --namespace system \
        --create-namespace \
        --values "${KUBERNETES_DIR}/services/api-gateway/values.yaml" \
        --wait

    return 0
}

# Main execution function
main() {
    local cluster_name=${1:-"myfamily-platform"}
    local aws_region=${2:-$(aws configure get region)}
    local environment=${3:-"production"}
    local log_level=${4:-"INFO"}

    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "${LOG_FILE}")"

    log "INFO" "Starting cluster initialization"
    
    # Validate prerequisites
    validate_prerequisites

    # Initialize cluster
    if ! init_cluster "${cluster_name}" "${aws_region}" "${log_level}"; then
        log "ERROR" "Cluster initialization failed"
        exit 1
    fi

    # Setup namespaces
    if ! setup_namespaces "${environment}"; then
        log "ERROR" "Namespace setup failed"
        exit 1
    fi

    # Install monitoring
    if ! install_monitoring; then
        log "ERROR" "Monitoring installation failed"
        exit 1
    fi

    # Install API Gateway
    if ! install_api_gateway; then
        log "ERROR" "API Gateway installation failed"
        exit 1
    }

    log "INFO" "Cluster initialization completed successfully"
    return 0
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi