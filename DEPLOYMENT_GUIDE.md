# 🚀 VTRIA ERP - Deployment Guide

**Last Updated:** October 19, 2025  
**Version:** 2.0 - With Ticketing System & Enhanced Features

---

## 📋 What's New in This Release

✅ **Complete Ticketing System** - Customer support tickets (VESPL/TK/2526/XXX)  
✅ **Queue-Based Workflow** - Engineers can pick/reject cases  
✅ **Case Aging** - Color-coded age indicators (Green/Yellow/Red)  
✅ **Case Closure** - Close cases at any phase with mandatory comments  
✅ **Enhanced Case Notes** - Append-only with auto date/time/user prefix  
✅ **Bug Fixes** - Document number race condition fixed  

---

## 🎯 Deployment Options

### **Option 1: Automated Deployment (Recommended)** ⭐

For existing Docker installation with data preservation:

```bash
# Run the automated deployment script
./deploy-new-schemas.sh
```

**This script will:**
1. ✅ Backup your current database
2. ✅ Deploy ticketing system schema
3. ✅ Deploy case notes enhancements
4. ✅ Verify all tables and triggers
5. ✅ Show you the results

**Then restart the API:**
```bash
docker-compose restart api
```

---

### **Option 2: Fresh Docker Installation**

For new installations or if you want to rebuild everything:

```bash
# Stop and remove existing containers (WARNING: Deletes data!)
docker-compose down -v

# Start fresh with all new schemas
docker-compose up -d

# Wait for database to initialize (30-60 seconds)
docker-compose logs -f db

# Verify deployment
./verify-deployment.sh
```

**New schemas will auto-load from:**
- `sql/schema/06-ticketing-system.sql` ✅
- `sql/schema/07-case-notes-enhancement.sql` ✅

---

### **Option 3: Manual Deployment**

If you prefer manual control:

#### Step 1: Check if Docker is running
```bash
docker ps
```

#### Step 2: Find your database container
```bash
docker ps --filter "name=db"
# Note the container name (usually vtria-erp-db-1 or similar)
```

#### Step 3: Deploy ticketing system
```bash
docker exec -i <container-name> mysql -uvtria_user -pdev_password vtria_erp < sql/create_ticketing_system.sql
```

#### Step 4: Deploy case notes enhancements
```bash
docker exec -i <container-name> mysql -uvtria_user -pdev_password vtria_erp < sql/enhance_case_notes.sql
```

#### Step 5: Restart API
```bash
docker-compose restart api
```

---

## 🔍 Verification

After deployment, verify everything is working:

```bash
# Run verification script
./verify-deployment.sh
```

**Or manually check:**

```bash
# Connect to database
docker exec -it <container-name> mysql -uvtria_user -pdev_password vtria_erp

# Check ticketing tables
SHOW TABLES LIKE 'ticket%';

# Check document sequences
SELECT * FROM document_sequences WHERE document_type = 'TK';

# Check triggers
SHOW TRIGGERS LIKE 'case_notes';

# Exit MySQL
exit
```

---

## 🧪 Testing the New Features

### 1. Test Ticketing System

```bash
# Create a test ticket
curl -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Support Ticket",
    "description": "Testing the new ticketing system",
    "customer_id": 1,
    "category": "support",
    "priority": "medium"
  }'

# List all tickets
curl http://localhost:3001/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get ticket queues
curl http://localhost:3001/api/tickets/queues/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Queue Workflow

```bash
# Pick case from queue
curl -X POST http://localhost:3001/api/case-management/assignments/1/pick \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reject case
curl -X POST http://localhost:3001/api/case-management/assignments/1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rejection_reason": "Need more information from customer"
  }'
```

### 3. Test Case Closure

```bash
# Close case at any phase
curl -X POST http://localhost:3001/api/case-management/VESPL-C-2526-001/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "closure_reason": "Customer cancelled",
    "closure_comments": "Customer decided to postpone the project",
    "closure_category": "Customer Cancellation"
  }'
```

---

## 🐛 Troubleshooting

### Issue: "Database container not found"

**Solution:**
```bash
# Start Docker containers
docker-compose up -d

# Wait 30 seconds for MySQL to initialize
sleep 30

# Retry deployment
./deploy-new-schemas.sh
```

### Issue: "Access denied for user"

**Solution:**
```bash
# Check database credentials in docker-compose.yml
cat docker-compose.yml | grep -A 5 "MYSQL_"

