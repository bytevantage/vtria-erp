# 🚀 VTRIA ERP Production Deployment Guide

## ⚠️ Critical Steps to Avoid Authentication Errors

### 1. **Environment Configuration**

#### API Server (.env.production)
```bash
# CRITICAL: Authentication MUST be enabled in production
NODE_ENV=production
BYPASS_AUTH=false

# CRITICAL: Change these from defaults
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
DB_PASS=your-secure-database-password

# Database Configuration
DB_HOST=your-production-db-host
DB_USER=vtria_user
DB_NAME=vtria_erp_prod

# URLs
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

#### Client (.env.production)
```bash
NODE_ENV=production
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_BYPASS_AUTH=false
```

### 2. **Database Setup (REQUIRED)**

Run this SQL script on your production database:

```sql
-- Run: mysql -u root -p vtria_erp_prod < setup_admin_user.sql

USE vtria_erp_prod;

-- Create initial admin user
INSERT INTO users (
    email,
    password_hash,
    full_name,
    user_role,
    status,
    created_at,
    updated_at
) VALUES (
    'admin@vtria.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Password: Admin123!
    'System Administrator',
    'director',
    'active',
    NOW(),
    NOW()
);
```

### 3. **Production Login Credentials**

**Default Admin Account:**
- **Email:** `admin@vtria.com`
- **Password:** `Admin123!`
- **Role:** Director (Full Access)

⚠️ **SECURITY**: Change password immediately after first login!

### 4. **Deployment Commands**

#### API Server
```bash
cd api
npm install --production
NODE_ENV=production npm start
# Or with PM2: pm2 start src/server.js --name "vtria-api"
```

#### Client
```bash
cd client
npm install
npm run build
# Serve build folder with nginx/apache
```

### 5. **Creating Additional Users**

After logging in as admin, create users via:
1. Navigate to **Admin > Users**
2. Click **Add New User**
3. Set appropriate roles:
   - `director`: Full access
   - `admin`: Administrative access
   - `designer`: Estimation access
   - `technician`: Manufacturing access

### 6. **User Roles & Permissions**

- **Director**: Full system access
- **Admin**: User management, reports
- **Designer**: Estimations, quotations
- **Technician**: Manufacturing, inventory
- **User**: Basic access

### 7. **Security Best Practices**

- [ ] Change JWT_SECRET from default
- [ ] Use HTTPS for all production URLs
- [ ] Change default admin password
- [ ] Enable database SSL connections
- [ ] Set up regular database backups
- [ ] Configure firewall rules
- [ ] Enable audit logging

### 8. **Troubleshooting Production Auth Issues**

**Issue**: 401 Invalid Token
**Solutions**:
1. Ensure `BYPASS_AUTH=false` in production
2. Verify database has users table with admin user
3. Check JWT_SECRET is set and consistent
4. Confirm CORS_ORIGIN matches your domain
5. Verify API_URL in client matches your API domain

**Issue**: Cannot Login
**Solutions**:
1. Run the admin user setup SQL script
2. Check database connectivity
3. Verify password hash in database
4. Check server logs for errors

### 9. **Monitoring & Logs**

**Check these logs for auth issues:**
- API Server: `tail -f api/logs/error.log`
- Database: Check MySQL error logs
- Nginx: Check access/error logs

### 10. **Quick Production Test**

1. Visit: `https://yourdomain.com/login`
2. Login with: `admin@vtria.com` / `Admin123!`
3. Should redirect to dashboard
4. Navigate to Case Dashboard - should work without 401 errors

---

## 🚨 **Common Production Mistakes**

❌ **Leaving `BYPASS_AUTH=true` in production**
❌ **Not creating admin user in database**
❌ **Using development JWT_SECRET in production**
❌ **Wrong API_URL in client environment**
❌ **Not enabling HTTPS**
❌ **Using default passwords**

---

## ✅ **Production Ready Checklist**

- [ ] `BYPASS_AUTH=false` in API .env
- [ ] `REACT_APP_BYPASS_AUTH=false` in client .env
- [ ] Admin user created in database
- [ ] JWT_SECRET changed from default
- [ ] Database connection working
- [ ] HTTPS enabled
- [ ] Default passwords changed
- [ ] CORS configured correctly
- [ ] Firewall rules set
- [ ] Backup system in place

**Follow this guide exactly to avoid authentication issues in production!** 🔐✨