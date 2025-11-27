# META-STAMP V3 Deployment Guide

This comprehensive guide covers the deployment of META-STAMP V3 in production environments, including environment preparation, configuration, database setup, backup procedures, scaling strategies, monitoring, and security considerations.

## Table of Contents

1. [Environment Preparation](#1-environment-preparation)
2. [Production Docker Compose Configuration](#2-production-docker-compose-configuration)
3. [Environment Variable Configuration](#3-environment-variable-configuration)
4. [Database Initialization](#4-database-initialization)
5. [Backup and Recovery Procedures](#5-backup-and-recovery-procedures)
6. [Scaling Strategies](#6-scaling-strategies)
7. [Monitoring Setup](#7-monitoring-setup)
8. [Security Considerations](#8-security-considerations)
9. [Deployment Automation](#9-deployment-automation)
10. [Production Checklist](#10-production-checklist)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Environment Preparation

### 1.1 Server Requirements

#### Minimum Requirements (Development/Staging)

| Resource | Specification |
|----------|---------------|
| CPU | 4 cores (x86_64 or ARM64) |
| RAM | 8 GB |
| Storage | 50 GB SSD |
| Network | 100 Mbps |

#### Recommended Requirements (Production)

| Resource | Specification |
|----------|---------------|
| CPU | 8+ cores (x86_64 or ARM64) |
| RAM | 16+ GB |
| Storage | 200+ GB NVMe SSD |
| Network | 1 Gbps |

#### Storage Considerations

- **Application Data**: MongoDB requires approximately 2x the data size for indexes and operations
- **Object Storage**: MinIO/S3 bucket size depends on upload volume (plan for 500MB × expected assets)
- **Logs**: Allocate 20-50 GB for log retention
- **Backups**: Plan for 3x database size for backup retention

### 1.2 Operating System Recommendations

**Supported Operating Systems:**

- **Ubuntu Server 22.04 LTS** (Recommended)
- Ubuntu Server 24.04 LTS
- Debian 12 (Bookworm)
- Amazon Linux 2023
- RHEL/CentOS Stream 9

**System Preparation (Ubuntu 22.04+):**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release \
    jq

# Configure timezone
sudo timedatectl set-timezone UTC

# Configure system limits for containers
sudo tee /etc/security/limits.d/docker.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Apply sysctl optimizations for containers
sudo tee /etc/sysctl.d/99-docker.conf << EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
vm.max_map_count = 262144
EOF

sudo sysctl --system
```

### 1.3 Docker Installation

**Install Docker Engine (Ubuntu):**

```bash
# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

**Configure Docker for Production:**

```bash
# Create Docker daemon configuration
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  }
}
EOF

# Restart Docker to apply configuration
sudo systemctl restart docker
```

### 1.4 Firewall Configuration

```bash
# Install UFW (if not installed)
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if custom)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow custom application ports (if needed)
# Backend API (if exposed directly)
# sudo ufw allow 8000/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

---

## 2. Production Docker Compose Configuration

### 2.1 Production docker-compose.yml Overview

The META-STAMP V3 `docker-compose.yml` file defines five core services:

| Service | Image | Purpose | Default Port |
|---------|-------|---------|--------------|
| `mongodb` | mongo:8.0 | Document database | 27017 |
| `redis` | redis:7.4-alpine | Cache and sessions | 6379 |
| `minio` | minio/minio:latest | S3-compatible storage | 9000, 9001 |
| `backend` | Custom (Dockerfile) | FastAPI application | 8000 |
| `frontend` | Custom (Dockerfile) | React application | 3000, 80 |

### 2.2 Resource Limits Configuration

For production deployments, configure resource limits in `docker-compose.yml` or use a `docker-compose.prod.yml` override:

```yaml
# docker-compose.prod.yml - Production resource limits
version: "3.8"

services:
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  redis:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  minio:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  backend:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 1G

  frontend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### 2.3 Health Checks

All services include health checks for reliability:

| Service | Health Check Command | Interval | Timeout | Retries |
|---------|---------------------|----------|---------|---------|
| MongoDB | `mongosh --eval "db.adminCommand('ping')"` | 10s | 5s | 5 |
| Redis | `redis-cli ping` | 10s | 5s | 5 |
| MinIO | `curl -f http://localhost:9000/minio/health/live` | 10s | 5s | 5 |
| Backend | `curl -f http://localhost:8000/health` | 15s | 10s | 5 |

### 2.4 Restart Policies

Configure appropriate restart policies for production:

```yaml
services:
  mongodb:
    restart: unless-stopped  # Survives host reboots, respects manual stops
    
  redis:
    restart: unless-stopped
    
  minio:
    restart: unless-stopped
    
  backend:
    restart: unless-stopped
    
  frontend:
    restart: unless-stopped
```

For critical production environments, use `restart: always` to ensure services restart regardless of exit status.

### 2.5 Network Isolation

The `metastamp-network` bridge network provides:

- **Service DNS**: Services communicate using container names (e.g., `mongodb`, `redis`)
- **Network Isolation**: Containers are isolated from the host network except for exposed ports
- **Subnet Configuration**: `172.28.0.0/16` subnet for predictable addressing

```yaml
networks:
  metastamp-network:
    driver: bridge
    name: metastamp-network
    ipam:
      driver: default
      config:
        - subnet: 172.28.0.0/16
```

### 2.6 Volume Configurations

Persistent data volumes ensure durability:

```yaml
volumes:
  # MongoDB data persistence
  mongodb_data:
    driver: local
    name: metastamp-mongodb-data
    
  # Redis persistence (AOF and RDB)
  redis_data:
    driver: local
    name: metastamp-redis-data
    
  # MinIO object storage
  minio_data:
    driver: local
    name: metastamp-minio-data
```

**Volume Backup Location:**
```bash
# Default Docker volume location
/var/lib/docker/volumes/metastamp-mongodb-data/_data
/var/lib/docker/volumes/metastamp-redis-data/_data
/var/lib/docker/volumes/metastamp-minio-data/_data
```

### 2.7 Running Production Services

```bash
# Navigate to project root
cd /path/to/metastamp-v3

# Start all services in detached mode
docker compose up -d

# With production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend

# Check service status
docker compose ps
```

---

## 3. Environment Variable Configuration

### 3.1 Backend Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# =============================================================================
# META-STAMP V3 - Production Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Application Settings
# -----------------------------------------------------------------------------
APP_NAME=META-STAMP V3
APP_ENV=production
DEBUG=false
LOG_LEVEL=info

# -----------------------------------------------------------------------------
# MongoDB Configuration
# -----------------------------------------------------------------------------
# Connection URI for MongoDB
# Format: mongodb://username:password@host:port
MONGODB_URL=mongodb://metastamp_admin:your_secure_password_here@mongodb:27017
MONGODB_DATABASE=metastamp

# MongoDB root credentials (for container initialization)
MONGO_INITDB_ROOT_USERNAME=metastamp_admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_password_here
MONGO_INITDB_DATABASE=metastamp

# Optional: Replica set configuration
# MONGODB_REPLICA_SET=metastamp-rs

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------
# Redis connection URL
REDIS_URL=redis://redis:6379/0

# Optional: Redis with password
# REDIS_URL=redis://:your_redis_password@redis:6379/0

# -----------------------------------------------------------------------------
# S3/MinIO Configuration
# -----------------------------------------------------------------------------
# S3-compatible endpoint URL
# For MinIO: http://minio:9000
# For AWS S3: https://s3.amazonaws.com
S3_ENDPOINT_URL=http://minio:9000

# S3 access credentials
S3_ACCESS_KEY=your_minio_access_key
S3_SECRET_KEY=your_minio_secret_key

# S3 bucket name for asset storage
S3_BUCKET_NAME=metastamp-assets

# S3 region (required for AWS S3, optional for MinIO)
S3_REGION=us-east-1

# MinIO root credentials (for container initialization)
MINIO_ROOT_USER=your_minio_access_key
MINIO_ROOT_PASSWORD=your_minio_secret_key

# -----------------------------------------------------------------------------
# Authentication - Auth0 Configuration
# -----------------------------------------------------------------------------
# Auth0 domain (e.g., your-tenant.us.auth0.com)
AUTH0_DOMAIN=your-tenant.us.auth0.com

# Auth0 application client ID
AUTH0_CLIENT_ID=your_auth0_client_id

# Auth0 application client secret
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Auth0 API audience identifier
AUTH0_AUDIENCE=https://api.metastamp.io

# -----------------------------------------------------------------------------
# Authentication - Local JWT Fallback
# -----------------------------------------------------------------------------
# Used when Auth0 is not configured
# IMPORTANT: Change this to a secure random string in production!
JWT_SECRET_KEY=generate-a-secure-64-character-random-string-here

# JWT algorithm (HS256 for local, RS256 for Auth0)
JWT_ALGORITHM=HS256

# JWT token expiration in hours
JWT_EXPIRATION_HOURS=24

# -----------------------------------------------------------------------------
# LangChain AI Provider Configuration
# -----------------------------------------------------------------------------
# OpenAI API key for GPT-4/GPT-5 models
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic API key for Claude models
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Google API key for Gemini models
GOOGLE_API_KEY=your-google-api-key

# Default AI provider (openai, anthropic, google)
DEFAULT_AI_PROVIDER=openai

# Default AI model
DEFAULT_AI_MODEL=gpt-4

# -----------------------------------------------------------------------------
# Upload Configuration
# -----------------------------------------------------------------------------
# Maximum upload file size in MB (hard limit: 500MB)
MAX_UPLOAD_SIZE_MB=500

# Threshold for switching to presigned URL upload (in MB)
DIRECT_UPLOAD_THRESHOLD_MB=10

# Presigned URL expiration in seconds (900 = 15 minutes)
PRESIGNED_URL_EXPIRATION_SECONDS=900

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
# Comma-separated list of allowed origins
CORS_ORIGINS=https://app.metastamp.io,https://metastamp.io

# -----------------------------------------------------------------------------
# Service Ports (optional - defaults shown)
# -----------------------------------------------------------------------------
MONGODB_PORT=27017
REDIS_PORT=6379
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
BACKEND_PORT=8000
FRONTEND_PORT=3000
FRONTEND_PROD_PORT=80
```

### 3.2 Frontend Environment Variables

Frontend environment variables use the `VITE_` prefix for Vite bundler access:

```bash
# -----------------------------------------------------------------------------
# Frontend Environment Variables
# -----------------------------------------------------------------------------

# Backend API URL
VITE_API_URL=https://api.metastamp.io/api/v1

# Auth0 configuration (must match backend)
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
VITE_AUTH0_AUDIENCE=https://api.metastamp.io

# Application name
VITE_APP_NAME=META-STAMP V3

# Node environment
NODE_ENV=production
```

### 3.3 Generating Secure Secrets

**Generate JWT Secret Key:**

```bash
# Using openssl
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# Using /dev/urandom
head -c 32 /dev/urandom | base64
```

**Generate MinIO/S3 Credentials:**

```bash
# Generate access key (20 characters)
openssl rand -hex 10

# Generate secret key (40 characters)
openssl rand -hex 20
```

### 3.4 Environment Variable Security

**Best Practices:**

1. **Never commit `.env` files** to version control
2. **Use secret managers** in production (AWS Secrets Manager, HashiCorp Vault, etc.)
3. **Rotate secrets regularly** (quarterly for API keys, monthly for database passwords)
4. **Use separate credentials** for each environment (development, staging, production)
5. **Limit access** to environment files on the server

**File Permissions:**

```bash
# Set restrictive permissions on .env file
chmod 600 .env
chown root:root .env

# Or for specific user
chown deploy:deploy .env
```

---

## 4. Database Initialization

### 4.1 Running the Initialization Script

The `scripts/init_db.py` script initializes the MongoDB database with required collections, indexes, and an admin user.

**Prerequisites:**

- MongoDB service must be running
- Python 3.11+ with pymongo installed
- Environment variables configured

**Execution:**

```bash
# From project root
cd /path/to/metastamp-v3

# Activate Python environment (if using virtual env)
source .venv/bin/activate

# Run initialization script
python scripts/init_db.py

# With verbose output
python scripts/init_db.py --verbose

# Skip admin user creation (useful for re-initialization)
python scripts/init_db.py --skip-admin

# Drop and recreate collections (WARNING: Data loss!)
python scripts/init_db.py --drop
```

### 4.2 Collections Created

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `users` | User profiles and auth data | `email` (unique), `auth0_id` (unique, sparse), `created_at` |
| `assets` | Uploaded asset metadata | `user_id`, `(user_id, created_at)`, `upload_status`, `file_type` |
| `fingerprints` | Multi-modal fingerprint data | `asset_id` (unique), `created_at` |
| `wallet` | User wallet and transactions | `user_id` (unique), `transactions.timestamp` |
| `analytics` | AI Touch Value calculations | `asset_id`, `user_id`, `(asset_id, timestamp)`, `timestamp` |

### 4.3 Index Verification

Verify indexes were created correctly:

```bash
# Connect to MongoDB
docker exec -it metastamp-mongodb mongosh -u metastamp_admin -p your_password

# Switch to metastamp database
use metastamp

# List all indexes for each collection
db.users.getIndexes()
db.assets.getIndexes()
db.fingerprints.getIndexes()
db.wallet.getIndexes()
db.analytics.getIndexes()
```

### 4.4 Admin User Credentials

The init script creates an admin user:

- **Email**: `admin@metastamp.local` (or `ADMIN_EMAIL` env var)
- **Password**: From `ADMIN_PASSWORD` env var (default generated if not set)

**Retrieve Admin Credentials:**

```bash
# Check init script output for generated password
# Or query MongoDB directly
docker exec -it metastamp-mongodb mongosh -u metastamp_admin -p your_password --eval "
use metastamp;
db.users.findOne({email: 'admin@metastamp.local'}, {email: 1, created_at: 1});
"
```

---

## 5. Backup and Recovery Procedures

### 5.1 MongoDB Backup with backup.sh

The `scripts/backup.sh` script provides automated MongoDB backups.

**Manual Backup Execution:**

```bash
# Navigate to scripts directory
cd /path/to/metastamp-v3/scripts

# Make script executable
chmod +x backup.sh

# Run backup
./backup.sh

# Run with S3 upload enabled
S3_UPLOAD_ENABLED=true ./backup.sh
```

**Backup Output:**

```
backups/
└── 20251126/
    └── metastamp_backup_20251126_143022.tar.gz
```

### 5.2 Automated Backup Schedule

Configure cron for automated backups:

```bash
# Edit crontab
crontab -e

# Add backup schedule (daily at 2:00 AM)
0 2 * * * /path/to/metastamp-v3/scripts/backup.sh >> /var/log/metastamp-backup.log 2>&1

# Weekly full backup (Sundays at 3:00 AM)
0 3 * * 0 /path/to/metastamp-v3/scripts/backup.sh --full >> /var/log/metastamp-backup.log 2>&1
```

### 5.3 Backup Retention Policy

Configure retention in `backup.sh` environment:

```bash
# Keep backups for 30 days
BACKUP_RETENTION_DAYS=30

# Keep minimum number of backups
BACKUP_MIN_COUNT=7
```

### 5.4 S3 Backup Upload

Configure S3 upload for offsite backups:

```bash
# Environment variables for S3 backup upload
export S3_UPLOAD_ENABLED=true
export BACKUP_S3_BUCKET=metastamp-backups
export BACKUP_S3_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_aws_access_key
export AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### 5.5 Recovery Procedures

**Restore from Local Backup:**

```bash
# Stop backend service to prevent writes during restore
docker compose stop backend

# Extract backup
cd /path/to/backups/20251126
tar -xzf metastamp_backup_20251126_143022.tar.gz

# Restore to MongoDB
docker exec -i metastamp-mongodb mongorestore \
  --uri="mongodb://metastamp_admin:your_password@localhost:27017" \
  --gzip \
  --drop \
  --archive < metastamp_backup_20251126_143022/dump.gz

# Restart backend
docker compose start backend

# Verify restoration
docker exec -it metastamp-mongodb mongosh -u metastamp_admin -p your_password --eval "
use metastamp;
db.stats();
"
```

**Restore from S3 Backup:**

```bash
# Download backup from S3
aws s3 cp s3://metastamp-backups/20251126/metastamp_backup_20251126_143022.tar.gz ./

# Follow local restore procedure above
```

### 5.6 MinIO/S3 Object Backup

For object storage backup:

```bash
# Using MinIO Client (mc)
mc alias set myminio http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Mirror bucket to local directory
mc mirror myminio/metastamp-assets ./backups/minio/

# Mirror to another S3-compatible storage
mc mirror myminio/metastamp-assets backup-s3/metastamp-assets-backup/
```

### 5.7 Point-in-Time Recovery

For production environments with MongoDB replica sets:

```bash
# Enable oplog for point-in-time recovery
mongodump --uri="mongodb://..." --oplog --gzip --archive=backup_with_oplog.gz

# Restore to specific point in time
mongorestore --uri="mongodb://..." --oplogReplay --oplogLimit="<timestamp>" --archive=backup_with_oplog.gz
```

---

## 6. Scaling Strategies

### 6.1 Horizontal Backend Scaling

The META-STAMP V3 backend is designed to be stateless, enabling horizontal scaling.

**Stateless Design Principles:**

- No in-memory session storage (use Redis)
- No local file storage (use S3/MinIO)
- Configuration via environment variables
- Database connections via connection pooling

**Multiple Uvicorn Workers:**

```bash
# Single container with multiple workers
# In backend Dockerfile or docker-compose.yml
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Calculate workers: (2 × CPU cores) + 1
# For 8 cores: 17 workers recommended
```

**Multiple Backend Containers:**

```yaml
# docker-compose.scale.yml
version: "3.8"

services:
  backend:
    deploy:
      replicas: 4
      endpoint_mode: vip
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

```bash
# Scale using docker compose
docker compose up -d --scale backend=4
```

### 6.2 Load Balancer Configuration

**Nginx Load Balancer:**

```nginx
# /etc/nginx/conf.d/metastamp.conf

upstream metastamp_backend {
    least_conn;  # Load balancing algorithm
    
    server backend1:8000 weight=1;
    server backend2:8000 weight=1;
    server backend3:8000 weight=1;
    server backend4:8000 weight=1;
    
    keepalive 32;
}

server {
    listen 80;
    server_name api.metastamp.io;
    
    location / {
        proxy_pass http://metastamp_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;  # 5 minutes for large uploads
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://metastamp_backend/health;
        proxy_http_version 1.1;
    }
}
```

**Traefik Load Balancer (Docker-native):**

```yaml
# docker-compose.traefik.yml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.metastamp.io`)"
      - "traefik.http.services.backend.loadbalancer.server.port=8000"
      - "traefik.http.services.backend.loadbalancer.healthcheck.path=/health"
```

### 6.3 Redis Cluster Configuration

For high availability and distributed caching:

**Redis Sentinel (High Availability):**

```yaml
# docker-compose.redis-ha.yml
version: "3.8"

services:
  redis-master:
    image: redis:7.4-alpine
    command: redis-server --appendonly yes
    
  redis-replica:
    image: redis:7.4-alpine
    command: redis-server --slaveof redis-master 6379 --appendonly yes
    depends_on:
      - redis-master
      
  redis-sentinel:
    image: redis:7.4-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel.conf:/etc/redis/sentinel.conf
```

**Redis Cluster (Horizontal Scaling):**

```bash
# Create 6-node Redis cluster (3 masters, 3 replicas)
redis-cli --cluster create \
  redis1:6379 redis2:6379 redis3:6379 \
  redis4:6379 redis5:6379 redis6:6379 \
  --cluster-replicas 1
```

### 6.4 MongoDB Replica Set

For high availability and read scaling:

```yaml
# docker-compose.mongo-rs.yml
version: "3.8"

services:
  mongo-primary:
    image: mongo:8.0
    command: mongod --replSet metastamp-rs --bind_ip_all
    volumes:
      - mongo-primary-data:/data/db
      
  mongo-secondary1:
    image: mongo:8.0
    command: mongod --replSet metastamp-rs --bind_ip_all
    volumes:
      - mongo-secondary1-data:/data/db
      
  mongo-secondary2:
    image: mongo:8.0
    command: mongod --replSet metastamp-rs --bind_ip_all
    volumes:
      - mongo-secondary2-data:/data/db
```

**Initialize Replica Set:**

```javascript
// Connect to primary and initialize
rs.initiate({
  _id: "metastamp-rs",
  members: [
    { _id: 0, host: "mongo-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-secondary1:27017", priority: 1 },
    { _id: 2, host: "mongo-secondary2:27017", priority: 1 }
  ]
});
```

### 6.5 S3/CDN for Asset Delivery

**CloudFront CDN Configuration:**

```bash
# Configure CloudFront distribution for MinIO/S3
# Origin: Your S3 bucket or MinIO endpoint
# Behaviors:
#   - Default: Cache for 24 hours
#   - /assets/*: Cache for 7 days
#   - /uploads/*: No cache (presigned URLs)
```

**MinIO with Nginx Caching:**

```nginx
# Nginx caching proxy for MinIO
proxy_cache_path /var/cache/nginx/minio levels=1:2 keys_zone=minio_cache:100m max_size=10g inactive=7d;

server {
    listen 80;
    server_name assets.metastamp.io;
    
    location / {
        proxy_pass http://minio:9000;
        proxy_cache minio_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### 6.6 Scaling Decision Matrix

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage > 80% | Sustained 5 min | Add backend replica |
| Memory Usage > 85% | Sustained 5 min | Add backend replica or increase memory |
| Response Time > 2s | p95 | Add backend replica |
| MongoDB Connections > 80% | Pool utilization | Add replica set member |
| Redis Memory > 80% | Maxmemory | Enable cluster mode or increase memory |
| Storage Usage > 75% | Disk capacity | Add storage or archive old data |

---

## 7. Monitoring Setup

### 7.1 Health Check Endpoints

**Backend Health Endpoints:**

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Basic liveness check | `{"status": "healthy"}` |
| `GET /ready` | Readiness with dependencies | `{"status": "ready", "dependencies": {...}}` |

**Health Check Implementation:**

```python
# Example /health response
{
    "status": "healthy",
    "timestamp": "2025-11-26T14:30:00Z",
    "version": "3.0.0"
}

# Example /ready response
{
    "status": "ready",
    "timestamp": "2025-11-26T14:30:00Z",
    "dependencies": {
        "mongodb": "connected",
        "redis": "connected",
        "minio": "connected"
    }
}
```

**Docker Health Check Monitoring:**

```bash
# Check all service health
docker compose ps

# Detailed health status
docker inspect --format='{{json .State.Health}}' metastamp-backend | jq
```

### 7.2 Logging Configuration

**Structured JSON Logging:**

Backend logs are configured for JSON format in production:

```python
# Example structured log entry
{
    "timestamp": "2025-11-26T14:30:00.123Z",
    "level": "INFO",
    "logger": "app.api.v1.upload",
    "message": "File upload completed",
    "request_id": "abc123",
    "user_id": "user_456",
    "file_size": 1048576,
    "duration_ms": 234
}
```

**Log Aggregation with Docker:**

```bash
# View all container logs
docker compose logs -f

# View logs with timestamps
docker compose logs -f --timestamps

# View logs since specific time
docker compose logs --since 2025-11-26T14:00:00

# Export logs to file
docker compose logs > metastamp_logs_$(date +%Y%m%d).log
```

**Centralized Logging (ELK Stack):**

```yaml
# docker-compose.logging.yml
version: "3.8"

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./config/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

### 7.3 Metrics Collection (Prometheus/Grafana)

**Prometheus Configuration:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'metastamp-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
      
  - job_name: 'minio'
    static_configs:
      - targets: ['minio:9000']
    metrics_path: '/minio/v2/metrics/cluster'
```

**Docker Compose with Monitoring:**

```yaml
# docker-compose.monitoring.yml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:v2.48.0
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  mongodb-exporter:
    image: percona/mongodb_exporter:0.40.0
    environment:
      - MONGODB_URI=mongodb://metastamp_admin:password@mongodb:27017

  redis-exporter:
    image: oliver006/redis_exporter:v1.55.0
    environment:
      - REDIS_ADDR=redis://redis:6379
```

### 7.4 Key Metrics to Monitor

| Category | Metric | Alert Threshold |
|----------|--------|-----------------|
| **Application** | Request rate (req/s) | Baseline ± 50% |
| | Response time (p95) | > 2000ms |
| | Error rate (5xx) | > 1% |
| | Active connections | > 80% of limit |
| **MongoDB** | Query time (p95) | > 100ms |
| | Connections | > 80% of pool |
| | Replication lag | > 10s |
| | Storage usage | > 75% |
| **Redis** | Memory usage | > 80% |
| | Connected clients | > 80% of limit |
| | Hit rate | < 90% |
| | Evicted keys | > 0 (unexpected) |
| **MinIO** | Storage usage | > 75% |
| | Request latency | > 500ms |
| | Error rate | > 0.1% |
| **System** | CPU usage | > 80% sustained |
| | Memory usage | > 85% |
| | Disk I/O wait | > 20% |
| | Network throughput | > 80% capacity |

### 7.5 Error Tracking (Sentry Integration)

**Backend Sentry Configuration:**

```python
# In app/main.py or config.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.redis import RedisIntegration

sentry_sdk.init(
    dsn="https://your-sentry-dsn@sentry.io/project",
    environment="production",
    traces_sample_rate=0.1,
    integrations=[
        FastApiIntegration(),
        RedisIntegration(),
    ],
)
```

**Frontend Sentry Configuration:**

```typescript
// In src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

**Environment Variables:**

```bash
# Backend
SENTRY_DSN=https://your-sentry-dsn@sentry.io/backend-project

# Frontend
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/frontend-project
```

### 7.6 Alerting Configuration

**Prometheus Alert Rules:**

```yaml
# alerts.yml
groups:
  - name: metastamp-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time (p95 > 2s)"
          
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB is down"
```

---

## 8. Security Considerations

### 8.1 HTTPS/SSL Certificate Setup

**Using Let's Encrypt with Certbot:**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.metastamp.io -d app.metastamp.io

# Auto-renewal (cron job added automatically)
sudo certbot renew --dry-run
```

**Nginx SSL Configuration:**

```nginx
# /etc/nginx/conf.d/metastamp-ssl.conf
server {
    listen 443 ssl http2;
    server_name api.metastamp.io;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.metastamp.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.metastamp.io/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://metastamp_backend;
        # ... proxy settings
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.metastamp.io app.metastamp.io;
    return 301 https://$host$request_uri;
}
```

### 8.2 Firewall Rules

**Production Firewall Configuration:**

```bash
# Reset UFW rules
sudo ufw reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use non-standard port in production)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Internal network rules (for service communication)
# Allow from load balancer to backend
sudo ufw allow from 10.0.0.0/8 to any port 8000

# Deny direct access to internal services
sudo ufw deny 27017/tcp  # MongoDB
sudo ufw deny 6379/tcp   # Redis
sudo ufw deny 9000/tcp   # MinIO API
sudo ufw deny 9001/tcp   # MinIO Console

# Enable firewall
sudo ufw enable
```

**Docker Network Isolation:**

```yaml
# docker-compose.yml network isolation
networks:
  # Public network (frontend, load balancer)
  public:
    driver: bridge
    
  # Internal network (backend, databases)
  internal:
    driver: bridge
    internal: true  # No internet access
```

### 8.3 Secret Management

**Avoid .env Files in Production:**

Instead of `.env` files, use:

1. **Docker Secrets (Swarm mode):**

```yaml
# docker-compose.yml with secrets
version: "3.8"

secrets:
  mongodb_password:
    external: true
  jwt_secret:
    external: true

services:
  backend:
    secrets:
      - mongodb_password
      - jwt_secret
    environment:
      - MONGODB_PASSWORD_FILE=/run/secrets/mongodb_password
```

2. **AWS Secrets Manager:**

```bash
# Create secret
aws secretsmanager create-secret \
  --name metastamp/production \
  --secret-string '{"mongodb_password":"...","jwt_secret":"..."}'

# Retrieve in application
import boto3
client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='metastamp/production')
```

3. **HashiCorp Vault:**

```bash
# Store secret
vault kv put secret/metastamp/production mongodb_password="..." jwt_secret="..."

# Retrieve in application
vault kv get -format=json secret/metastamp/production
```

### 8.4 Auth0 Production Configuration

**Auth0 Application Settings:**

1. **Application Type**: Regular Web Application
2. **Token Endpoint Authentication Method**: Post
3. **Allowed Callback URLs**: `https://app.metastamp.io/callback`
4. **Allowed Logout URLs**: `https://app.metastamp.io`
5. **Allowed Web Origins**: `https://app.metastamp.io`

**Auth0 API Settings:**

1. **Identifier**: `https://api.metastamp.io`
2. **Signing Algorithm**: RS256
3. **Token Expiration**: 86400 seconds (24 hours)
4. **Enable RBAC**: Yes
5. **Add Permissions in Access Token**: Yes

**Rotate Auth0 Secrets:**

```bash
# Rotate client secret in Auth0 Dashboard
# Update environment variables
# Restart backend services
docker compose restart backend
```

### 8.5 Presigned URL Security

**Presigned URL Best Practices:**

1. **Short Expiration**: Default 15 minutes (900 seconds)
2. **Content-Type Restrictions**: Enforce expected MIME types
3. **Size Limits**: Enforce via Content-Length header
4. **Single-Use**: Consider implementing single-use tokens for sensitive uploads

**Tuning Presigned URL Expiration:**

```bash
# For high-latency networks, increase expiration
PRESIGNED_URL_EXPIRATION_SECONDS=1800  # 30 minutes

# For sensitive uploads, decrease expiration
PRESIGNED_URL_EXPIRATION_SECONDS=300   # 5 minutes
```

**MinIO Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::metastamp-assets/public/*"]
    },
    {
      "Effect": "Deny",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::metastamp-assets/private/*"],
      "Condition": {
        "Bool": {"aws:SecureTransport": "false"}
      }
    }
  ]
}
```

### 8.6 Security Checklist

- [ ] HTTPS enabled with valid SSL certificates
- [ ] HTTP to HTTPS redirect configured
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] Firewall rules restrict access to internal services
- [ ] MongoDB authentication enabled
- [ ] Redis password protected (if exposed)
- [ ] MinIO access keys rotated
- [ ] JWT secret is cryptographically random (64+ characters)
- [ ] Auth0 configured for production domain
- [ ] Environment variables not in version control
- [ ] Docker images scanned for vulnerabilities
- [ ] Regular security updates scheduled

---

## 9. Deployment Automation

### 9.1 Using deploy.sh Script

The `scripts/deploy.sh` script automates the deployment process.

**Script Features:**

- Pre-deployment validation
- Git repository update
- Pre-deployment backup
- Docker image rebuild
- Database migrations
- Rolling service restart
- Health check validation
- Automatic rollback on failure

**Basic Usage:**

```bash
# Navigate to project root
cd /path/to/metastamp-v3

# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh

# Deploy specific branch
./scripts/deploy.sh --branch release/v3.1.0

# Skip backup (not recommended)
./scripts/deploy.sh --skip-backup

# Verbose output
./scripts/deploy.sh --verbose
```

### 9.2 Zero-Downtime Deployment

**Rolling Update Strategy:**

```bash
#!/bin/bash
# Rolling update for backend replicas

# Scale up new version
docker compose up -d --scale backend=8 --no-recreate

# Wait for new containers to be healthy
sleep 30

# Scale down to desired count (removes old containers first)
docker compose up -d --scale backend=4
```

**Blue-Green Deployment:**

```bash
#!/bin/bash
# Blue-Green deployment strategy

# Deploy to green environment
docker compose -f docker-compose.green.yml up -d

# Wait for health checks
./scripts/wait-for-healthy.sh green

# Switch traffic (update load balancer)
./scripts/switch-traffic.sh green

# Stop blue environment
docker compose -f docker-compose.blue.yml down
```

### 9.3 Deployment Script Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    deploy.sh Workflow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Pre-deployment Validation                                │
│     ├── Check Docker/Docker Compose installed               │
│     ├── Verify script run from repo root                    │
│     └── Validate branch (main/release)                      │
│                        │                                     │
│                        ▼                                     │
│  2. Git Repository Update                                    │
│     ├── Stash uncommitted changes                           │
│     ├── git pull origin <branch>                            │
│     └── Display commit diff                                 │
│                        │                                     │
│                        ▼                                     │
│  3. Pre-deployment Backup                                    │
│     ├── Call backup.sh                                      │
│     └── Store backup reference                              │
│                        │                                     │
│                        ▼                                     │
│  4. Docker Image Rebuild                                     │
│     ├── docker compose build --no-cache                     │
│     └── Validate build success                              │
│                        │                                     │
│                        ▼                                     │
│  5. Database Migrations                                      │
│     ├── Run init_db.py (if needed)                          │
│     └── Verify migration success                            │
│                        │                                     │
│                        ▼                                     │
│  6. Service Restart                                          │
│     ├── docker compose down                                 │
│     ├── docker compose up -d                                │
│     └── Monitor startup logs                                │
│                        │                                     │
│                        ▼                                     │
│  7. Health Check Validation                                  │
│     ├── Wait for /health endpoint                           │
│     ├── Verify all dependencies                             │
│     └── Timeout after 60 seconds                            │
│                        │                                     │
│           ┌───────────┴───────────┐                         │
│           │                       │                         │
│           ▼                       ▼                         │
│  8a. Success                  8b. Failure                   │
│      ├── Log deployment           ├── Trigger rollback      │
│      └── Send notification        ├── Restore backup        │
│                                   └── Alert team            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Rollback Procedures

**Manual Rollback:**

```bash
# Stop current services
docker compose down

# Checkout previous version
git checkout HEAD~1

# Restore database from backup
./scripts/restore.sh /path/to/backup.tar.gz

# Rebuild and start
docker compose build
docker compose up -d
```

**Automated Rollback (in deploy.sh):**

```bash
# On health check failure
if ! wait_for_healthy; then
    echo "Health check failed, initiating rollback..."
    
    # Stop failed deployment
    docker compose down
    
    # Restore previous images
    docker compose pull  # Pull previous images
    
    # Restore database
    ./scripts/restore.sh $BACKUP_FILE
    
    # Start previous version
    docker compose up -d
    
    # Notify team
    ./scripts/notify.sh "Deployment failed, rolled back to previous version"
    
    exit 1
fi
```

### 9.5 CI/CD Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/metastamp-v3
            ./scripts/deploy.sh --branch main
```

**GitLab CI Pipeline:**

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

deploy-production:
  stage: deploy
  only:
    - main
  script:
    - ssh deploy@production "cd /opt/metastamp-v3 && ./scripts/deploy.sh"
  environment:
    name: production
    url: https://app.metastamp.io
```

---

## 10. Production Checklist

### 10.1 Pre-Deployment Verification

#### Infrastructure

- [ ] Server meets minimum requirements (CPU, RAM, Storage)
- [ ] Operating system updated with latest security patches
- [ ] Docker and Docker Compose installed and configured
- [ ] Firewall configured with appropriate rules
- [ ] SSL certificates obtained and valid
- [ ] DNS records configured correctly
- [ ] Load balancer configured (if applicable)

#### Configuration

- [ ] All environment variables configured
- [ ] MongoDB credentials set and secure
- [ ] Redis configuration reviewed
- [ ] MinIO/S3 credentials set
- [ ] Auth0 configured for production domain
- [ ] LangChain API keys configured
- [ ] JWT secret key generated (64+ characters)
- [ ] CORS origins configured for production domains

#### Security

- [ ] HTTPS enabled and HTTP redirects configured
- [ ] Security headers configured in reverse proxy
- [ ] Database authentication enabled
- [ ] Secrets stored securely (not in .env files)
- [ ] Docker images scanned for vulnerabilities
- [ ] File upload validation rules verified

#### Monitoring

- [ ] Health check endpoints accessible
- [ ] Log aggregation configured
- [ ] Metrics collection enabled
- [ ] Alerting rules configured
- [ ] Error tracking (Sentry) configured

### 10.2 Deployment Steps

```bash
# 1. Final configuration check
./scripts/deploy.sh --dry-run

# 2. Create pre-deployment backup
./scripts/backup.sh

# 3. Deploy
./scripts/deploy.sh

# 4. Verify deployment
curl -s https://api.metastamp.io/health | jq
curl -s https://api.metastamp.io/ready | jq
```

### 10.3 Post-Deployment Validation

#### Application Health

- [ ] `/health` endpoint returns `{"status": "healthy"}`
- [ ] `/ready` endpoint shows all dependencies connected
- [ ] Frontend loads without errors
- [ ] Authentication flow works (login/logout)
- [ ] File upload works (both direct and presigned URL flows)

#### Functionality Testing

- [ ] Create test user account
- [ ] Upload sample text file (<10MB)
- [ ] Upload sample image file (>10MB via presigned URL)
- [ ] Verify fingerprint generation
- [ ] Test AI Touch Value calculation
- [ ] Test AI assistant interaction
- [ ] Verify wallet balance display

#### Performance Testing

- [ ] Response times within acceptable limits (<2s)
- [ ] No errors in application logs
- [ ] Database queries executing efficiently
- [ ] Cache hit rate acceptable (>90%)

### 10.4 Rollback Decision Criteria

Initiate rollback if:

- [ ] Health checks fail for >5 minutes
- [ ] Error rate exceeds 5%
- [ ] Response time p95 exceeds 5 seconds
- [ ] Critical functionality broken (auth, uploads, payments)
- [ ] Data corruption detected
- [ ] Security vulnerability discovered

### 10.5 Post-Deployment Monitoring Period

| Timeframe | Actions |
|-----------|---------|
| 0-15 min | Monitor health checks, error rates, response times |
| 15-60 min | Verify all functionality, check logs for warnings |
| 1-4 hours | Monitor resource usage, check for memory leaks |
| 4-24 hours | Full monitoring, ready to rollback if issues arise |
| 24-72 hours | Standard monitoring, deployment considered stable |

---

## 11. Troubleshooting

### 11.1 Common Issues and Solutions

#### Service Won't Start

**Symptom:** Container exits immediately or fails health check

```bash
# Check container logs
docker compose logs backend

# Check container status
docker compose ps

# Inspect container details
docker inspect metastamp-backend
```

**Common Causes:**

1. **Missing environment variables**
   ```bash
   # Verify all required env vars are set
   docker compose config
   ```

2. **Port already in use**
   ```bash
   # Check port usage
   sudo netstat -tlnp | grep 8000
   ```

3. **Volume permission issues**
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 /var/lib/docker/volumes/metastamp-*
   ```

#### Database Connection Errors

**Symptom:** "Connection refused" or "Authentication failed"

```bash
# Test MongoDB connection
docker exec -it metastamp-mongodb mongosh --eval "db.runCommand('ping')"

# Check MongoDB logs
docker compose logs mongodb

# Verify credentials
docker exec -it metastamp-backend env | grep MONGODB
```

**Solutions:**

1. Ensure MongoDB is fully started before backend
2. Verify credentials match in both services
3. Check network connectivity between containers

#### Redis Connection Issues

**Symptom:** "WRONGTYPE Operation" or "Connection refused"

```bash
# Test Redis connection
docker exec -it metastamp-redis redis-cli ping

# Check Redis memory
docker exec -it metastamp-redis redis-cli info memory
```

#### MinIO/S3 Upload Failures

**Symptom:** "Access Denied" or "Bucket not found"

```bash
# Verify MinIO is running
docker compose logs minio

# Check bucket exists
docker exec -it metastamp-minio mc alias set myminio http://localhost:9000 ACCESS_KEY SECRET_KEY
docker exec -it metastamp-minio mc ls myminio/

# Create bucket if missing
docker exec -it metastamp-minio mc mb myminio/metastamp-assets
```

### 11.2 Performance Issues

#### Slow Response Times

```bash
# Check resource usage
docker stats

# Check MongoDB slow queries
docker exec -it metastamp-mongodb mongosh --eval "
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ts:-1}).limit(10);
"

# Check Redis latency
docker exec -it metastamp-redis redis-cli --latency
```

#### High Memory Usage

```bash
# Check container memory
docker stats --no-stream

# Check for memory leaks (backend)
docker exec -it metastamp-backend python -c "
import tracemalloc
tracemalloc.start()
# ... run tests
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
"
```

### 11.3 Log Analysis

**View recent errors:**

```bash
# Backend errors
docker compose logs backend 2>&1 | grep -i error | tail -50

# All service errors
docker compose logs 2>&1 | grep -i "error\|exception\|failed" | tail -100
```

**Export logs for analysis:**

```bash
# Export all logs
docker compose logs --no-color > logs_$(date +%Y%m%d_%H%M%S).log

# Export specific timeframe
docker compose logs --since 2025-11-26T10:00:00 --until 2025-11-26T12:00:00 > incident_logs.log
```

### 11.4 Emergency Procedures

#### Complete System Recovery

```bash
# 1. Stop all services
docker compose down

# 2. Remove all containers and networks
docker compose down -v --remove-orphans

# 3. Clean Docker system (WARNING: removes unused resources)
docker system prune -a

# 4. Restore from backup
./scripts/restore.sh /path/to/latest/backup.tar.gz

# 5. Rebuild and start
docker compose build --no-cache
docker compose up -d

# 6. Verify recovery
curl -s http://localhost:8000/health
```

#### Database Recovery

```bash
# 1. Stop backend to prevent writes
docker compose stop backend

# 2. Restore MongoDB
docker exec -i metastamp-mongodb mongorestore \
  --uri="mongodb://user:pass@localhost:27017" \
  --drop \
  --gzip \
  --archive < backup_dump.gz

# 3. Verify data
docker exec -it metastamp-mongodb mongosh --eval "
use metastamp;
print('Users:', db.users.countDocuments());
print('Assets:', db.assets.countDocuments());
"

# 4. Restart backend
docker compose start backend
```

### 11.5 Getting Help

**Resources:**

- **Documentation**: `docs/` directory in repository
- **API Reference**: `docs/API.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Development Guide**: `docs/DEVELOPMENT.md`

**Support Channels:**

- GitHub Issues: For bug reports and feature requests
- Team Slack: For real-time assistance
- Email: support@metastamp.io

**When Reporting Issues:**

1. Include Docker Compose version: `docker compose version`
2. Include service logs: `docker compose logs <service> | tail -100`
3. Include environment (don't share secrets): `docker compose config`
4. Describe steps to reproduce
5. Include expected vs actual behavior

---

## Appendix A: Quick Reference Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart specific service
docker compose restart backend

# Scale backend
docker compose up -d --scale backend=4

# Update and restart
docker compose pull && docker compose up -d

# Backup database
./scripts/backup.sh

# Deploy update
./scripts/deploy.sh

# Check health
curl http://localhost:8000/health

# Shell into container
docker exec -it metastamp-backend /bin/bash

# MongoDB shell
docker exec -it metastamp-mongodb mongosh -u admin -p

# Redis CLI
docker exec -it metastamp-redis redis-cli
```

---

## Appendix B: Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URL` | Yes | - | MongoDB connection URI |
| `MONGODB_DATABASE` | Yes | metastamp | Database name |
| `REDIS_URL` | Yes | - | Redis connection URL |
| `S3_ENDPOINT_URL` | Yes | - | S3/MinIO endpoint |
| `S3_ACCESS_KEY` | Yes | - | S3 access key |
| `S3_SECRET_KEY` | Yes | - | S3 secret key |
| `S3_BUCKET_NAME` | Yes | - | Bucket for assets |
| `AUTH0_DOMAIN` | No | - | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | No | - | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | No | - | Auth0 client secret |
| `JWT_SECRET_KEY` | Yes | - | Local JWT signing key |
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key |
| `GOOGLE_API_KEY` | No | - | Google API key |
| `MAX_UPLOAD_SIZE_MB` | No | 500 | Max file size |
| `PRESIGNED_URL_EXPIRATION_SECONDS` | No | 900 | URL expiration |

---

*Document Version: 1.0.0*
*Last Updated: November 2025*
*META-STAMP V3 Platform*
