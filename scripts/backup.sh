#!/usr/bin/env bash
#
# META-STAMP V3 - MongoDB Backup Script
# 
# Automated MongoDB database backup with:
# - Timestamp-based backup naming
# - Gzip compression during mongodump and tar.gz archiving
# - Optional S3 upload for disaster recovery
# - Automatic cleanup of old backups based on retention policy
#
# Usage:
#   ./backup.sh                    # Run backup with defaults
#   ./backup.sh --help             # Show help message
#   ./backup.sh --s3               # Enable S3 upload
#   ./backup.sh --retention 7      # Keep backups for 7 days
#   ./backup.sh --dry-run          # Show what would be done without executing
#
# Environment Variables (can be set in .env file):
#   MONGODB_URI            - MongoDB connection URI (default: mongodb://localhost:27017)
#   MONGO_USERNAME         - MongoDB username (optional if not using auth)
#   MONGO_PASSWORD         - MongoDB password (optional if not using auth)
#   MONGO_AUTH_DB          - MongoDB authentication database (default: admin)
#   MONGO_DATABASE         - Database to backup (default: all databases)
#   BACKUP_DIR             - Backup storage directory (default: ./backups)
#   BACKUP_RETENTION_DAYS  - Days to keep local backups (default: 30)
#   S3_UPLOAD_ENABLED      - Enable S3 upload (default: false)
#   S3_BUCKET              - S3 bucket name for uploads
#   S3_PREFIX              - S3 key prefix for backups (default: mongodb-backups/)
#   AWS_ACCESS_KEY_ID      - AWS access key for S3
#   AWS_SECRET_ACCESS_KEY  - AWS secret key for S3
#   AWS_REGION             - AWS region (default: us-east-1)
#   S3_ENDPOINT_URL        - Custom S3 endpoint (for MinIO compatibility)
#

set -o errexit    # Exit on error
set -o nounset    # Exit on unset variable
set -o pipefail   # Exit on pipe failure

# =============================================================================
# CONSTANTS AND DEFAULTS
# =============================================================================

# Declare variables first, then assign to avoid masking return values (shellcheck SC2155)
SCRIPT_NAME=""
SCRIPT_DIR=""
ROOT_DIR=""
TIMESTAMP=""
DATE_DIR=""
LOG_FILE=""

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR

ROOT_DIR="$(dirname "$SCRIPT_DIR")"
readonly ROOT_DIR

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
readonly TIMESTAMP

DATE_DIR="$(date +%Y%m%d)"
readonly DATE_DIR

LOG_FILE="/tmp/metastamp_backup_${TIMESTAMP}.log"
readonly LOG_FILE

# Default configuration values
DEFAULT_MONGODB_URI="mongodb://localhost:27017"
DEFAULT_MONGO_AUTH_DB="admin"
DEFAULT_BACKUP_DIR="${ROOT_DIR}/backups"
DEFAULT_BACKUP_RETENTION_DAYS=30
DEFAULT_S3_PREFIX="mongodb-backups/"
DEFAULT_AWS_REGION="us-east-1"

# Color codes for terminal output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_ERROR_GENERAL=1
readonly EXIT_ERROR_MISSING_DEPS=2
readonly EXIT_ERROR_BACKUP_FAILED=3
readonly EXIT_ERROR_COMPRESSION_FAILED=4
readonly EXIT_ERROR_S3_UPLOAD_FAILED=5
readonly EXIT_ERROR_INVALID_ARGS=6

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Log message with timestamp to both stdout and log file
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    case "$level" in
        INFO)
            echo -e "${BLUE}[${timestamp}]${NC} ${GREEN}[INFO]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        WARN)
            echo -e "${BLUE}[${timestamp}]${NC} ${YELLOW}[WARN]${NC} $message" | tee -a "$LOG_FILE"
            ;;
        ERROR)
            echo -e "${BLUE}[${timestamp}]${NC} ${RED}[ERROR]${NC} $message" | tee -a "$LOG_FILE" >&2
            ;;
        DEBUG)
            if [[ "${VERBOSE:-false}" == "true" ]]; then
                echo -e "${BLUE}[${timestamp}]${NC} [DEBUG] $message" | tee -a "$LOG_FILE"
            fi
            ;;
        *)
            echo -e "${BLUE}[${timestamp}]${NC} $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Print error message and exit with code
