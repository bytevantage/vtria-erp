# VTRIA ERP - Version Management Strategy

## Branch Structure

### Main Branches
- **`main`** - Demo/Baseline version (stable, for client demos)
- **`production`** - Production-ready version (deployed at client sites)
- **`development`** - Development branch (new features, bug fixes)

### Customer-Specific Branches
- **`customer/{client-name}`** - Customer-specific enhancements
- **`feature/{feature-name}`** - New features under development
- **`hotfix/{issue-description}`** - Critical fixes for production

## Version Types

### 1. Demo Version (`main` branch)
- **Purpose**: Client demonstrations, proof of concepts
- **Features**: Core functionality with sample data
- **Deployment**: Quick setup, demo data pre-loaded
- **Updates**: Merged from development after testing
- **Version Tag**: `v{major}.{minor}-demo`

### 2. Production Version (`production` branch)
- **Purpose**: Live deployment at client sites
- **Features**: Full production-ready features
- **Deployment**: Stable, tested, with proper security
- **Updates**: Merged from development with thorough testing
- **Version Tag**: `v{major}.{minor}.{patch}`

### 3. Customer-Specific Version (`customer/{client-name}` branches)
- **Purpose**: Custom enhancements for specific clients
- **Features**: Production base + client-specific modifications
- **Deployment**: Tailored for individual client needs
- **Updates**: Merge from production, then custom changes
- **Version Tag**: `v{major}.{minor}.{patch}-{client}`

## Workflow

### Demo Version Workflow
```
development → (tested) → main (Demo)
```

### Production Version Workflow
```
development → (tested) → production → (deployed) → client sites
```

### Customer-Specific Workflow
```
production → customer/{client-name} → (custom features) → deployment
```

## Version Numbering

### Format: `MAJOR.MINOR.PATCH-SUFFIX`

- **MAJOR**: Major architectural changes
- **MINOR**: New features, significant updates
- **PATCH**: Bug fixes, minor improvements
- **SUFFIX**: `-demo`, `-{client-name}`, or none for standard production

### Examples
- `v1.0.0-demo` - First demo version
- `v1.0.0` - First production release
- `v1.1.0-clientA` - Client A's customized version
- `v1.1.1` - Production bug fix

## Deployment Strategy

### Demo Deployment
- Quick setup with Docker
- Sample data included
- Reset after each demo
- No sensitive data

### Production Deployment
- Full security setup
- Client-specific configuration
- Database migration scripts
- Backup and recovery procedures

### Customer-Specific Deployment
- Based on production version
- Custom modules and features
- Client-specific branding
- Special integrations

## Release Process

### 1. Demo Release
```bash
git checkout main
git merge development
npm version patch -m "Demo release %s"
git push origin main
git push origin --tags
```

### 2. Production Release
```bash
git checkout production
git merge development
npm version patch -m "Production release %s"
git push origin production
git push origin --tags
```

### 3. Customer Release
```bash
git checkout customer/{client-name}
git merge production
# Add custom changes
npm version patch -m "Customer {client-name} release %s"
git push origin customer/{client-name}
git push origin --tags
```

## Configuration Management

### Environment-Specific Configs
- `config/demo.json` - Demo environment settings
- `config/production.json` - Production settings
- `config/customer-{client-name}.json` - Client-specific settings

### Feature Flags
- Demo-specific features enabled/disabled
- Production features controlled by configuration
- Customer features managed per client

## Security Considerations

### Demo Version
- No real customer data
- Limited user permissions
- Reset capabilities
- Time-limited sessions

### Production Version
- Full security measures
- Client authentication
- Data encryption
- Audit logging

### Customer Version
- Inherits production security
- Additional client-specific security
- Custom access controls
- Special compliance requirements

## Maintenance

### Regular Updates
- Security patches applied to all versions
- Bug fixes propagated down the chain
- Feature updates tested thoroughly

### Version Support
- Demo: Latest version only
- Production: Current + 1 previous version
- Customer: As per client agreement

## GitHub Repository Structure

```
vtria-erp/
├── main                    # Demo branch
├── production              # Production branch
├── development             # Development branch
├── customer/client-a       # Client A customizations
├── customer/client-b       # Client B customizations
├── feature/new-feature     # Feature development
└── hotfix/critical-fix     # Production hotfixes
```

## Best Practices

1. **Always test before merging** to production
2. **Use semantic versioning** consistently
3. **Document all changes** in release notes
4. **Maintain backward compatibility** when possible
5. **Use feature flags** for gradual rollouts
6. **Keep demo version updated** with latest stable features
7. **Create release tags** for every deployment
8. **Maintain separate configs** for each version type
