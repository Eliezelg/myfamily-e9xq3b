#!/bin/bash

# MyFamily Platform Database Backup Script
# Version: 1.0.0
# Requires: aws-cli v2.x, postgresql-client v14, redis-tools v6.2

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
readonly S3_BUCKET="${S3_BUCKET:-myfamily-backups-${AWS_REGION}}"
readonly KMS_KEY_ID="${KMS_KEY_ID:-alias/myfamily-backup-key}"
readonly BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
readonly LOG_FILE="${LOG_FILE:-/var/log/myfamily/database-backups.log}"
readonly METRICS_ENDPOINT="${METRICS_ENDPOINT:-http://monitoring.myfamily.internal/backup-metrics}"
readonly MAX_RETRY_ATTEMPTS="${MAX_RETRY_ATTEMPTS:-3}"
readonly PARALLEL_JOBS="${PARALLEL_JOBS:-4}"
readonly COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-9}"
readonly ALERT_THRESHOLD_GB="${ALERT_THRESHOLD_GB:-100}"

# Timestamp for backup files
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly BACKUP_DIR="/tmp/myfamily_backup_${TIMESTAMP}"

# Logging setup
setup_logging() {
    local log_dir=$(dirname "${LOG_FILE}")
    mkdir -p "${log_dir}"
    exec 1> >(tee -a "${LOG_FILE}")
    exec 2> >(tee -a "${LOG_FILE}" >&2)
    chmod 640 "${LOG_FILE}"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1" >&2
    exit 1
}

# Health check functions
check_dependencies() {
    command -v aws >/dev/null 2>&1 || error "aws-cli is required"
    command -v pg_dump >/dev/null 2>&1 || error "postgresql-client is required"
    command -v redis-cli >/dev/null 2>&1 || error "redis-tools is required"
}

verify_s3_access() {
    aws s3 ls "s3://${S3_BUCKET}" >/dev/null 2>&1 || error "Cannot access S3 bucket ${S3_BUCKET}"
}

# PostgreSQL backup function
backup_postgres() {
    local db_host="$1"
    local db_name="$2"
    local backup_path="$3"
    local parallel_jobs="$4"
    local compression_level="$5"
    
    log "Starting PostgreSQL backup for ${db_name}"
    
    # Estimate backup size
    local estimated_size=$(psql -h "${db_host}" -t -c "SELECT pg_database_size('${db_name}')")
    if [ $((estimated_size/1024/1024/1024)) -gt "${ALERT_THRESHOLD_GB}" ]; then
        log "WARNING: Estimated backup size exceeds ${ALERT_THRESHOLD_GB}GB"
    fi
    
    # Create backup with parallel processing and compression
    pg_dump -h "${db_host}" \
            -d "${db_name}" \
            -j "${parallel_jobs}" \
            -F directory \
            -Z "${compression_level}" \
            -f "${backup_path}" || error "PostgreSQL backup failed"
            
    # Calculate checksum
    find "${backup_path}" -type f -exec sha256sum {} \; > "${backup_path}.sha256"
    
    # Encrypt backup
    tar czf - "${backup_path}" | \
    aws kms encrypt \
        --key-id "${KMS_KEY_ID}" \
        --output text \
        --query CiphertextBlob \
        > "${backup_path}.enc"
        
    # Upload to S3 with metadata
    aws s3 cp "${backup_path}.enc" \
        "s3://${S3_BUCKET}/postgres/${TIMESTAMP}/${db_name}.tar.gz.enc" \
        --metadata "checksum=$(cat ${backup_path}.sha256)" \
        || error "Failed to upload PostgreSQL backup to S3"
        
    log "PostgreSQL backup completed successfully"
}

# Redis backup function
backup_redis() {
    local redis_host="$1"
    local redis_port="$2"
    local backup_path="$3"
    local timeout_seconds="$4"
    
    log "Starting Redis backup"
    
    # Check Redis health
    redis-cli -h "${redis_host}" -p "${redis_port}" PING || error "Redis is not responding"
    
    # Trigger BGSAVE
    redis-cli -h "${redis_host}" -p "${redis_port}" BGSAVE
    
    # Wait for BGSAVE to complete
    local start_time=$(date +%s)
    while true; do
        if [ $(($(date +%s) - start_time)) -gt "${timeout_seconds}" ]; then
            error "Redis BGSAVE timeout after ${timeout_seconds} seconds"
        fi
        
        local save_in_progress=$(redis-cli -h "${redis_host}" -p "${redis_port}" INFO Persistence | grep rdb_bgsave_in_progress:1)
        if [ -z "${save_in_progress}" ]; then
            break
        fi
        sleep 5
    done
    
    # Copy RDB file
    redis-cli --rdb "${backup_path}.rdb" -h "${redis_host}" -p "${redis_port}"
    
    # Compress and encrypt
    gzip -c "${backup_path}.rdb" | \
    aws kms encrypt \
        --key-id "${KMS_KEY_ID}" \
        --output text \
        --query CiphertextBlob \
        > "${backup_path}.rdb.enc"
        
    # Upload to S3
    aws s3 cp "${backup_path}.rdb.enc" \
        "s3://${S3_BUCKET}/redis/${TIMESTAMP}/dump.rdb.enc" \
        --metadata "timestamp=${TIMESTAMP}" \
        || error "Failed to upload Redis backup to S3"
        
    log "Redis backup completed successfully"
}

# Cleanup function
cleanup_old_backups() {
    local s3_bucket="$1"
    local retention_days="$2"
    local verify_chain="$3"
    
    log "Starting cleanup of backups older than ${retention_days} days"
    
    # List old backups
    local old_backups=$(aws s3 ls "s3://${s3_bucket}" --recursive | \
                       awk -v date="$(date -d"-${retention_days} days" +%Y-%m-%d)" '$1 < date {print $4}')
    
    if [ "${verify_chain}" = true ]; then
        # Verify backup chain integrity before deletion
        for backup in ${old_backups}; do
            aws s3api head-object \
                --bucket "${s3_bucket}" \
                --key "${backup}" \
                --query Metadata.checksum >/dev/null 2>&1 || continue
        done
    fi
    
    # Delete old backups
    for backup in ${old_backups}; do
        aws s3 rm "s3://${s3_bucket}/${backup}" || log "WARNING: Failed to delete ${backup}"
    done
    
    log "Cleanup completed successfully"
}

# Main execution
main() {
    setup_logging
    check_dependencies
    verify_s3_access
    
    mkdir -p "${BACKUP_DIR}"
    trap 'rm -rf "${BACKUP_DIR}"' EXIT
    
    # Backup PostgreSQL
    backup_postgres \
        "${RDS_ENDPOINT}" \
        "${RDS_DATABASE_NAME}" \
        "${BACKUP_DIR}/postgres" \
        "${PARALLEL_JOBS}" \
        "${COMPRESSION_LEVEL}"
    
    # Backup Redis
    backup_redis \
        "${REDIS_ENDPOINT}" \
        "${REDIS_PORT}" \
        "${BACKUP_DIR}/redis" \
        300
    
    # Cleanup old backups
    cleanup_old_backups \
        "${S3_BUCKET}" \
        "${BACKUP_RETENTION_DAYS}" \
        true
}

main "$@"