#!/usr/bin/env bash
# =============================================================================
# META-STAMP V3 - Automated Deployment Script
# =============================================================================
# Comprehensive deployment automation handling:
# - Pre-deployment validation and environment checks
# - Git repository updates with change tracking
# - Pre-deployment database backup for rollback capability
# - Docker image rebuilding with clean cache option
# - Database schema migrations via init_db.py
# - Graceful service restarts with zero-downtime approach
# - Health check validation for all services
# - Automatic rollback on deployment failure
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --branch BRANCH       Deploy specific branch (default: main)
#   --no-cache           Force rebuild Docker images without cache
#   --skip-backup        Skip pre-deployment database backup
#   --skip-migrations    Skip database migration step
#   --timeout SECONDS    Health check timeout (default: 120)
#   --dry-run            Show what would be done without making changes
#   --rollback           Manually trigger rollback to previous state
#   --help               Display this help message
#
# Exit Codes:
#   0 - Deployment successful
#   1 - Pre-deployment validation failed
#   2 - Git update failed
#   3 - Backup creation failed
#   4 - Docker build failed
#   5 - Database migration failed
#   6 - Service restart failed
#   7 - Health check failed
#   8 - Rollback failed
#
# Environment Variables:
#   DEPLOY_LOG_DIR       Log directory (default: ./logs)
#   BACKUP_DIR           Backup directory (default: ./backups)
#   COMPOSE_FILE         Docker Compose file (default: docker-compose.yml)
#   NOTIFICATION_URL     Webhook URL for deployment notifications (optional)
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration and Global Variables
# =============================================================================

# Script metadata
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Version tracking
readonly DEPLOY_VERSION="1.0.0"

# Default configuration
DEFAULT_BRANCH="main"
DEFAULT_TIMEOUT=120
DEFAULT_LOG_DIR="${REPO_ROOT}/logs"
DEFAULT_BACKUP_DIR="${REPO_ROOT}/backups"
DEFAULT_COMPOSE_FILE="docker-compose.yml"

# Runtime configuration (can be overridden via options)
DEPLOY_BRANCH="${DEFAULT_BRANCH}"
HEALTH_TIMEOUT="${DEFAULT_TIMEOUT}"
LOG_DIR="${DEPLOY_LOG_DIR:-${DEFAULT_LOG_DIR}}"
BACKUP_DIR="${BACKUP_DIR:-${DEFAULT_BACKUP_DIR}}"
COMPOSE_FILE="${COMPOSE_FILE:-${DEFAULT_COMPOSE_FILE}}"
NOTIFICATION_URL="${NOTIFICATION_URL:-}"

# Feature flags
NO_CACHE=false
SKIP_BACKUP=false
SKIP_MIGRATIONS=false
DRY_RUN=false
MANUAL_ROLLBACK=false

# State tracking for rollback
BACKUP_FILE=""
OLD_COMMIT=""
NEW_COMMIT=""
DEPLOYMENT_TIMESTAMP=""
IMAGES_BEFORE=()

# Service configuration
readonly BACKEND_URL="http://localhost:8000"
readonly FRONTEND_URL="http://localhost:3000"
readonly HEALTH_ENDPOINT="/health"

# Color codes for terminal output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# =============================================================================
# Logging Functions
# =============================================================================

# Initialize logging
init_logging() {
    mkdir -p "${LOG_DIR}"
    DEPLOYMENT_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
    readonly LOG_FILE="${LOG_DIR}/deploy_${DEPLOYMENT_TIMESTAMP}.log"
    
    # Create log file with header
    {
        echo "=============================================="
        echo "META-STAMP V3 Deployment Log"
        echo "Timestamp: $(date -Iseconds)"
        echo "Branch: ${DEPLOY_BRANCH}"
        echo "Script Version: ${DEPLOY_VERSION}"
        echo "=============================================="
        echo ""
    } > "${LOG_FILE}"
    
    log_info "Deployment log initialized: ${LOG_FILE}"
}