die() {
    local message="$1"
    local exit_code="${2:-$EXIT_ERROR_GENERAL}"
    log "ERROR" "$message"
    exit "$exit_code"
}

# Display usage information
show_help() {
    cat << EOF
META-STAMP V3 - MongoDB Backup Script

Usage: ${SCRIPT_NAME} [OPTIONS]

Options:
    -h, --help              Show this help message and exit
    -s, --s3                Enable S3 upload (overrides S3_UPLOAD_ENABLED env var)
    -r, --retention DAYS    Number of days to keep local backups (default: 30)
    -d, --dir PATH          Backup storage directory (default: ./backups)
    -b, --database NAME     Specific database to backup (default: all databases)
    -n, --dry-run           Show what would be done without executing
    -v, --verbose           Enable verbose output
    -q, --quiet             Suppress non-error output

Environment Variables:
    MONGODB_URI             MongoDB connection URI
    MONGO_USERNAME          MongoDB username
    MONGO_PASSWORD          MongoDB password
    MONGO_AUTH_DB           MongoDB authentication database (default: admin)
    MONGO_DATABASE          Database to backup (default: all)
    BACKUP_DIR              Backup storage directory
    BACKUP_RETENTION_DAYS   Days to keep local backups (default: 30)
    S3_UPLOAD_ENABLED       Enable S3 upload (true/false)
    S3_BUCKET               S3 bucket name for uploads
    S3_PREFIX               S3 key prefix for backups
    S3_ENDPOINT_URL         Custom S3 endpoint (for MinIO)
    AWS_ACCESS_KEY_ID       AWS access key
    AWS_SECRET_ACCESS_KEY   AWS secret key
    AWS_REGION              AWS region (default: us-east-1)

Examples:
    # Basic backup with defaults
    ${SCRIPT_NAME}

    # Backup with S3 upload
    ${SCRIPT_NAME} --s3

    # Backup with custom retention period
    ${SCRIPT_NAME} --retention 7

    # Backup specific database
    ${SCRIPT_NAME} --database metastamp

    # Dry run to see what would happen
    ${SCRIPT_NAME} --dry-run --s3

Exit Codes:
    0  Success
    1  General error
    2  Missing dependencies
    3  Backup failed
    4  Compression failed
    5  S3 upload failed
    6  Invalid arguments

EOF
}

# Load environment variables from .env file if it exists
load_env_file() {
    local env_file="${ROOT_DIR}/.env"
    local backend_env_file="${ROOT_DIR}/backend/.env"
    
    if [[ -f "$env_file" ]]; then
        log "INFO" "Loading environment from ${env_file}"
        # Export variables from .env file, ignoring comments and empty lines
        set -o allexport
        # shellcheck source=/dev/null
        source "$env_file"
        set +o allexport
    elif [[ -f "$backend_env_file" ]]; then
        log "INFO" "Loading environment from ${backend_env_file}"
        set -o allexport
        # shellcheck source=/dev/null
        source "$backend_env_file"
        set +o allexport
    else
        log "DEBUG" "No .env file found, using environment variables or defaults"
    fi
}

# Check for required dependencies
check_dependencies() {
    local missing_deps=()
    
    # Check for mongodump
    if ! command -v mongodump &> /dev/null; then
        missing_deps+=("mongodump (MongoDB Database Tools)")
    fi
    
    # Check for tar
    if ! command -v tar &> /dev/null; then
        missing_deps+=("tar")
    fi
    
    # Check for gzip
    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi
    
    # Check for AWS CLI if S3 upload is enabled
    if [[ "${S3_UPLOAD_ENABLED:-false}" == "true" ]]; then
        if ! command -v aws &> /dev/null; then
            missing_deps+=("aws-cli (for S3 upload)")
        fi
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log "ERROR" "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            log "ERROR" "  - $dep"
        done
        log "ERROR" ""
        log "ERROR" "Installation instructions:"
        log "ERROR" "  MongoDB Tools: https://www.mongodb.com/try/download/database-tools"
        log "ERROR" "  AWS CLI: pip install awscli or apt-get install awscli"
        die "Please install missing dependencies and try again." "$EXIT_ERROR_MISSING_DEPS"
    fi
    
    log "INFO" "All required dependencies are available"
}

# Validate configuration
validate_config() {
    log "DEBUG" "Validating configuration..."
    
    # Validate backup directory is writable
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "INFO" "Creating backup directory: ${BACKUP_DIR}"
        if [[ "${DRY_RUN:-false}" != "true" ]]; then
            mkdir -p "$BACKUP_DIR" || die "Failed to create backup directory: ${BACKUP_DIR}"
        fi
    fi
    
    if [[ "${DRY_RUN:-false}" != "true" ]] && [[ ! -w "$BACKUP_DIR" ]]; then
        die "Backup directory is not writable: ${BACKUP_DIR}" "$EXIT_ERROR_GENERAL"
    fi
    
    # Validate S3 configuration if S3 upload is enabled
    if [[ "${S3_UPLOAD_ENABLED:-false}" == "true" ]]; then
        if [[ -z "${S3_BUCKET:-}" ]]; then
            die "S3_BUCKET must be set when S3 upload is enabled" "$EXIT_ERROR_INVALID_ARGS"
        fi
        
        if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]] || [[ -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
            log "WARN" "AWS credentials not explicitly set, relying on AWS CLI default credentials"
        fi
    fi
    
    # Validate retention days is a positive number
    if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || [[ "$BACKUP_RETENTION_DAYS" -lt 1 ]]; then
        die "BACKUP_RETENTION_DAYS must be a positive integer" "$EXIT_ERROR_INVALID_ARGS"
    fi
    
    log "DEBUG" "Configuration validated successfully"
}

# Format bytes to human-readable size
format_size() {
    local size="$1"
    
    if [[ "$size" -ge 1073741824 ]]; then
        echo "$(echo "scale=2; $size / 1073741824" | bc) GB"
    elif [[ "$size" -ge 1048576 ]]; then
        echo "$(echo "scale=2; $size / 1048576" | bc) MB"
    elif [[ "$size" -ge 1024 ]]; then
        echo "$(echo "scale=2; $size / 1024" | bc) KB"
    else
        echo "${size} bytes"
    fi
}

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

# Execute MongoDB backup using mongodump
execute_backup() {
    local backup_path="$1"
    local dump_dir="${backup_path}/dump"
    
    log "INFO" "Starting MongoDB backup..."
    log "DEBUG" "Backup path: ${backup_path}"
    
    # Build mongodump command
    local mongodump_cmd=("mongodump")
    
    # Add connection URI or host
    if [[ -n "${MONGODB_URI:-}" ]]; then
        mongodump_cmd+=("--uri=${MONGODB_URI}")
    fi
    
    # Add authentication if provided
    if [[ -n "${MONGO_USERNAME:-}" ]] && [[ -n "${MONGO_PASSWORD:-}" ]]; then
        mongodump_cmd+=("--username=${MONGO_USERNAME}")
        mongodump_cmd+=("--password=${MONGO_PASSWORD}")
        mongodump_cmd+=("--authenticationDatabase=${MONGO_AUTH_DB}")
    fi
    
    # Add specific database if provided
    if [[ -n "${MONGO_DATABASE:-}" ]]; then
        mongodump_cmd+=("--db=${MONGO_DATABASE}")
        log "INFO" "Backing up database: ${MONGO_DATABASE}"
    else
        log "INFO" "Backing up all databases"
    fi
    
    # Add output directory
    mongodump_cmd+=("--out=${dump_dir}")
    
    # Add gzip compression flag
    mongodump_cmd+=("--gzip")
    
    # Show command in dry run mode
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute: ${mongodump_cmd[*]}"
        # Create empty dump directory for dry run
        mkdir -p "$dump_dir"
        return 0
    fi
    
    # Create backup directory
    mkdir -p "$backup_path" || die "Failed to create backup directory: ${backup_path}"
    
    # Execute mongodump
    log "DEBUG" "Executing: mongodump --out=${dump_dir} --gzip [credentials hidden]"
    
    if "${mongodump_cmd[@]}" >> "$LOG_FILE" 2>&1; then
        log "INFO" "MongoDB dump completed successfully"
    else
        local exit_code=$?
        log "ERROR" "mongodump failed with exit code: ${exit_code}"
        log "ERROR" "Check log file for details: ${LOG_FILE}"
        return "$EXIT_ERROR_BACKUP_FAILED"
    fi
    
    # Verify dump directory exists and has content
    if [[ ! -d "$dump_dir" ]] || [[ -z "$(ls -A "$dump_dir" 2>/dev/null)" ]]; then
        log "ERROR" "Backup dump directory is empty or does not exist"
        return "$EXIT_ERROR_BACKUP_FAILED"
    fi
    
    return 0
}

# Create compressed tar archive of backup
create_archive() {
    local backup_path="$1"
    local archive_name="$2"
    local archive_path="${BACKUP_DIR}/${DATE_DIR}/${archive_name}"
    
    log "INFO" "Creating compressed archive..."
    log "DEBUG" "Archive path: ${archive_path}"
    
    # Ensure dated subdirectory exists
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would create archive: ${archive_path}"
        echo "$archive_path"
        return 0
    fi
    
    mkdir -p "$(dirname "$archive_path")" || die "Failed to create archive directory"
    
    # Create tar.gz archive
    if tar -czf "$archive_path" -C "$(dirname "$backup_path")" "$(basename "$backup_path")" 2>> "$LOG_FILE"; then
        log "INFO" "Archive created successfully"
    else
        local exit_code=$?
        log "ERROR" "Failed to create archive, exit code: ${exit_code}"
        return "$EXIT_ERROR_COMPRESSION_FAILED"
    fi
    
    # Verify archive was created
    if [[ ! -f "$archive_path" ]]; then
        log "ERROR" "Archive file not found after creation"
        return "$EXIT_ERROR_COMPRESSION_FAILED"
    fi
    
    # Get archive size
    local archive_size
    archive_size=$(stat -f%z "$archive_path" 2>/dev/null || stat -c%s "$archive_path" 2>/dev/null || echo "0")
    local formatted_size
    formatted_size=$(format_size "$archive_size")
    
    log "INFO" "Archive size: ${formatted_size}"
    
    # Cleanup temporary dump directory
    log "DEBUG" "Cleaning up temporary dump directory"
    rm -rf "$backup_path"
    
    echo "$archive_path"
    return 0
}

# Upload backup to S3
upload_to_s3() {
    local archive_path="$1"
    local archive_name
    archive_name=$(basename "$archive_path")
    
    log "INFO" "Uploading backup to S3..."
    log "DEBUG" "Source: ${archive_path}"
    log "DEBUG" "Destination: s3://${S3_BUCKET}/${S3_PREFIX}${archive_name}"
    
    # Build AWS CLI command
    local aws_cmd=("aws" "s3" "cp" "$archive_path" "s3://${S3_BUCKET}/${S3_PREFIX}${archive_name}")
    
    # Add custom endpoint if specified (for MinIO compatibility)
    if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
        aws_cmd+=("--endpoint-url=${S3_ENDPOINT_URL}")
        log "DEBUG" "Using custom S3 endpoint: ${S3_ENDPOINT_URL}"
    fi
    
    # Add region if specified
    if [[ -n "${AWS_REGION:-}" ]]; then
        aws_cmd+=("--region=${AWS_REGION}")
    fi
    
    # Show command in dry run mode
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute: ${aws_cmd[*]}"
        return 0
    fi
    
    # Execute upload
    log "DEBUG" "Executing S3 upload..."
    
    if "${aws_cmd[@]}" >> "$LOG_FILE" 2>&1; then
        log "INFO" "S3 upload completed successfully"
        log "INFO" "S3 location: s3://${S3_BUCKET}/${S3_PREFIX}${archive_name}"
    else
        local exit_code=$?
        log "ERROR" "S3 upload failed with exit code: ${exit_code}"
        log "ERROR" "Check log file for details: ${LOG_FILE}"
        return "$EXIT_ERROR_S3_UPLOAD_FAILED"
    fi
    
    return 0
}

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would search for old backups in: ${BACKUP_DIR}"
        local old_backups
        old_backups=$(find "$BACKUP_DIR" -name "metastamp_backup_*.tar.gz" -type f -mtime +"$BACKUP_RETENTION_DAYS" 2>/dev/null || true)
        
        if [[ -n "$old_backups" ]]; then
            log "INFO" "[DRY RUN] Would remove the following backups:"
            while IFS= read -r backup; do
                log "INFO" "[DRY RUN]   - ${backup}"
            done <<< "$old_backups"
        else
            log "INFO" "[DRY RUN] No backups older than ${BACKUP_RETENTION_DAYS} days found"
        fi
        return 0
    fi
    
    # Find and remove old backups
    local removed_count=0
    local removed_size=0
    
    while IFS= read -r -d '' backup; do
        local file_size
        file_size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null || echo "0")
        removed_size=$((removed_size + file_size))
        
        log "DEBUG" "Removing old backup: ${backup}"
        rm -f "$backup"
        ((removed_count++))
    done < <(find "$BACKUP_DIR" -name "metastamp_backup_*.tar.gz" -type f -mtime +"$BACKUP_RETENTION_DAYS" -print0 2>/dev/null)
    
    # Also remove empty dated directories
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    if [[ $removed_count -gt 0 ]]; then
        local formatted_size
        formatted_size=$(format_size "$removed_size")
        log "INFO" "Removed ${removed_count} old backup(s), freed ${formatted_size}"
    else
        log "INFO" "No backups older than ${BACKUP_RETENTION_DAYS} days found"
    fi
    
    return 0
}

