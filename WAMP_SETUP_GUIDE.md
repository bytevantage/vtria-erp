# VTRIA ERP - WAMP Server Setup Guide

## Overview
This guide provides step-by-step instructions to deploy VTRIA ERP on a WAMP (Windows, Apache, MySQL/PostgreSQL, PHP) server environment. The system uses Node.js backend on port 3000 with Apache serving the React frontend and proxying API requests.

## Prerequisites
- WAMP Server installed and running
- PostgreSQL database (recommended over MySQL for this ERP)
- Node.js (v16 or higher)
- npm or yarn package manager
- Valid license key from ByteVantage

## Directory Structure
```
c:\wamp64\www\vtria-erp\
├── server/                 # Node.js backend
├── client/                 # React frontend
├── apache-config/          # Apache configuration files
├── README.md
└── WAMP_SETUP_GUIDE.md    # This file
```

## Step 1: Database Setup

### PostgreSQL Configuration
1. Install PostgreSQL on your WAMP server
2. Create database and user:
```sql
CREATE DATABASE vtria_erp_dev;
CREATE USER vtria_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE vtria_erp_dev TO vtria_user;
```

## Step 2: Backend Configuration

### Environment Setup
1. Navigate to server directory:
```bash
cd c:\wamp64\www\vtria-erp\server
```

2. Copy environment file:
```bash
copy .env.example .env
```

3. Update `.env` file with your configuration:
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost
DOMAIN=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vtria_erp_dev
DB_USER=vtria_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# License Configuration
LICENSE_KEY=your-license-key-from-bytevantage
LICENSE_API_URL=https://licenses.bytevantage.in/api

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@vtria.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@vtria.com
```

### Install Dependencies
```bash
npm install
```

### Database Migration and Seeding
```bash
# Run database migrations
npm run migrate

# Seed initial data (roles, locations, admin user)
npm run seed
```

### Start Backend Server
```bash
# For development
npm run dev

# For production (WAMP environment)
npm run wamp
```

The backend will run on `http://localhost:3000`

## Step 3: Frontend Configuration

### Environment Setup
1. Navigate to client directory:
```bash
cd c:\wamp64\www\vtria-erp\client
```

2. Copy environment file:
```bash
copy .env.example .env
```

3. Update `.env` file:
```env
REACT_APP_API_URL=http://localhost/api
REACT_APP_LICENSE_KEY=your-license-key-from-bytevantage
REACT_APP_APP_NAME=VTRIA ERP
REACT_APP_COMPANY_NAME=VTRIA Engineering Solutions Pvt Ltd
PUBLIC_URL=/vtria-erp
GENERATE_SOURCEMAP=false
```

### Install Dependencies
```bash
npm install
```

### Build for Production
```bash
# Build for WAMP deployment
npm run build:wamp
```

### Deploy to Apache
1. Copy build files to WAMP htdocs:
```bash
xcopy /E /I build\* c:\wamp64\www\vtria-erp-frontend\
```

## Step 4: Apache Configuration

### Update httpd.conf
Add the following to your Apache `httpd.conf` file or include the provided configuration:

```apache
# Include VTRIA ERP configuration
Include "c:/wamp64/www/vtria-erp/apache-config/httpd.conf.additions"
```

### Virtual Host Setup (Optional)
Create a virtual host for better organization:

```apache
<VirtualHost *:80>
    ServerName vtria-erp.local
    DocumentRoot "c:/wamp64/www/vtria-erp-frontend"
    
    # Proxy API requests to Node.js backend
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3000/api/
    ProxyPassReverse /api/ http://localhost:3000/api/
    
    # Serve React frontend
    <Directory "c:/wamp64/www/vtria-erp-frontend">
        AllowOverride All
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

### Enable Required Modules
Ensure these Apache modules are enabled:
- mod_rewrite
- mod_proxy
- mod_proxy_http
- mod_headers

## Step 5: Windows Service Setup (Optional)

### Create Node.js Service
Use PM2 or create a Windows service to auto-start the backend:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd c:\wamp64\www\vtria-erp\server
pm2 start npm --name "vtria-erp-backend" -- run wamp

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 6: Testing the Setup

### Backend Health Check
Visit: `http://localhost:3000/health`

Expected response:
```json
{
  "status": "OK",
  "message": "VTRIA ERP Server is running",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "version": "1.0.0"
}
```

### Frontend Access
Visit: `http://localhost/vtria-erp` or `http://vtria-erp.local`

### Default Login Credentials
- **Email**: admin@vtria.com
- **Password**: VtriaAdmin@2024

## Troubleshooting

### Common Issues

#### 1. Backend Not Starting
- Check if port 3000 is available
- Verify database connection in `.env`
- Check Node.js version compatibility

#### 2. Frontend Not Loading
- Ensure Apache is running
- Check if build files are in correct directory
- Verify `.htaccess` file is present

#### 3. API Requests Failing
- Check Apache proxy configuration
- Verify CORS settings in backend
- Ensure license key is valid

#### 4. Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials
- Ensure database exists and user has permissions

### Log Files
- **Backend Logs**: Check console output or configure Winston logging
- **Apache Logs**: `c:\wamp64\logs\apache_error.log`
- **Database Logs**: PostgreSQL log directory

## Security Considerations

### Production Deployment
1. Change default JWT secret
2. Use strong database passwords
3. Enable HTTPS with SSL certificates
4. Configure firewall rules
5. Regular security updates
6. Backup database regularly

### License Management
- Keep license key secure
- Monitor license usage limits
- Renew license before expiration

## Maintenance

### Regular Tasks
1. **Database Backup**: Schedule regular PostgreSQL backups
2. **Log Rotation**: Configure log rotation for Apache and Node.js
3. **Updates**: Keep dependencies updated
4. **Monitoring**: Monitor server performance and disk space

### Updating the Application
1. Stop the backend service
2. Pull latest code changes
3. Run database migrations if needed
4. Rebuild frontend
5. Restart services

## Support

For technical support or issues:
- Check the main README.md for detailed documentation
- Review error logs for specific issues
- Contact VTRIA Engineering Solutions support team

## License Validation

The system requires a valid license from ByteVantage:
- License validation occurs on each API request
- Invalid licenses will block system access
- License status can be checked by Directors in the admin panel

---

**VTRIA ERP v1.0.0**  
*VTRIA Engineering Solutions Pvt Ltd*