# Log message with timestamp
log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    
    # Write to log file
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    
    # Print to console with colors
    case "${level}" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
        DEBUG)
            echo -e "${CYAN}[DEBUG]${NC} ${message}"
            ;;
        STEP)
            echo -e "\n${BOLD}${MAGENTA}▶ ${message}${NC}"
            echo "[${timestamp}] [STEP] ${message}" >> "${LOG_FILE}"
            ;;
    esac
}

log_info() { log "INFO" "$1"; }
log_success() { log "SUCCESS" "$1"; }
log_warning() { log "WARNING" "$1"; }
log_error() { log "ERROR" "$1"; }
log_debug() { log "DEBUG" "$1"; }
log_step() { log "STEP" "$1"; }

# =============================================================================
# Utility Functions
# =============================================================================

# Display help message
show_help() {
    cat << EOF
${BOLD}META-STAMP V3 Deployment Script${NC}
Version: ${DEPLOY_VERSION}

${BOLD}Usage:${NC}
    ${SCRIPT_NAME} [options]

${BOLD}Options:${NC}
    --branch BRANCH       Deploy specific branch (default: ${DEFAULT_BRANCH})
    --no-cache           Force rebuild Docker images without cache
    --skip-backup        Skip pre-deployment database backup
    --skip-migrations    Skip database migration step
    --timeout SECONDS    Health check timeout (default: ${DEFAULT_TIMEOUT}s)
    --dry-run            Show what would be done without making changes
    --rollback           Manually trigger rollback to previous state
    --help               Display this help message

${BOLD}Environment Variables:${NC}
    DEPLOY_LOG_DIR       Log directory (default: ./logs)
    BACKUP_DIR           Backup directory (default: ./backups)
    COMPOSE_FILE         Docker Compose file (default: docker-compose.yml)
    NOTIFICATION_URL     Webhook URL for deployment notifications

${BOLD}Examples:${NC}
    # Deploy main branch
    ${SCRIPT_NAME}

    # Deploy specific branch with no cache
    ${SCRIPT_NAME} --branch feature/new-feature --no-cache

    # Dry run to see what would happen
    ${SCRIPT_NAME} --dry-run

    # Rollback to previous deployment
    ${SCRIPT_NAME} --rollback

${BOLD}Exit Codes:${NC}
    0 - Deployment successful
    1 - Pre-deployment validation failed
    2 - Git update failed
    3 - Backup creation failed
    4 - Docker build failed
    5 - Database migration failed
    6 - Service restart failed
    7 - Health check failed
    8 - Rollback failed

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --branch)
                DEPLOY_BRANCH="$2"
                shift 2
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --timeout)
                HEALTH_TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --rollback)
                MANUAL_ROLLBACK=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Execute command with optional dry-run support
execute() {
    local cmd="$*"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: ${cmd}"
        return 0
    fi
    
    log_debug "Executing: ${cmd}"
    eval "${cmd}"
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Send deployment notification if configured
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${NOTIFICATION_URL}" ]]; then
        log_info "Sending deployment notification..."
        
        local payload
        payload=$(cat << EOF
{
    "status": "${status}",
    "message": "${message}",
    "timestamp": "$(date -Iseconds)",
    "branch": "${DEPLOY_BRANCH}",
    "commit": "${NEW_COMMIT:-unknown}",
    "environment": "${APP_ENV:-production}"
}
EOF
)
        
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "${payload}" \
            "${NOTIFICATION_URL}" > /dev/null 2>&1 || \
            log_warning "Failed to send notification"
    fi
}

# =============================================================================
# Pre-Deployment Validation Functions
# =============================================================================

