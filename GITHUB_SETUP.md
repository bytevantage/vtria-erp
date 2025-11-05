# VTRIA ERP - GitHub Version Management Setup

## Overview

This guide walks you through setting up a comprehensive GitHub-based version management system for VTRIA ERP with three main versions:
- **Demo Version** - For client demonstrations
- **Production Version** - For live client deployments  
- **Customer-Specific Versions** - Customized versions for individual clients

## 🚀 Quick Start

### 1. Initialize Repository Structure

```bash
# Navigate to your project directory
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Check current Git status
git status

# Add all new files
git add .

# Commit current changes
git commit -m "Add version management and deployment infrastructure"

# Push to origin
git push origin main
```

### 2. Create Main Branches

```bash
# Create production branch
git checkout -b production
git push -u origin production

# Create development branch
git checkout -b development
git push -u origin development

# Switch back to main (demo)
git checkout main
```

### 3. Set Up GitHub Workflows

The workflows are already created in `.github/workflows/`:
- `release-demo.yml` - Automated demo releases
- `release-production.yml` - Production releases with security checks

### 4. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
DOCKER_REGISTRY=your-registry.com
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password
```

## 📋 Branch Strategy

```
main                    # Demo version (stable, for demos)
│
├── development         # Development branch (new features)
│   └── feature/*       # Feature branches
│
├── production          # Production version (deployed to clients)
│   └── customer/*      # Customer-specific branches
│
└── hotfix/*           # Emergency fixes
```

## 🏷️ Version Management

### Version Numbering Format: `MAJOR.MINOR.PATCH-SUFFIX`

- `v1.0.0-demo` - Demo version
- `v1.0.0` - Production version
- `v1.0.0-clientA` - Client A's custom version

### Version Management Commands

```bash
# Check current version status
npm run version

# Create demo release
npm run release:demo
npm run release:demo -- minor  # bump minor version
npm run release:demo -- major  # bump major version

# Create production release
npm run release:production

# Create customer branch
npm run create-customer -- acme-corp

# Create customer release
npm run release:customer -- acme-corp
```

## 🚢 Deployment Commands

### Demo Deployment

```bash
# Deploy demo version (requires sudo)
sudo npm run deploy:demo

# Access at: http://localhost:3000
# Username: demo@vtria.com
# Password: Demo@123456
```

### Production Deployment

```bash
# Deploy production version (requires sudo)
sudo npm run deploy:production

# Configure environment first
# Edit /opt/vtria-erp/.env with your settings

# Access at: https://localhost
```

## 🔄 Daily Workflow

### Development Work

```bash
# Start development
git checkout development
npm run start:dev

# Make changes...

# Commit and push
git add .
git commit -m "Add new feature"
git push origin development

# Create demo release when ready
npm run release:demo
```

### Production Deployment

```bash
# Merge development to production
git checkout production
git merge development

# Create production release
npm run release:production

# Deploy to client site
sudo npm run deploy:production
```

### Customer Customization

```bash
# Create customer branch
npm run create-customer -- acme-corp

# Switch to customer branch
git checkout customer/acme-corp

# Make custom changes...

# Create customer release
npm run release:customer -- acme-corp

# Deploy to customer
sudo DEPLOY_DIR=/opt/acme-corp CLIENT_NAME=acme-corp npm run deploy:production
```

## 🛠️ Advanced Configuration

### Environment-Specific Configs

Edit configuration files in `config/`:

- `demo.json` - Demo settings
- `production.json` - Production settings
- `customer-{client}.json` - Client-specific settings

### Custom Deployment Locations

```bash
# Deploy to custom directory
sudo DEPLOY_DIR=/opt/client-erp npm run deploy:production

# Deploy with custom ports
sudo HTTP_PORT=8080 HTTPS_PORT=8443 npm run deploy:production

# Deploy with custom domain
sudo CLIENT_NAME=myclient npm run deploy:production
```

## 🔒 Security Considerations

### Demo Version
- Limited user access (max 5 users)
- 2-hour session timeout
- No sensitive data
- Reset capabilities

### Production Version
- Full security features
- SSL/TLS encryption
- Two-factor authentication
- Audit logging
- Rate limiting

### Customer Versions
- Inherits production security
- Custom access controls
- Client-specific configurations

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl http://localhost:3000/health
curl https://localhost/health

# Check system status
npm run status
```

### Backup and Recovery

```bash
# Production backups are automated
# Manual backup:
docker exec vtria-erp-db mysqldump -u root -p --all-databases > backup.sql

# Restore:
docker exec -i vtria-erp-db mysql -u root -p < backup.sql
```

### Log Management

```bash
# View application logs
npm run logs

# View specific service logs
docker-compose logs -f vtria-erp
docker-compose logs -f nginx
docker-compose logs -f db
```

## 🌐 GitHub Actions

### Automated Releases

- **Demo releases**: Triggered on push to `main` branch
- **Production releases**: Triggered on push to `production` branch
- **Security scans**: Run automatically for production releases

### Manual Releases

1. Go to Actions tab in GitHub
2. Select "Demo Release" or "Production Release"
3. Click "Run workflow"
4. Choose version bump type
5. Run workflow

## 📝 Best Practices

### Development
1. Always work on `development` branch
2. Create feature branches for new features
3. Test thoroughly before merging
4. Use semantic versioning

### Releases
1. Test demo releases before production
2. Create customer branches from production
3. Tag all releases with version numbers
4. Document changes in release notes

### Deployment
1. Always backup before deployment
2. Test in staging environment first
3. Monitor after deployment
4. Keep rollback plan ready

### Security
1. Change default passwords
2. Use SSL certificates in production
3. Enable audit logging
4. Regular security updates

## 🆘 Troubleshooting

### Common Issues

**"Port already in use"**
```bash
npm run stop
npm start
```

**"Docker image not found"**
```bash
docker pull vtria-erp:latest
npm run deploy:production
```

**"Database connection failed"**
```bash
# Check database status
docker-compose logs db

# Restart database
docker-compose restart db
```

**"SSL certificate error"**
```bash
# Generate new certificates
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/vtria-erp.key \
  -out /etc/ssl/certs/vtria-erp.crt
```

### Get Help

- Check logs: `npm run logs`
- Verify status: `npm run status`
- Review documentation: `MANAGEMENT.md`
- Contact support: srbhandary@bytevantage.in

## 📚 Additional Resources

- [VERSIONS.md](./VERSIONS.md) - Detailed version strategy
- [MANAGEMENT.md](./MANAGEMENT.md) - System management guide
- [API/SETUP.md](./api/SETUP.md) - Initial setup instructions
- [GitHub Repository](https://github.com/your-org/vtria-erp) - Source code

---

## 🎯 Next Steps

1. **Set up GitHub repository** with the three main branches
2. **Configure GitHub Actions** with your registry credentials
3. **Test demo deployment** to verify setup
4. **Create first production release** for a client
5. **Set up monitoring** and backup procedures
6. **Document client-specific** customizations

This setup provides a robust, scalable foundation for managing multiple VTRIA ERP deployments across different clients while maintaining version control and security standards.
