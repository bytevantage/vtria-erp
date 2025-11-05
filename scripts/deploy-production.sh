#!/bin/bash

# VTRIA ERP - Production Deployment Script
# Deploys the production version for client sites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (can be overridden by environment variables)
DEPLOY_DIR="${DEPLOY_DIR:-/opt/vtria-erp}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/vtria-erp}"
DOCKER_IMAGE="${DOCKER_IMAGE:-vtria-erp:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-vtria-erp}"
HTTP_PORT="${HTTP_PORT:-3000}"
HTTPS_PORT="${HTTPS_PORT:-443}"
DB_PORT="${DB_PORT:-3306}"
CLIENT_NAME="${CLIENT_NAME:-production}"
SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/ssl/certs/vtria-erp.crt}"
SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/ssl/private/vtria-erp.key}"

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check SSL certificates
    if [ ! -f "$SSL_CERT_PATH" ] || [ ! -f "$SSL_KEY_PATH" ]; then
        print_warning "SSL certificates not found at specified paths"
        print_warning "You can generate self-signed certificates or provide your own"
        
        read -p "Generate self-signed certificates? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            generate_ssl_certs
        else
            print_error "SSL certificates are required for production deployment"
            exit 1
        fi
    fi
    
    # Check environment file
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        print_warning "Environment file not found. Creating template..."
        create_env_template
    fi
    
    print_status "Prerequisites check passed"
}

# Generate SSL certificates
generate_ssl_certs() {
    print_status "Generating self-signed SSL certificates..."
    
    mkdir -p "$(dirname "$SSL_CERT_PATH")"
    mkdir -p "$(dirname "$SSL_KEY_PATH")"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_KEY_PATH" \
        -out "$SSL_CERT_PATH" \
        -subj "/C=IN/ST=Karnataka/L=Mangalore/O=Bytevantage/OU=IT/CN=vtria-erp.com"
    
    print_status "SSL certificates generated"
}

# Create environment template
create_env_template() {
    mkdir -p "$DEPLOY_DIR"
    
    cat > "$DEPLOY_DIR/.env" << EOF
# VTRIA ERP Production Environment Configuration
# Generated on: $(date)

# Application
NODE_ENV=production
APP_NAME=VTRIA ERP
CLIENT_NAME=$CLIENT_NAME
VERSION=production

# Database
DB_HOST=vtria-erp-db
DB_PORT=3306
DB_NAME=vtria_production
DB_USER=vtria_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_ROOT_PASSWORD=CHANGE_THIS_ROOT_PASSWORD

# Security
JWT_SECRET=CHANGE_THIS_JWT_SECRET
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET
ENCRYPTION_KEY=CHANGE_THIS_32_CHAR_KEY

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# External Services
REDIS_HOST=vtria-erp-redis
REDIS_PORT=6379

# Monitoring
ENABLE_MONITORING=true
SENTRY_DSN=your-sentry-dsn-here

# Backup
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key

# Features
ENABLE_TWO_FACTOR_AUTH=true
ENABLE_API_ACCESS=true
ENABLE_WEBHOOKS=true
ENABLE_AUDIT_LOGGING=true

# Limits
MAX_CONCURRENT_USERS=100
SESSION_TIMEOUT=28800
RATE_LIMIT=1000/hour
EOF

    print_warning "Environment template created at $DEPLOY_DIR/.env"
    print_warning "Please edit the file and update all passwords and secrets"
    print_warning "Run the deployment script again after configuration"
    exit 1
}

# Create comprehensive backup
create_backup() {
    if [ -d "$DEPLOY_DIR" ]; then
        print_status "Creating comprehensive backup..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup application
        cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        
        # Backup database if container exists
        if docker ps -q -f name=vtria-erp-db | grep -q .; then
            docker exec vtria-erp-db mysqldump -u root -p"$DB_ROOT_PASSWORD" --all-databases > "$BACKUP_DIR/$BACKUP_NAME/database.sql"
        fi
        
        # Create compressed archive
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
        rm -rf "$BACKUP_DIR/$BACKUP_NAME"
        
        print_status "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    fi
}

# Stop existing services
stop_services() {
    print_status "Stopping existing services..."
    
    cd "$DEPLOY_DIR"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        print_status "Services stopped"
    fi
    
    # Clean up any remaining containers
    if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
        docker rm -f $CONTAINER_NAME
    fi
}

# Pull latest images
pull_images() {
    print_status "Pulling latest production images..."
    
    docker pull $DOCKER_IMAGE
    docker pull mysql:8.0
    docker pull redis:7-alpine
    docker pull nginx:alpine
    
    print_status "Images pulled successfully"
}