# Display backup summary
display_summary() {
    local archive_path="$1"
    local s3_uploaded="${2:-false}"
    local start_time="$3"
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log "INFO" "=========================================="
    log "INFO" "         BACKUP SUMMARY"
    log "INFO" "=========================================="
    log "INFO" "Timestamp:        ${TIMESTAMP}"
    log "INFO" "Duration:         ${duration} seconds"
    
    if [[ "${DRY_RUN:-false}" != "true" ]] && [[ -f "$archive_path" ]]; then
        local archive_size
        archive_size=$(stat -f%z "$archive_path" 2>/dev/null || stat -c%s "$archive_path" 2>/dev/null || echo "0")
        local formatted_size
        formatted_size=$(format_size "$archive_size")
        log "INFO" "Archive Size:     ${formatted_size}"
    fi
    
    log "INFO" "Local Path:       ${archive_path}"
    
    if [[ "$s3_uploaded" == "true" ]]; then
        log "INFO" "S3 Location:      s3://${S3_BUCKET}/${S3_PREFIX}$(basename "$archive_path")"
    else
        log "INFO" "S3 Upload:        Disabled"
    fi
    
    log "INFO" "Retention:        ${BACKUP_RETENTION_DAYS} days"
    log "INFO" "Log File:         ${LOG_FILE}"
    log "INFO" "=========================================="
    
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        log "WARN" "This was a DRY RUN - no actual backup was performed"
    else
        log "INFO" "Backup completed successfully!"
    fi
    echo ""
}

