#!/bin/bash

# Certificate Rotation Script for MyFamily Platform
# Version: 1.0.0
# Implements TLS 1.3 certificate rotation with comprehensive validation and monitoring

# Global configuration
CERT_MANAGER_NAMESPACE="cert-manager"
SERVICES_NAMESPACE="myfamily"
CERT_VALIDITY_DAYS="365"
LOG_FILE="/var/log/cert-rotation.log"
BACKUP_RETENTION_DAYS="90"
MAX_PARALLEL_ROTATIONS="3"
HEALTH_CHECK_TIMEOUT="30"
ROTATION_RETRY_COUNT="3"

# Set strict error handling
set -euo pipefail
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Initialize logging
setup_logging() {
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    log "INFO" "Certificate rotation script started"
}

# Logging function with severity levels
log() {
    local severity="$1"
    local message="$2"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${severity}] ${message}"
}

# Error handler function
error_handler() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local func_trace=$5
    
    log "ERROR" "Error occurred in command '${last_command}' on line ${line_no}"
    log "ERROR" "Function trace: ${func_trace}"
    log "ERROR" "Exit code: ${exit_code}"
    
    # Attempt cleanup on error
    cleanup_on_error
    exit "${exit_code}"
}

# Function to check cert-manager status
check_cert_manager_status() {
    local timeout=$1
    log "INFO" "Checking cert-manager status with timeout ${timeout}s"
    
    # Check cert-manager pod status
    if ! kubectl -n "${CERT_MANAGER_NAMESPACE}" wait --for=condition=ready pod -l app=cert-manager --timeout="${timeout}s"; then
        log "ERROR" "cert-manager pods not ready"
        return 1
    }
    
    # Verify CRD versions
    local required_crds=("certificates.cert-manager.io" "issuers.cert-manager.io" "clusterissuers.cert-manager.io")
    for crd in "${required_crds[@]}"; do
        if ! kubectl get crd "${crd}" &>/dev/null; then
            log "ERROR" "Required CRD ${crd} not found"
            return 1
        fi
    done
    
    # Check webhook availability
    if ! curl -sk "https://cert-manager-webhook.${CERT_MANAGER_NAMESPACE}.svc:443/healthz" --max-time "${timeout}"; then
        log "ERROR" "cert-manager webhook not healthy"
        return 1
    }
    
    log "INFO" "cert-manager status check passed"
    return 0
}

# Function to rotate service certificates
rotate_service_certificates() {
    local namespace=$1
    local batch_size=$2
    local force_rotation=${3:-false}
    
    log "INFO" "Starting service certificate rotation for namespace ${namespace}"
    
    # Get all services with TLS certificates
    local services=($(kubectl get certificates -n "${namespace}" -o jsonpath='{.items[*].metadata.name}'))
    if [ ${#services[@]} -eq 0 ]; then
        log "WARN" "No certificates found in namespace ${namespace}"
        return 0
    }
    
    # Create backup before rotation
    if ! backup_certificates "${namespace}" '{"full": true}'; then
        log "ERROR" "Failed to create backup before rotation"
        return 1
    }
    
    # Process certificates in batches
    local current_batch=0
    for ((i=0; i<${#services[@]}; i+=${batch_size})); do
        current_batch=$((current_batch + 1))
        log "INFO" "Processing batch ${current_batch}"
        
        # Process batch in parallel
        local pids=()
        for ((j=i; j<i+batch_size && j<${#services[@]}; j++)); do
            rotate_single_certificate "${services[j]}" "${namespace}" "${force_rotation}" &
            pids+=($!)
        done
        
        # Wait for all processes in batch
        for pid in "${pids[@]}"; do
            wait "${pid}" || {
                log "ERROR" "Certificate rotation failed in batch ${current_batch}"
                return 1
            }
        done
    done
    
    log "INFO" "Service certificate rotation completed successfully"
    return 0
}

# Function to rotate client certificates
rotate_client_certificates() {
    local service_name=$1
    local rotation_options=$2
    
    log "INFO" "Starting client certificate rotation for service ${service_name}"
    
    # Validate current client certificates
    if ! validate_certificates "/etc/kubernetes/pki/clients/${service_name}" "${rotation_options}"; then
        log "ERROR" "Current client certificates validation failed"
        return 1
    }
    
    # Generate new client certificates
    local temp_dir=$(mktemp -d)
    if ! generate_client_certificates "${service_name}" "${temp_dir}"; then
        log "ERROR" "Failed to generate new client certificates"
        rm -rf "${temp_dir}"
        return 1
    }
    
    # Validate new certificates
    if ! validate_certificates "${temp_dir}" "${rotation_options}"; then
        log "ERROR" "New client certificates validation failed"
        rm -rf "${temp_dir}"
        return 1
    }
    
    # Update service with new certificates
    if ! update_service_certificates "${service_name}" "${temp_dir}"; then
        log "ERROR" "Failed to update service with new certificates"
        rm -rf "${temp_dir}"
        return 1
    }
    
    rm -rf "${temp_dir}"
    log "INFO" "Client certificate rotation completed successfully"
    return 0
}

# Function to backup certificates
backup_certificates() {
    local namespace=$1
    local backup_options=$2
    
    local backup_dir="/var/backup/certificates/$(date +%Y%m%d_%H%M%S)"
    log "INFO" "Creating certificate backup in ${backup_dir}"
    
    # Create backup directory
    mkdir -p "${backup_dir}"
    
    # Export certificates and keys
    if ! kubectl get secrets -n "${namespace}" -o json | jq -r '.items[] | select(.type=="kubernetes.io/tls")' > "${backup_dir}/tls-secrets.json"; then
        log "ERROR" "Failed to export TLS secrets"
        return 1
    }
    
    # Encrypt backup
    if ! encrypt_backup "${backup_dir}"; then
        log "ERROR" "Failed to encrypt backup"
        return 1
    }
    
    # Clean old backups
    clean_old_backups "${BACKUP_RETENTION_DAYS}"
    
    log "INFO" "Certificate backup completed successfully"
    return 0
}

