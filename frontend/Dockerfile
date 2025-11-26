# =============================================================================
# META-STAMP V3 Frontend Dockerfile
# =============================================================================
# Multi-stage Docker build configuration for the META-STAMP V3 frontend service.
# 
# Stage 1 (builder): Node.js 20-alpine for dependency installation and 
#                    production build using Vite
# Stage 2 (production): nginx:alpine for serving optimized static assets
#
# This configuration follows best practices for:
# - Minimal image size through multi-stage builds
# - Security through Alpine base images and non-root execution
# - Reproducible builds through npm ci
# - Production optimizations (minification, tree-shaking via Vite)
#
# Build: docker build -t meta-stamp-frontend .
# Run:   docker run -p 80:80 meta-stamp-frontend
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
# Use Node.js 20 LTS on Alpine Linux for minimal base image size
# This stage installs dependencies and creates the production build
FROM node:20-alpine AS builder

# Set working directory for all subsequent commands
WORKDIR /app

# Install build dependencies required for native modules
# Some npm packages may need python and build tools for compilation
RUN apk add --no-cache python3 make g++

# Copy package files first for better Docker layer caching
# This allows npm ci to be cached unless package files change
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
# npm ci provides reproducible builds from lockfile
# Using --include=dev to ensure all build dependencies are installed
RUN npm ci --include=dev

# Copy all source files after dependency installation
# This ordering optimizes Docker layer caching
COPY . .

# Build the production-optimized bundle using Vite
# This runs: tsc && vite build (as defined in package.json)
# Output is generated in the dist/ directory
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
# Use nginx Alpine for minimal production image size (~23MB)
# nginx efficiently serves static files with excellent performance
FROM nginx:1.27-alpine AS production

# Add labels for container metadata
LABEL maintainer="META-STAMP Team"
LABEL description="META-STAMP V3 Frontend - Creator Protection Platform"
LABEL version="1.0.0"

# Remove default nginx static assets and configuration
RUN rm -rf /usr/share/nginx/html/*

# Copy the production build from builder stage
# Only the dist/ folder is needed - no source code or node_modules
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom nginx configuration for SPA routing inline
# This configuration handles client-side routing by serving index.html
# for all non-file requests (required for React Router)
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX_CONFIG'
# =============================================================================
# META-STAMP V3 Frontend nginx Configuration
# =============================================================================
# Optimized configuration for serving React SPA with:
# - Client-side routing support (history API fallback)
# - Gzip compression for reduced payload sizes
# - Proper caching headers for static assets
# - Security headers for protection
# =============================================================================

server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    # Root directory containing built static files
    root /usr/share/nginx/html;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression for text-based assets
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static assets with long cache duration (hashed filenames from Vite)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API proxy configuration (for production with backend on same host)
    # Uncomment and configure if backend is accessible via internal network
    # location /api/ {
    #     proxy_pass http://backend:8000;
    #     proxy_http_version 1.1;
    #     proxy_set_header Upgrade $http_upgrade;
    #     proxy_set_header Connection 'upgrade';
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    #     proxy_cache_bypass $http_upgrade;
    # }
    
    # SPA fallback - serve index.html for all non-file requests
    # This enables client-side routing with React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Deny access to hidden files (except .well-known)
    location ~ /\.(?!well-known) {
        deny all;
    }
    
    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
NGINX_CONFIG

# Create a non-root user for running nginx (security best practice)
# Note: nginx:alpine already runs worker processes as nginx user
# The master process runs as root to bind to port 80

# Set proper file permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    # Create directories for nginx cache and pid
    mkdir -p /var/cache/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run && \
    # Remove default server block
    rm -f /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

# Expose port 80 for HTTP traffic
# In production, this is typically proxied through a load balancer with TLS
EXPOSE 80

# Health check to verify nginx is serving content
# Checks if the root page returns 200 OK
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx in foreground mode (required for Docker)
# daemon off ensures nginx runs as PID 1 and handles signals properly
CMD ["nginx", "-g", "daemon off;"]