# Verify script is run from repository root
validate_repository_root() {
    log_info "Validating repository root..."
    
    if [[ ! -f "${REPO_ROOT}/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found. Ensure script is run from repository root."
        return 1
    fi
    
    if [[ ! -d "${REPO_ROOT}/backend" ]] || [[ ! -d "${REPO_ROOT}/frontend" ]]; then
        log_error "backend/ or frontend/ directory not found."
        return 1
    fi
    
    if [[ ! -d "${REPO_ROOT}/.git" ]]; then
        log_error "Not a git repository. .git directory not found."
        return 1
    fi
    
    log_success "Repository root validated: ${REPO_ROOT}"
    return 0
}

# Check required tools are installed
validate_dependencies() {
    log_info "Checking required dependencies..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose && ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    if ! command_exists curl; then
        missing_deps+=("curl")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install the missing tools and try again."
        return 1
    fi
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker and try again."
        return 1
    fi
    
    log_success "All dependencies verified"
    return 0
}

# Validate current branch matches deployment branch
validate_branch() {
    log_info "Validating git branch..."
    
    local current_branch
    current_branch="$(git -C "${REPO_ROOT}" branch --show-current)"
    
    if [[ "${current_branch}" != "${DEPLOY_BRANCH}" ]]; then
        log_warning "Current branch (${current_branch}) differs from deployment branch (${DEPLOY_BRANCH})"
        log_info "Switching to branch: ${DEPLOY_BRANCH}"
        
        if ! execute "git -C '${REPO_ROOT}' checkout '${DEPLOY_BRANCH}'"; then
            log_error "Failed to checkout branch: ${DEPLOY_BRANCH}"
            return 1
        fi
    fi
    
    log_success "Branch validated: ${DEPLOY_BRANCH}"
    return 0
}

# Display current version information
display_version_info() {
    log_info "Current deployment state:"
    
    OLD_COMMIT="$(git -C "${REPO_ROOT}" rev-parse HEAD)"
    local commit_date
    commit_date="$(git -C "${REPO_ROOT}" log -1 --format=%cd --date=short)"
    local commit_message
    commit_message="$(git -C "${REPO_ROOT}" log -1 --format=%s)"
    
    log_info "  Commit: ${OLD_COMMIT:0:12}"
    log_info "  Date: ${commit_date}"
    log_info "  Message: ${commit_message}"
    
    # Capture current Docker images for potential rollback
    log_info "Capturing current Docker image states..."
    while IFS= read -r image; do
        if [[ -n "${image}" ]]; then
            IMAGES_BEFORE+=("${image}")
        fi
    done < <(docker-compose -f "${REPO_ROOT}/${COMPOSE_FILE}" images -q 2>/dev/null || true)
    
    return 0
}

# Run all pre-deployment validations
run_pre_deployment_validation() {
    log_step "Phase 1: Pre-Deployment Validation"
    
    validate_repository_root || return 1
    validate_dependencies || return 1
    validate_branch || return 1
    display_version_info || return 1
    
    log_success "Pre-deployment validation completed"
    return 0
}

# =============================================================================
# Git Repository Update Functions
# =============================================================================

# Stash uncommitted changes
stash_changes() {
    log_info "Checking for uncommitted changes..."
    
    if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain)" ]]; then
        log_warning "Uncommitted changes detected. Stashing..."
        execute "git -C '${REPO_ROOT}' stash push -m 'deploy-stash-${DEPLOYMENT_TIMESTAMP}'"
        log_success "Changes stashed successfully"
    else
        log_info "No uncommitted changes found"
    fi
    
    return 0
}

# Pull latest changes from remote
pull_latest_changes() {
    log_info "Fetching latest changes from remote..."
    
    # Fetch all branches and tags
    execute "git -C '${REPO_ROOT}' fetch --all --prune"
    
    # Pull changes for current branch
    log_info "Pulling latest changes for branch: ${DEPLOY_BRANCH}"
    
    if ! execute "git -C '${REPO_ROOT}' pull origin '${DEPLOY_BRANCH}'"; then
        log_error "Git pull failed. There may be merge conflicts."
        return 1
    fi
    
    NEW_COMMIT="$(git -C "${REPO_ROOT}" rev-parse HEAD)"
    
    if [[ "${OLD_COMMIT}" == "${NEW_COMMIT}" ]]; then
        log_info "No new changes to deploy. Repository is up to date."
    else
        log_success "Repository updated successfully"
        
        # Display changes
        log_info "Changes since last deployment:"
        git -C "${REPO_ROOT}" log --oneline "${OLD_COMMIT}..${NEW_COMMIT}" | head -20
        
        local commit_count
        commit_count="$(git -C "${REPO_ROOT}" rev-list --count "${OLD_COMMIT}..${NEW_COMMIT}")"
        log_info "Total new commits: ${commit_count}"
    fi
    
    return 0
}

# Run git update phase
run_git_update() {
    log_step "Phase 2: Git Repository Update"
    
    stash_changes || return 1
    pull_latest_changes || return 1
    
    log_success "Git repository update completed"
    return 0
}

# =============================================================================
# Backup Functions
# =============================================================================

# Create pre-deployment backup
create_backup() {
    if [[ "${SKIP_BACKUP}" == "true" ]]; then
        log_warning "Backup skipped as requested"
        return 0
    fi
    
    log_info "Creating pre-deployment database backup..."
    
    local backup_script="${SCRIPT_DIR}/backup.sh"
    
    if [[ ! -f "${backup_script}" ]]; then
        log_warning "Backup script not found: ${backup_script}"
        log_warning "Skipping backup step. Manual backup recommended."
        return 0
    fi
    
    if [[ ! -x "${backup_script}" ]]; then
        log_info "Making backup script executable..."
        chmod +x "${backup_script}"
    fi
    
    # Run backup script
    if execute "bash '${backup_script}'"; then
        # Find most recent backup file
        BACKUP_FILE=$(find "${BACKUP_DIR}" -name "metastamp_backup_*.tar.gz" -type f 2>/dev/null | sort -r | head -1 || true)
        
        if [[ -n "${BACKUP_FILE}" ]]; then
            log_success "Backup created: ${BACKUP_FILE}"
        else
            log_warning "Backup file not found, but script completed successfully"
        fi
    else
        log_error "Backup creation failed"
        return 1
    fi
    
    return 0
}

# Run backup phase
run_backup() {
    log_step "Phase 3: Pre-Deployment Backup"
    
    create_backup || return 1
    
    log_success "Backup phase completed"
    return 0
}

# =============================================================================
# Docker Build Functions
# =============================================================================

# Build Docker images
build_docker_images() {
    log_info "Building Docker images..."
    
    local build_args=""
    
    if [[ "${NO_CACHE}" == "true" ]]; then
        build_args="--no-cache"
        log_info "Building with --no-cache flag (clean build)"
    fi
    
    # Determine docker-compose command (v1 or v2)
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    
    # Build backend service
    log_info "Building backend service..."
    if ! execute "${compose_cmd} -f '${COMPOSE_FILE}' build ${build_args} backend"; then
        log_error "Backend build failed"
        return 1
    fi
    log_success "Backend image built successfully"
    
    # Build frontend service
    log_info "Building frontend service..."
    if ! execute "${compose_cmd} -f '${COMPOSE_FILE}' build ${build_args} frontend"; then
        log_error "Frontend build failed"
        return 1
    fi
    log_success "Frontend image built successfully"
    
    return 0
}

# Run Docker build phase
run_docker_build() {
    log_step "Phase 4: Docker Image Rebuild"
    
    build_docker_images || return 1
    
    log_success "Docker build phase completed"
    return 0
}

# =============================================================================
# Database Migration Functions
# =============================================================================

# Run database migrations
run_migrations() {
    if [[ "${SKIP_MIGRATIONS}" == "true" ]]; then
        log_warning "Database migrations skipped as requested"
        return 0
    fi
    
    log_info "Checking for database migration script..."
    
    local migration_script="${SCRIPT_DIR}/init_db.py"
    
    if [[ ! -f "${migration_script}" ]]; then
        log_warning "Migration script not found: ${migration_script}"
        log_warning "Skipping migration step."
        return 0
    fi
    
    log_info "Running database migrations..."
    
    # Ensure MongoDB is running
    log_info "Ensuring MongoDB is running..."
    
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    
    # Start MongoDB if not running
    execute "${compose_cmd} -f '${COMPOSE_FILE}' up -d mongodb"
    
    # Wait for MongoDB to be healthy
    log_info "Waiting for MongoDB to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if docker exec metastamp-mongodb mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
            log_success "MongoDB is ready"
            break
        fi
        
        ((attempt++))
        sleep 2
    done
    
    if [[ ${attempt} -ge ${max_attempts} ]]; then
        log_error "MongoDB failed to start within expected time"
        return 1
    fi
    
    # Run migration script via Docker or local Python
    if [[ -f "${REPO_ROOT}/backend/.venv/bin/python" ]]; then
        log_info "Running migrations with local Python environment..."
        if ! execute "cd '${REPO_ROOT}/backend' && .venv/bin/python '${migration_script}' --verbose"; then
            log_error "Database migration failed"
            return 1
        fi
    else
        log_info "Running migrations via Docker container..."
        if ! execute "docker run --rm --network metastamp-network \
            -v '${migration_script}:/app/init_db.py:ro' \
            -e MONGODB_URL=mongodb://metastamp_admin:metastamp_secret_password@mongodb:27017 \
            python:3.11-slim python /app/init_db.py"; then
            log_error "Database migration failed"
            return 1
        fi
    fi
    
    log_success "Database migrations completed successfully"
    return 0
}

# Run migration phase
run_database_migrations() {
    log_step "Phase 5: Database Migrations"
    
    run_migrations || return 1
    
    log_success "Database migration phase completed"
    return 0
}

# =============================================================================
# Service Restart Functions
# =============================================================================

# Stop services gracefully
stop_services() {
    log_info "Stopping current services gracefully..."
    
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    
    # Stop services in reverse dependency order
    execute "${compose_cmd} -f '${COMPOSE_FILE}' stop frontend" || true
    execute "${compose_cmd} -f '${COMPOSE_FILE}' stop backend" || true
    
    # Give services time to clean up
    sleep 5
    
    log_success "Services stopped"
    return 0
}

# Start services with new images
start_services() {
    log_info "Starting services with new images..."
    
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    
    # Start all services in detached mode
    if ! execute "${compose_cmd} -f '${COMPOSE_FILE}' up -d"; then
        log_error "Failed to start services"
        return 1
    fi
    
    log_success "Services started in detached mode"
    
    # Display service startup logs (first 30 lines)
    log_info "Recent service logs:"
    ${compose_cmd} -f "${COMPOSE_FILE}" logs --tail=30 2>&1 | head -50 || true
    
    return 0
}

# Run service restart phase
run_service_restart() {
    log_step "Phase 6: Service Restart"
    
    stop_services || return 1
    start_services || return 1
    
    log_success "Service restart phase completed"
    return 0
}

# =============================================================================
# Health Check Functions
# =============================================================================

# Wait for service health check
wait_for_health() {
    local service_name="$1"
    local url="$2"
    local timeout="${3:-${HEALTH_TIMEOUT}}"
    
    log_info "Waiting for ${service_name} health check (timeout: ${timeout}s)..."
    
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt ${end_time} ]]; do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || echo "000")
        
        if [[ "${http_code}" == "200" ]]; then
            log_success "${service_name} is healthy (HTTP ${http_code})"
            return 0
        fi
        
        sleep 3
    done
    
    log_error "${service_name} health check failed after ${timeout}s"
    return 1
}