# Ensure credentials match in deployment script
# Default: vtria_user / dev_password
```

### Issue: "Table already exists"

**Solution:**
```bash
# This is normal if you run deployment twice
# The script will show warnings but continue

# To start fresh:
docker-compose down -v
docker-compose up -d
```

### Issue: "API not picking up new routes"

**Solution:**
```bash
# Restart the API container
docker-compose restart api

# Check logs for errors
docker-compose logs -f api

# Verify server.js has ticket routes registered
grep "ticketRoutes" api/src/server.js
```

### Issue: "Port 3306 already in use"

**Solution:**
```bash
# Check if local MySQL is running
ps aux | grep mysql

# Stop local MySQL
sudo service mysql stop  # Linux
brew services stop mysql  # Mac

# Or change port in docker-compose.yml
# ports: - "3307:3306"
```

---

## 📊 Database Schema Overview

### New Tables Created

| Table | Records | Purpose |
|-------|---------|---------|
| `tickets` | 0 | Main ticket records |
| `ticket_queues` | 4 | Queue management |
| `ticket_notes` | 0 | Append-only notes |
| `ticket_parts` | 0 | Parts used in resolution |
| `ticket_assignments` | 0 | Assignment history |
| `ticket_status_history` | 0 | Status audit trail |
| `ticket_attachments` | 0 | File attachments |

### Enhanced Tables

| Table | Enhancement |
|-------|-------------|
| `case_notes` | Added triggers for immutability |
| `cases` | Added age color calculation |
| `document_sequences` | Added TK type for tickets |

---

## 🔐 Security Notes

### Default Credentials (CHANGE IN PRODUCTION!)

```
MySQL Root: rootpassword
MySQL User: vtria_user
MySQL Pass: dev_password
JWT Secret: vtria_production_secret_key_2025_secure_random_string_for_jwt_signing
```

### Recommended Production Setup

1. **Change Database Passwords:**
```bash
# Edit docker-compose.yml
# Update MYSQL_ROOT_PASSWORD
# Update MYSQL_PASSWORD
# Update environment variables in .env.production
```

2. **Generate New JWT Secret:**
```bash
# Generate secure random string
openssl rand -base64 64

# Update in docker-compose.yml and .env.production
```

3. **Enable SSL/TLS:**
```bash
# Configure nginx with SSL certificates
# Update API to use HTTPS
```

---

## 📝 Rollback Plan

If something goes wrong, you can rollback:

### Quick Rollback

```bash
# Stop containers
docker-compose down

# Restore from backup
docker-compose up -d db
sleep 30

# Restore backup (replace with your backup file)
docker exec -i <container-name> mysql -uvtria_user -pdev_password vtria_erp < sql/backups/backup_YYYYMMDD_HHMMSS.sql

# Restart all services
docker-compose up -d
```

### Full Rollback

```bash
# Remove new schema files
rm sql/schema/06-ticketing-system.sql
rm sql/schema/07-case-notes-enhancement.sql

# Rebuild from clean state
docker-compose down -v
docker-compose up -d
```

---

## 🎯 Post-Deployment Checklist

- [ ] Database schemas deployed successfully
- [ ] All 7 ticketing tables exist
- [ ] Document sequence for TK created
- [ ] Case notes triggers created
- [ ] API server restarted
- [ ] No errors in API logs
- [ ] Test ticket creation works
- [ ] Test queue pick/reject works
- [ ] Test case closure works
- [ ] Backup created and stored safely
- [ ] Default admin user can login
- [ ] All existing features still work

---

## 📞 Support

For issues or questions:
1. Check `IMPLEMENTATION_COMPLETE_SUMMARY.md` for feature details
2. Review `COMPREHENSIVE_SPEC_GAP_ANALYSIS.md` for architecture
3. Check Docker logs: `docker-compose logs -f`
4. Verify database: `./verify-deployment.sh`

---

## 🎉 Success!

Once deployment is complete, you'll have:

✅ **11 new API endpoints** for ticketing  
✅ **3 enhanced endpoints** for case management  
✅ **7 new database tables**  
✅ **Queue-based workflow** for engineers  
✅ **Visual age indicators** on all cases  
✅ **Flexible case closure** at any phase  
✅ **Immutable case notes** with auto-prefix  

**Ready to revolutionize your manufacturing ERP workflow!** 🚀