# =============================================================================
# MAIN SCRIPT EXECUTION
# =============================================================================

main() {
    local start_time
    start_time=$(date +%s)
    
    # Parse command line arguments
    local enable_s3=false
    local quiet_mode=false
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                show_help
                exit "$EXIT_SUCCESS"
                ;;
            -s|--s3)
                enable_s3=true
                shift
                ;;
            -r|--retention)
                if [[ -z "${2:-}" ]]; then
                    die "Option --retention requires an argument" "$EXIT_ERROR_INVALID_ARGS"
                fi
                BACKUP_RETENTION_DAYS="$2"
                shift 2
                ;;
            -d|--dir)
                if [[ -z "${2:-}" ]]; then
                    die "Option --dir requires an argument" "$EXIT_ERROR_INVALID_ARGS"
                fi
                BACKUP_DIR="$2"
                shift 2
                ;;
            -b|--database)
                if [[ -z "${2:-}" ]]; then
                    die "Option --database requires an argument" "$EXIT_ERROR_INVALID_ARGS"
                fi
                MONGO_DATABASE="$2"
                shift 2
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -q|--quiet)
                quiet_mode=true
                shift
                ;;
            *)
                die "Unknown option: $1. Use --help for usage information." "$EXIT_ERROR_INVALID_ARGS"
                ;;
        esac
    done
    
    # Initialize log file
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "META-STAMP V3 Backup Log - $(date)" > "$LOG_FILE"
    
    # Print banner
    if [[ "$quiet_mode" != "true" ]]; then
        echo ""
        echo "============================================"
        echo "   META-STAMP V3 - MongoDB Backup Script"
        echo "============================================"
        echo ""
    fi
    
    # Load environment
    load_env_file
    
    # Set configuration from environment or defaults
    MONGODB_URI="${MONGODB_URI:-$DEFAULT_MONGODB_URI}"
    MONGO_AUTH_DB="${MONGO_AUTH_DB:-$DEFAULT_MONGO_AUTH_DB}"
    BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
    BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-$DEFAULT_BACKUP_RETENTION_DAYS}"
    S3_PREFIX="${S3_PREFIX:-$DEFAULT_S3_PREFIX}"
    AWS_REGION="${AWS_REGION:-$DEFAULT_AWS_REGION}"
    
    # Override S3 upload if flag was passed
    if [[ "$enable_s3" == "true" ]]; then
        S3_UPLOAD_ENABLED="true"
    fi
    S3_UPLOAD_ENABLED="${S3_UPLOAD_ENABLED:-false}"
    
    # Convert to lowercase for comparison
    S3_UPLOAD_ENABLED=$(echo "$S3_UPLOAD_ENABLED" | tr '[:upper:]' '[:lower:]')
    
    # Log configuration
    log "INFO" "Configuration:"
    log "DEBUG" "  MongoDB URI: ${MONGODB_URI%@*}@[hidden]"
    log "DEBUG" "  Backup Directory: ${BACKUP_DIR}"
    log "DEBUG" "  Retention Days: ${BACKUP_RETENTION_DAYS}"
    log "DEBUG" "  S3 Upload: ${S3_UPLOAD_ENABLED}"
    if [[ "$S3_UPLOAD_ENABLED" == "true" ]]; then
        log "DEBUG" "  S3 Bucket: ${S3_BUCKET:-[not set]}"
        log "DEBUG" "  S3 Prefix: ${S3_PREFIX}"
    fi
    log "DEBUG" "  Dry Run: ${DRY_RUN:-false}"
    
    # Check dependencies
    check_dependencies
    
    # Validate configuration
    validate_config
    
    # Define backup naming
    local backup_name="metastamp_backup_${TIMESTAMP}"
    local temp_backup_path="${BACKUP_DIR}/temp_${backup_name}"
    local archive_name="${backup_name}.tar.gz"
    
    # Execute MongoDB backup
    log "INFO" "Starting backup process..."
    if ! execute_backup "$temp_backup_path"; then
        die "MongoDB backup failed" "$EXIT_ERROR_BACKUP_FAILED"
    fi
    
    # Create compressed archive
    local archive_path
    # Check exit code directly (shellcheck SC2181)
    if ! archive_path=$(create_archive "$temp_backup_path" "$archive_name") || [[ -z "$archive_path" ]]; then
        die "Archive creation failed" "$EXIT_ERROR_COMPRESSION_FAILED"
    fi
    
    # Upload to S3 if enabled
    local s3_uploaded=false
    if [[ "$S3_UPLOAD_ENABLED" == "true" ]]; then
        if upload_to_s3 "$archive_path"; then
            s3_uploaded=true
        else
            log "WARN" "S3 upload failed, but local backup is available"
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Display summary
    display_summary "$archive_path" "$s3_uploaded" "$start_time"
    
    # Exit successfully
    exit "$EXIT_SUCCESS"
}

# Execute main function
main "$@"