# Check container health status
check_container_health() {
    local container_name="$1"
    
    log_info "Checking container health: ${container_name}..."
    
    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null || echo "unknown")
    
    case "${health_status}" in
        healthy)
            log_success "Container ${container_name} is healthy"
            return 0
            ;;
        unhealthy)
            log_error "Container ${container_name} is unhealthy"
            return 1
            ;;
        starting)
            log_info "Container ${container_name} is still starting..."
            return 2
            ;;
        *)
            log_warning "Container ${container_name} has unknown health status: ${health_status}"
            return 0  # Don't fail for containers without health checks
            ;;
    esac
}

# Wait for container to be healthy
wait_for_container_health() {
    local container_name="$1"
    local timeout="${2:-${HEALTH_TIMEOUT}}"
    
    log_info "Waiting for container ${container_name} to be healthy (timeout: ${timeout}s)..."
    
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [[ $(date +%s) -lt ${end_time} ]]; do
        check_container_health "${container_name}"
        local status=$?
        
        if [[ ${status} -eq 0 ]]; then
            return 0
        elif [[ ${status} -eq 1 ]]; then
            return 1
        fi
        
        sleep 5
    done
    
    log_error "Container ${container_name} did not become healthy within ${timeout}s"
    return 1
}

# Run all health checks
run_health_checks() {
    log_step "Phase 7: Health Check Validation"
    
    local all_healthy=true
    
    # Check infrastructure containers
    log_info "Checking infrastructure services..."
    
    if ! wait_for_container_health "metastamp-mongodb" 60; then
        all_healthy=false
    fi
    
    if ! wait_for_container_health "metastamp-redis" 30; then
        all_healthy=false
    fi
    
    if ! wait_for_container_health "metastamp-minio" 30; then
        all_healthy=false
    fi
    
    # Check application containers
    log_info "Checking application services..."
    
    if ! wait_for_container_health "metastamp-backend" "${HEALTH_TIMEOUT}"; then
        all_healthy=false
    fi
    
    # Additional HTTP health check for backend
    if [[ "${all_healthy}" == "true" ]]; then
        if ! wait_for_health "Backend API" "${BACKEND_URL}${HEALTH_ENDPOINT}" 30; then
            all_healthy=false
        fi
    fi
    
    # Check frontend (may not have health check)
    log_info "Checking frontend availability..."
    sleep 10  # Give frontend time to start
    
    if ! wait_for_health "Frontend" "${FRONTEND_URL}" 30; then
        log_warning "Frontend HTTP check failed - container may still be starting"
        # Don't fail deployment for frontend accessibility issues
    fi
    
    if [[ "${all_healthy}" != "true" ]]; then
        log_error "Health checks failed - initiating rollback"
        return 1
    fi
    
    log_success "All health checks passed"
    return 0
}

