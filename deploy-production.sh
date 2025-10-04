#!/bin/bash

# VTRIA ERP Production Deployment Script
# Run this script to deploy VTRIA ERP to production with authentication

set -e

echo "🚀 Starting VTRIA ERP Production Deployment"
echo "=========================================="

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production configuration."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

# Create necessary directories
log "Creating necessary directories..."
mkdir -p "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "/var/log"

# Backup existing deployment
if [ -d "$PROJECT_DIR" ]; then
    log "Creating backup of existing deployment..."
    BACKUP_NAME="vtria-erp-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$PROJECT_DIR" . || warning "Backup failed"
    success "Backup created: $BACKUP_NAME"
fi

# Stop existing services
log "Stopping existing services..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || warning "Service $SERVICE_NAME not found"
systemctl stop "${SERVICE_NAME}-client" 2>/dev/null || warning "Service ${SERVICE_NAME}-client not found"

# Copy application files
log "Copying application files..."
cp -r . "$PROJECT_DIR/"
cd "$PROJECT_DIR"

# Install Node.js dependencies
log "Installing Node.js dependencies..."
cd "$PROJECT_DIR/api"
npm ci --production || error "API dependency installation failed"

cd "$PROJECT_DIR/client"
npm ci --production || error "Client dependency installation failed"

# Build client for production
log "Building client for production..."
npm run build || error "Client build failed"

# Configure environment
log "Configuring production environment..."
cd "$PROJECT_DIR/api"
cp .env.production .env || warning "Production environment file not found"

# Setup database
log "Setting up database..."
# Add database setup commands here
mysql -u root -p < "$PROJECT_DIR/sql/schema/01_setup_complete_schema.sql" || warning "Database setup may have failed"

# Setup systemd services
log "Creating systemd services..."

# API Service
cat > /etc/systemd/system/vtria-erp.service << EOF
[Unit]
Description=VTRIA ERP API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PROJECT_DIR/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=vtria-erp-api

[Install]
WantedBy=multi-user.target
EOF

# Nginx configuration for client
cat > /etc/nginx/sites-available/vtria-erp << EOF
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Client files
    root $PROJECT_DIR/client/build;
    index index.html;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/vtria-erp /etc/nginx/sites-enabled/
nginx -t || error "Nginx configuration test failed"

# Setup log rotation
cat > /etc/logrotate.d/vtria-erp << EOF
$PROJECT_DIR/api/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF

# Setup backup cron job
cat > /etc/cron.d/vtria-erp-backup << EOF
# VTRIA ERP Daily Backup
0 2 * * * root $PROJECT_DIR/scripts/backup.sh
EOF

# Set permissions
log "Setting permissions..."
chown -R www-data:www-data "$PROJECT_DIR"
chmod +x "$PROJECT_DIR/scripts/"*.sh 2>/dev/null || true

# Reload systemd and start services
log "Starting services..."
systemctl daemon-reload
systemctl enable vtria-erp
systemctl start vtria-erp
systemctl reload nginx

# Wait for services to start
sleep 5

# Health check
log "Performing health check..."
if curl -f -s http://localhost:3001/health > /dev/null; then
    success "API health check passed"
else
    error "API health check failed"
fi

# Final status
log "Checking service status..."
systemctl status vtria-erp --no-pager

success "✅ VTRIA ERP production deployment completed successfully!"
success "🌐 Application should be available at: https://your-domain.com"
success "📊 API health endpoint: https://your-domain.com/api/health"
success "📋 Service logs: journalctl -u vtria-erp -f"

# Display important next steps
echo
echo "🔧 IMPORTANT NEXT STEPS:"
echo "1. Update DNS to point your-domain.com to this server"
echo "2. Obtain and install SSL certificates"
echo "3. Update .env.production with your actual domain and credentials"
echo "4. Test all functionality thoroughly"
echo "5. Set up monitoring and alerting"
echo "6. Configure database backups"
echo
echo "📁 Project location: $PROJECT_DIR"
echo "💾 Backups location: $BACKUP_DIR"
echo "📝 Deployment log: $LOG_FILE"