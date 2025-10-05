# Environment Configuration Guide

## Overview
VTRIA ERP uses environment variables to configure different aspects of the application for various deployment scenarios.

## Environment Files

### 1. `.env.production` - Production Environment
**Used for:** Live production deployments on servers
**Key Features:**
- Secure database credentials
- Production-grade security settings
- Optimized performance settings
- Minimal logging for performance
- SSL and security headers enabled

### 2. `.env.local.example` - Local Development Template
**Used for:** Local development on developer machines
**Key Features:**
- Developer-friendly settings
- Verbose logging and debugging
- Hot reload and development tools
- Relaxed security for easier testing

### 3. `.env` (Docker default)
**Used for:** Docker container deployments
**Automatically created by:** `deploy-git.ps1` script during deployment

## Quick Setup Guide

### For Production Deployment:
1. **Copy the production template:**
   ```bash
   cp .env.production .env
   ```

2. **Modify these critical settings:**
   ```bash
   # Database (REQUIRED)
   DB_HOST=your-database-server
   DB_PASSWORD=your-secure-password
   
   # Security (REQUIRED)
   JWT_SECRET=generate-64-character-random-string
   SESSION_SECRET=generate-another-random-string
   
   # Email (if using email features)
   SMTP_HOST=your-smtp-server
   SMTP_USER=your-email@domain.com
   SMTP_PASSWORD=your-email-password
   
   # Domain (REQUIRED)
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

### For Local Development:
1. **Copy the development template:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update local database settings:**
   ```bash
   DB_HOST=localhost
   DB_PASSWORD=your-local-mysql-password
   ```

## Security Checklist for Production

### 🔒 **Critical - Must Change:**
- [ ] `DB_PASSWORD` - Strong database password
- [ ] `JWT_SECRET` - 64+ character random string
- [ ] `SESSION_SECRET` - Unique session secret
- [ ] `ENCRYPTION_KEY` - Exactly 32 characters
- [ ] `ALLOWED_ORIGINS` - Your actual domain

### 🔧 **Recommended - Should Configure:**
- [ ] SMTP settings for email functionality
- [ ] SSL certificate paths
- [ ] Backup directory and permissions
- [ ] Log rotation settings
- [ ] Monitoring alerts

### 📋 **Optional - Configure as Needed:**
- [ ] Redis caching
- [ ] Cloud storage (AWS S3)
- [ ] Payment gateway
- [ ] SMS service
- [ ] Third-party integrations

## Environment Variable Categories

### Database Settings
```bash
DB_HOST=db                    # Database server hostname
DB_PORT=3306                  # Database port
DB_NAME=vtria_erp            # Database name
DB_USER=vtria_user           # Database username
DB_PASSWORD=secure_password   # Database password (CHANGE THIS)
```

### Security Configuration
```bash
JWT_SECRET=your_jwt_secret                    # JWT signing secret (CHANGE THIS)
JWT_EXPIRES_IN=24h                           # JWT expiration time
SESSION_SECRET=your_session_secret           # Session secret (CHANGE THIS)
ENCRYPTION_KEY=32_character_encryption_key   # Data encryption key (CHANGE THIS)
```

### API & Network Settings
```bash
PORT=5000                           # Backend API port
FRONTEND_PORT=3000                  # Frontend port
API_BASE_URL=http://localhost:5000  # API base URL
CLIENT_URL=http://localhost:3000    # Frontend URL
```

### File Upload Configuration
```bash
UPLOAD_DIR=/var/www/vtria-erp/uploads    # Upload directory
MAX_FILE_SIZE=10485760                   # Max file size (10MB)
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf      # Allowed file extensions
```

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com          # SMTP server
SMTP_PORT=587                     # SMTP port
SMTP_USER=your-email@domain.com   # SMTP username
SMTP_PASSWORD=your-app-password   # SMTP password
EMAIL_FROM=noreply@domain.com     # From email address
```

### Logging & Monitoring
```bash
LOG_LEVEL=info                    # Logging level (error, warn, info, debug)
LOG_DIR=/var/log/vtria-erp       # Log directory
ENABLE_ACCESS_LOGS=true          # Enable access logging
ENABLE_ERROR_LOGS=true           # Enable error logging
```

### Feature Flags
```bash
ENABLE_USER_REGISTRATION=true     # Allow new user registration
ENABLE_PASSWORD_RESET=true        # Enable password reset
ENABLE_TWO_FACTOR_AUTH=false     # Enable 2FA
ENABLE_AUDIT_LOGS=true           # Enable audit logging
```

## Deployment-Specific Notes

### Windows Server (IIS/Apache)
- Set `NODE_ENV=production`
- Configure `UPLOAD_DIR` for Windows paths
- Set appropriate `CORS_ORIGIN` for your domain

### Docker Deployment
- Use the provided `docker-compose.windows.yml`
- Environment variables are automatically loaded
- Ensure `DB_HOST=db` for Docker networking

### Cloud Deployment (AWS/Azure)
- Use environment-specific credentials
- Configure cloud storage settings
- Set up proper backup strategies
- Enable monitoring and alerting

## Troubleshooting

### Common Issues:
1. **Database Connection Fails:** Check `DB_HOST`, `DB_PORT`, and credentials
2. **JWT Errors:** Ensure `JWT_SECRET` is set and consistent
3. **File Upload Fails:** Check `UPLOAD_DIR` permissions
4. **Email Not Working:** Verify SMTP settings and credentials
5. **CORS Errors:** Update `ALLOWED_ORIGINS` with correct domain

### Debug Steps:
1. Enable debug logging: `LOG_LEVEL=debug`
2. Check environment loading: `DEBUG=true`
3. Verify database connectivity
4. Test email configuration
5. Check file permissions

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use strong, unique passwords**
3. **Regularly rotate secrets and keys**
4. **Enable SSL in production**
5. **Set up proper backup strategies**
6. **Monitor and log security events**
7. **Use least-privilege access principles**
8. **Regular security audits**

## Support

For questions about environment configuration:
1. Check the logs in `/var/log/vtria-erp/`
2. Verify environment variables are loaded correctly
3. Test connectivity to external services
4. Review security settings and permissions