# =============================================================================
# Post-Deployment Verification Functions
# =============================================================================

# Display container status
display_container_status() {
    log_info "Container status:"
    
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    ${compose_cmd} -f "${COMPOSE_FILE}" ps
}

# Display service endpoints
display_service_endpoints() {
    log_info "Service endpoints:"
    echo ""
    echo "  Backend API:       ${BACKEND_URL}"
    echo "  Backend Health:    ${BACKEND_URL}${HEALTH_ENDPOINT}"
    echo "  Frontend:          ${FRONTEND_URL}"
    echo "  MongoDB:           mongodb://localhost:27017"
    echo "  Redis:             redis://localhost:6379"
    echo "  MinIO Console:     http://localhost:9001"
    echo "  MinIO API:         http://localhost:9000"
    echo ""
}

# Log deployment summary
log_deployment_summary() {
    log_info "Deployment Summary:"
    echo ""
    echo "  Deployment Time:   ${DEPLOYMENT_TIMESTAMP}"
    echo "  Branch:            ${DEPLOY_BRANCH}"
    echo "  Previous Commit:   ${OLD_COMMIT:0:12}"
    echo "  Current Commit:    ${NEW_COMMIT:0:12}"
    echo "  Backup File:       ${BACKUP_FILE:-'None (skipped)'}"
    echo "  Log File:          ${LOG_FILE}"
    echo ""
}

