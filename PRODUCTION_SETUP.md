# VTRIA ERP - Production Deployment Guide

## 🚀 Production Deployment Steps

### Phase 1: Database Setup
1. Create production database
2. Run schema creation scripts
3. Create initial admin user
4. Set up database backup strategy

### Phase 2: Security Configuration
1. Remove BYPASS_AUTH
2. Remove demo-token fallbacks
3. Set secure JWT secrets
4. Configure proper CORS

### Phase 3: Environment Configuration
1. Set production environment variables
2. Configure HTTPS/SSL
3. Set up proper logging
4. Configure monitoring

### Phase 4: Application Updates
1. Add login route protection
2. Remove development bypasses
3. Optimize performance settings
4. Add error tracking

### Phase 5: Deployment
1. Build production Docker images
2. Deploy to production environment
3. Set up CI/CD pipeline
4. Configure monitoring and alerts

## 🔑 Initial Admin User Creation

After deployment, create the first admin user using the API:

```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@your-company.com",
    "password": "SecurePassword123!",
    "full_name": "System Administrator",
    "user_role": "director"
  }'
```

## ⚠️ Critical Production Changes

1. **Remove BYPASS_AUTH=true**
2. **Remove all demo-token references**
3. **Set secure JWT_SECRET**
4. **Add login route protection**
5. **Configure proper database credentials**
6. **Set up HTTPS**
7. **Add rate limiting**
8. **Configure error monitoring**

## 🛡️ Security Checklist

- [ ] BYPASS_AUTH removed
- [ ] demo-token references removed
- [ ] Strong JWT secret set
- [ ] Database passwords changed
- [ ] HTTPS configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error monitoring set up
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured