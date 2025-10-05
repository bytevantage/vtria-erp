#!/bin/bash

# ============================================
# VTRIA ERP Production Deployment Script v2
# ============================================
# This script automates the production deployment
# Run: chmod +x deploy-production-complete.sh && ./deploy-production-complete.sh

set -e  # Exit on any error

echo "🚀 VTRIA ERP Production Deployment Script"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Pre-deployment Checks
# ============================================

print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

# Check if MySQL is available
if ! command -v mysql &> /dev/null; then
    print_warning "MySQL client not found. Make sure MySQL server is accessible."
fi

print_success "Prerequisites check completed"

# ============================================
# Environment Configuration
# ============================================

print_status "Configuring production environment..."

# Prompt for production URLs
read -p "🌐 Enter your production domain (e.g., yourdomain.com): " PRODUCTION_DOMAIN
read -p "🔗 Enter your API domain (e.g., api.yourdomain.com): " API_DOMAIN

if [ -z "$PRODUCTION_DOMAIN" ] || [ -z "$API_DOMAIN" ]; then
    print_error "Domain names are required for production deployment"
    exit 1
fi

# Update API .env.production
print_status "Updating API environment configuration..."
sed -i.bak "s|FRONTEND_URL=.*|FRONTEND_URL=https://$PRODUCTION_DOMAIN|g" api/.env.production 2>/dev/null || true

# Update Client .env.production
print_status "Updating Client environment configuration..."
sed -i.bak "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=https://$API_DOMAIN|g" client/.env.production

print_success "Environment configuration updated"

# ============================================
# Database Setup
# ============================================

print_status "Setting up production database..."

# Prompt for database credentials
read -p "🗄️  Enter MySQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "🗄️  Enter MySQL port (default: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "🗄️  Enter MySQL username: " DB_USER
read -s -p "🔑 Enter MySQL password: " DB_PASS
echo

if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    print_error "Database credentials are required"
    exit 1
fi

# Update database config in .env.production
sed -i.bak "s|DB_HOST=.*|DB_HOST=$DB_HOST|g" api/.env.production
sed -i.bak "s|DB_PORT=.*|DB_PORT=$DB_PORT|g" api/.env.production
sed -i.bak "s|DB_USER=.*|DB_USER=$DB_USER|g" api/.env.production
sed -i.bak "s|DB_PASS=.*|DB_PASS=$DB_PASS|g" api/.env.production

# Run database setup
print_status "Creating database and tables..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" < sql/production_database_setup.sql

if [ $? -eq 0 ]; then
    print_success "Database setup completed successfully"
else
    print_error "Database setup failed. Please check your credentials and try again."
    exit 1
fi

# ============================================
# API Server Deployment
# ============================================

print_status "Deploying API server..."

cd api

# Install production dependencies
print_status "Installing API dependencies..."
npm install --production

# Copy production environment
cp .env.production .env

print_success "API server deployment completed"
cd ..

# ============================================
# Client Application Build
# ============================================

print_status "Building client application..."

cd client

# Install dependencies
print_status "Installing client dependencies..."
npm install

# Copy production environment for build
cp .env.production .env.local

# Build production bundle
print_status "Creating production build..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Client build completed successfully"
else
    print_error "Client build failed"
    exit 1
fi

cd ..

# ============================================
# Create Startup Scripts
# ============================================

print_status "Creating startup scripts..."

# API startup script
cat > start_api_production.sh << 'EOF'
#!/bin/bash
# VTRIA ERP API Server Production Startup Script

cd api
export NODE_ENV=production

# Start with PM2 for production process management
if command -v pm2 &> /dev/null; then
    pm2 start src/server.js --name "vtria-api" --env production
    pm2 save
    pm2 startup
    echo "✅ API server started with PM2"
else
    echo "⚠️  PM2 not found. Starting with node (install PM2 for production)"
    nohup node src/server.js > ../api_production.log 2>&1 &
    echo "✅ API server started (check api_production.log for logs)"
fi
EOF

# Make startup script executable
chmod +x start_api_production.sh

# ============================================
# Create Configuration Templates
# ============================================

# Nginx configuration template
cat > nginx_vtria_config.conf << EOF
# VTRIA ERP Nginx Configuration
# Copy this to /etc/nginx/sites-available/vtria-erp
# Then: sudo ln -s /etc/nginx/sites-available/vtria-erp /etc/nginx/sites-enabled/
# Test: sudo nginx -t
# Reload: sudo systemctl reload nginx

server {
    listen 80;
    server_name $PRODUCTION_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $PRODUCTION_DOMAIN;
    
    # SSL Configuration (update paths to your certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Client Application
    location / {
        root $(pwd)/client/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# API Server Configuration
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# SSL Setup Guide
cat > ssl_setup_guide.md << EOF
# 🔐 SSL Certificate Setup Guide

## Option 1: Let's Encrypt (Free & Recommended)

### Install Certbot
\`\`\`bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
\`\`\`

### Get SSL Certificate
\`\`\`bash
sudo certbot --nginx -d $PRODUCTION_DOMAIN -d $API_DOMAIN
\`\`\`

### Auto-renewal
\`\`\`bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
\`\`\`

## Option 2: Cloudflare (Recommended for easy setup)

1. Add your domain to Cloudflare
2. Change your domain's nameservers to Cloudflare
3. Enable "Full (strict)" SSL mode in Cloudflare
4. Use Cloudflare's origin certificates for your server

## Option 3: Commercial SSL Certificate

1. Purchase SSL from your preferred provider
2. Generate CSR on your server
3. Install the certificate files
4. Update nginx configuration with certificate paths

⚠️  **IMPORTANT**: HTTPS is mandatory for production security!
EOF

# ============================================
# Deployment Summary
# ============================================

print_success "🎉 VTRIA ERP Production Deployment Completed!"
echo "============================================"

echo "📋 DEPLOYMENT SUMMARY"
echo "============================================"
echo "✅ Production environment configured"
echo "✅ Database created with admin users"
echo "✅ API server prepared"
echo "✅ Client application built"
echo "✅ Startup scripts created"
echo "✅ Nginx configuration template created"
echo "✅ SSL setup guide created"
echo ""

echo "🔐 LOGIN CREDENTIALS"
echo "============================================"
echo "System Administrator:"
echo "  📧 Email: admin@vtria.com"
echo "  🔑 Password: Admin123!"
echo "  🎭 Role: Director (Full Access)"
echo ""
echo "VTRIA Director:"
echo "  📧 Email: director@vtria.com"
echo "  🔑 Password: VtriaDir2025!"
echo "  🎭 Role: Director (Full Access)"
echo ""
echo "Production Manager:"
echo "  📧 Email: manager@vtria.com"
echo "  🔑 Password: Manager2025!"
echo "  🎭 Role: Admin (Management Access)"
echo ""

echo "🚀 NEXT STEPS"
echo "============================================"
echo "1. Set up SSL certificates (see ssl_setup_guide.md)"
echo "2. Configure nginx (use nginx_vtria_config.conf)"
echo "3. Start the API server: ./start_api_production.sh"
echo "4. Configure web server to serve client/build folder"
echo "5. Update DNS to point to your server"
echo "6. Test login at https://$PRODUCTION_DOMAIN/login"
echo "7. 🔥 CHANGE DEFAULT PASSWORDS after first login!"
echo ""

echo "📁 IMPORTANT FILES CREATED"
echo "============================================"
echo "• start_api_production.sh - API server startup script"
echo "• nginx_vtria_config.conf - Complete Nginx configuration"
echo "• ssl_setup_guide.md - SSL certificate setup guide"
echo "• api/.env - Production API configuration"
echo "• client/build/ - Production client build"
echo ""

print_warning "🔥 SECURITY REMINDER: Change all default passwords immediately!"
print_warning "🔒 SSL REQUIRED: Set up HTTPS before going live!"
print_warning "🛡️  FIREWALL: Configure firewall to allow only necessary ports"

echo "============================================"
print_success "Deployment script completed successfully! 🎉"