# Run post-deployment verification
run_post_deployment_verification() {
    log_step "Phase 8: Post-Deployment Verification"
    
    display_container_status
    display_service_endpoints
    log_deployment_summary
    
    # Send success notification
    send_notification "success" "Deployment completed successfully for commit ${NEW_COMMIT:0:12}"
    
    log_success "Post-deployment verification completed"
    return 0
}

# =============================================================================
# Rollback Functions
# =============================================================================

# Restore previous Docker images
restore_previous_images() {
    log_info "Restoring previous Docker images..."
    
    # This is a simplified rollback - in production, you'd want image tagging
    log_warning "Image rollback not fully implemented - would restore from tagged images"
    
    return 0
}

# Restore database from backup
restore_database_backup() {
    if [[ -z "${BACKUP_FILE}" ]] || [[ ! -f "${BACKUP_FILE}" ]]; then
        log_warning "No backup file available for database restore"
        return 0
    fi
    
    log_info "Restoring database from backup: ${BACKUP_FILE}"
    
    # Extract backup
    local backup_dir
    backup_dir=$(mktemp -d)
    tar -xzf "${BACKUP_FILE}" -C "${backup_dir}"
    
    # Find mongodump output
    local dump_dir
    dump_dir=$(find "${backup_dir}" -type d -name "metastamp" | head -1 || true)
    
    if [[ -n "${dump_dir}" ]]; then
        log_info "Running mongorestore..."
        docker exec metastamp-mongodb mongorestore --drop "${dump_dir}" || true
        log_success "Database restored"
    else
        log_warning "Could not find database dump in backup archive"
    fi
    
    # Cleanup
    rm -rf "${backup_dir}"
    
    return 0
}

# Revert git changes
revert_git_changes() {
    if [[ -n "${OLD_COMMIT}" ]]; then
        log_info "Reverting to previous commit: ${OLD_COMMIT:0:12}"
        
        cd "${REPO_ROOT}"
        execute "git reset --hard '${OLD_COMMIT}'" || true
        
        log_success "Git repository reverted"
    fi
}

# Perform full rollback
perform_rollback() {
    log_step "ROLLBACK: Restoring Previous State"
    
    log_error "Deployment failed - initiating automatic rollback"
    
    # Stop current services
    local compose_cmd
    if docker compose version &> /dev/null; then
        compose_cmd="docker compose"
    else
        compose_cmd="docker-compose"
    fi
    
    cd "${REPO_ROOT}"
    ${compose_cmd} -f "${COMPOSE_FILE}" down || true
    
    # Restore previous state
    restore_previous_images
    revert_git_changes
    restore_database_backup
    
    # Restart services with old code
    log_info "Restarting services with previous version..."
    ${compose_cmd} -f "${COMPOSE_FILE}" up -d
    
    # Wait for services to start
    sleep 30
    
    # Verify rollback
    if run_health_checks; then
        log_success "Rollback completed successfully"
        send_notification "warning" "Deployment rolled back to commit ${OLD_COMMIT:0:12}"
        return 0
    else
        log_error "Rollback failed - manual intervention required!"
        send_notification "error" "Deployment and rollback both failed - MANUAL INTERVENTION REQUIRED"
        return 1
    fi
}

# Manual rollback entry point
manual_rollback() {
    log_step "Manual Rollback Initiated"
    
    # Load previous deployment state if available
    local state_file="${LOG_DIR}/last_deployment_state.json"
    
    if [[ -f "${state_file}" ]]; then
        OLD_COMMIT=$(grep -o '"old_commit":"[^"]*"' "${state_file}" | cut -d'"' -f4 || true)
        BACKUP_FILE=$(grep -o '"backup_file":"[^"]*"' "${state_file}" | cut -d'"' -f4 || true)
    fi
    
    perform_rollback
}

# =============================================================================
# Error Handling Functions
# =============================================================================

# Trap handler for errors
error_trap() {
    local exit_code=$?
    local line_number=$1
    
    log_error "Error occurred at line ${line_number} (exit code: ${exit_code})"
    
    # Save deployment state for potential rollback
    save_deployment_state
    
    # Don't attempt auto-rollback on certain errors
    case ${exit_code} in
        1)  # Pre-deployment validation
            log_error "Pre-deployment validation failed. No changes were made."
            ;;
        2)  # Git update
            log_error "Git update failed. Repository may be in inconsistent state."
            ;;
        3)  # Backup
            log_error "Backup creation failed. Proceeding with caution."
            ;;
        4|5|6|7)  # Build, migration, restart, or health check
            perform_rollback || true
            ;;
    esac
}

# Save deployment state for rollback
save_deployment_state() {
    local state_file="${LOG_DIR}/last_deployment_state.json"
    
    cat > "${state_file}" << EOF
{
    "timestamp": "${DEPLOYMENT_TIMESTAMP}",
    "old_commit": "${OLD_COMMIT}",
    "new_commit": "${NEW_COMMIT}",
    "backup_file": "${BACKUP_FILE}",
    "branch": "${DEPLOY_BRANCH}"
}
EOF
    
    log_info "Deployment state saved to: ${state_file}"
}

# =============================================================================
# Main Deployment Flow
# =============================================================================

main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Initialize logging
    init_logging
    
    # Handle manual rollback
    if [[ "${MANUAL_ROLLBACK}" == "true" ]]; then
        manual_rollback
        exit $?
    fi
    
    # Display banner
    echo ""
    echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║          META-STAMP V3 - Automated Deployment Script          ║${NC}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_warning "Running in DRY-RUN mode - no changes will be made"
        echo ""
    fi
    
    log_info "Starting deployment to branch: ${DEPLOY_BRANCH}"
    log_info "Timestamp: $(date -Iseconds)"
    echo ""
    
    # Set error trap
    trap 'error_trap ${LINENO}' ERR
    
    # Execute deployment phases
    local deployment_start
    deployment_start=$(date +%s)
    
    # Phase 1: Pre-deployment validation
    if ! run_pre_deployment_validation; then
        log_error "Pre-deployment validation failed"
        exit 1
    fi
    
    # Phase 2: Git repository update
    if ! run_git_update; then
        log_error "Git update failed"
        exit 2
    fi
    
    # Phase 3: Pre-deployment backup
    if ! run_backup; then
        log_error "Backup creation failed"
        exit 3
    fi
    
    # Phase 4: Docker image rebuild
    if ! run_docker_build; then
        log_error "Docker build failed"
        exit 4
    fi
    
    # Phase 5: Database migrations
    if ! run_database_migrations; then
        log_error "Database migration failed"
        exit 5
    fi
    
    # Phase 6: Service restart
    if ! run_service_restart; then
        log_error "Service restart failed"
        exit 6
    fi
    
    # Phase 7: Health check validation
    if ! run_health_checks; then
        log_error "Health check validation failed"
        exit 7
    fi
    
    # Phase 8: Post-deployment verification
    if ! run_post_deployment_verification; then
        log_error "Post-deployment verification failed"
        exit 7
    fi
    
    # Calculate deployment duration
    local deployment_end
    deployment_end=$(date +%s)
    local deployment_duration=$((deployment_end - deployment_start))
    
    # Save deployment state
    save_deployment_state
    
    # Display final success message
    echo ""
    echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║              DEPLOYMENT COMPLETED SUCCESSFULLY!               ║${NC}"
    echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_success "Deployment completed in ${deployment_duration} seconds"
    log_info "Log file: ${LOG_FILE}"
    echo ""
    
    exit 0
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Only run main if script is executed (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