# Function to validate certificates
validate_certificates() {
    local certificate_path=$1
    local validation_options=$2
    
    log "INFO" "Validating certificates in ${certificate_path}"
    
    # Check TLS 1.3 compatibility
    if ! openssl x509 -in "${certificate_path}" -text | grep -q "TLS 1.3" ; then
        log "ERROR" "Certificate not compatible with TLS 1.3"
        return 1
    }
    
    # Verify certificate chain
    if ! openssl verify -CAfile /etc/kubernetes/pki/ca.crt "${certificate_path}"; then
        log "ERROR" "Certificate chain verification failed"
        return 1
    }
    
    # Check revocation status
    if ! check_certificate_revocation "${certificate_path}"; then
        log "ERROR" "Certificate revocation check failed"
        return 1
    }
    
    # Validate expiry
    local expiry=$(openssl x509 -in "${certificate_path}" -noout -enddate | cut -d= -f2)
    local expiry_epoch=$(date -d "${expiry}" +%s)
    local now_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))
    
    if [ "${days_until_expiry}" -lt "${CERT_VALIDITY_DAYS}" ]; then
        log "WARN" "Certificate will expire in ${days_until_expiry} days"
    fi
    
    log "INFO" "Certificate validation completed successfully"
    return 0
}

# Cleanup function
cleanup_on_error() {
    log "INFO" "Performing cleanup after error"
    # Remove temporary files and restore previous state if needed
    find /tmp -name "cert-rotation-*" -type d -mmin +60 -exec rm -rf {} \;
}

# Main execution
main() {
    setup_logging
    
    # Check prerequisites
    if ! check_cert_manager_status "${HEALTH_CHECK_TIMEOUT}"; then
        log "ERROR" "Prerequisites check failed"
        exit 1
    }
    
    # Rotate service certificates
    if ! rotate_service_certificates "${SERVICES_NAMESPACE}" "${MAX_PARALLEL_ROTATIONS}" false; then
        log "ERROR" "Service certificate rotation failed"
        exit 1
    }
    
    # Rotate client certificates if needed
    local services_with_mtls=($(kubectl get services -n "${SERVICES_NAMESPACE}" -l mtls=enabled -o jsonpath='{.items[*].metadata.name}'))
    for service in "${services_with_mtls[@]}"; do
        if ! rotate_client_certificates "${service}" '{"validate_mtls": true}'; then
            log "ERROR" "Client certificate rotation failed for service ${service}"
            exit 1
        fi
    done
    
    log "INFO" "Certificate rotation completed successfully"
}

# Execute main function
main "$@"