# Deploy application
deploy_app() {
    print_status "Deploying VTRIA ERP Production..."
    
    cd "$DEPLOY_DIR"
    
    # Create production docker-compose file
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: vtria-erp-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/ssl/certs
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - vtria-erp
    restart: unless-stopped

  vtria-erp:
    image: $DOCKER_IMAGE
    container_name: $CONTAINER_NAME
    expose:
      - "3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
      - ./logs/app:/app/logs
      - ./uploads:/app/uploads
      - ./backups:/app/backups
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  db:
    image: mysql:8.0
    container_name: vtria-erp-db
    ports:
      - "$DB_PORT:3306"
    env_file:
      - .env
    volumes:
      - db-data:/var/lib/mysql
      - ./backups:/backups
      - ./sql:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vtria-erp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis/redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf
    restart: unless-stopped

  backup:
    image: mysql:8.0
    container_name: vtria-erp-backup
    env_file:
      - .env
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh
    depends_on:
      - db
    restart: "no"
    command: /bin/bash -c "chmod +x /backup.sh && /backup.sh"

volumes:
  db-data:
  redis-data:
EOF

    # Create nginx configuration
    mkdir -p nginx
    cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream vtria-erp {
        server vtria-erp:3000;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://\$server_name\$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/ssl/certs/vtria-erp.crt;
        ssl_certificate_key /etc/ssl/private/vtria-erp.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://vtria-erp;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /api/ {
            proxy_pass http://vtria-erp;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

    # Create backup script
    mkdir -p scripts
    cat > scripts/backup.sh << EOF
#!/bin/bash
# Automated backup script

BACKUP_DIR="/app/backups"
DATE=\$(date +%Y%m%d-%H%M%S)
DB_NAME="\$DB_NAME"
DB_USER="\$DB_USER"
DB_PASSWORD="\$DB_PASSWORD"
DB_HOST="db"

# Create backup
mysqldump -h \$DB_HOST -u \$DB_USER -p\$DB_PASSWORD \$DB_NAME > \$BACKUP_DIR/backup-\$DATE.sql

# Compress old backups (older than 7 days)
find \$BACKUP_DIR -name "backup-*.sql" -mtime +7 -exec gzip {} \;

# Remove backups older than retention period
find \$BACKUP_DIR -name "backup-*.sql.gz" -mtime +\${BACKUP_RETENTION_DAYS:-30} -delete

echo "Backup completed: backup-\$DATE.sql"
EOF

    # Create Redis configuration
    mkdir -p redis
    cat > redis/redis.conf << EOF
bind 0.0.0.0
port 6379
requirepass \${REDIS_PASSWORD:-redis123456}
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

    # Start services
    docker-compose up -d
    
    print_status "Application deployed successfully"
}

# Wait for services to be ready
wait_for_ready() {
    print_status "Waiting for services to be ready..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -k https://localhost/health &>/dev/null; then
            print_status "Services are ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Waiting..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Services failed to become ready within expected time"
    return 1
}

# Setup production database
setup_database() {
    print_status "Setting up production database..."
    
    # Wait for database to be ready
    sleep 30
    
    # Run database migrations
    docker exec $CONTAINER_NAME npm run migrate || {
        print_error "Database migration failed"
        return 1
    }
    
    # Create admin user if needed
    docker exec $CONTAINER_NAME npm run setup-admin || {
        print_warning "Admin setup failed, you may need to run it manually"
    }
    
    print_status "Database setup completed"
}

# Setup monitoring and logging
setup_monitoring() {
    print_status "Setting up monitoring and logging..."
    
    # Create log directories
    mkdir -p logs/{nginx,app,system}
    
    # Setup log rotation
    cat > /etc/logrotate.d/vtria-erp << EOF
$DEPLOY_DIR/logs/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 vtria-erp-nginx
    endscript
}
EOF
    
    print_status "Monitoring setup completed"
}

# Show deployment information
show_deployment_info() {
    print_header "Production Deployment Complete"
    
    echo -e "${GREEN}🎉 VTRIA ERP Production deployed successfully!${NC}"
    echo ""
    echo "📱 Access Information:"
    echo "   URL: https://localhost"
    echo "   Health Check: https://localhost/health"
    echo ""
    echo "🔧 Management Commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop: docker-compose down"
    echo "   Restart: docker-compose restart"
    echo "   Update: docker-compose pull && docker-compose up -d"
    echo ""
    echo "🗄️  Database:"
    echo "   Host: localhost:$DB_PORT"
    echo "   Backup: Automated daily"
    echo "   Manual backup: docker exec vtria-erp-db mysqldump ..."
    echo ""
    echo "📁 Important Locations:"
    echo "   Deployment: $DEPLOY_DIR"
    echo "   Backups: $BACKUP_DIR"
    echo "   Logs: $DEPLOY_DIR/logs"
    echo "   Config: $DEPLOY_DIR/.env"
    echo ""
    echo "🔒 Security Features:"
    echo "   - SSL/TLS encryption"
    echo "   - Two-factor authentication"
    echo "   - Rate limiting"
    echo "   - Audit logging"
    echo "   - Session management"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "   - Change all default passwords"
    echo "   - Configure proper domain names"
    echo "   - Set up external monitoring"
    echo "   - Test backup and recovery"
    echo "   - Review security settings"
}

# Main execution
main() {
    print_header "VTRIA ERP Production Deployment"
    
    # Check prerequisites
    check_root
    check_prerequisites
    
    # Deployment steps
    create_backup
    stop_services
    pull_images
    deploy_app
    wait_for_ready
    setup_database
    setup_monitoring
    show_deployment_info
    
    print_status "Production deployment completed successfully!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
