# VTRIA ERP Database Management Guide

## 📋 Quick Reference

### Database Information
- **Database**: MySQL 8.0
- **Host**: localhost:3306
- **Database Name**: `vtria_erp`
- **Username**: `vtria_user`
- **Password**: `dev_password`
- **Container**: `vtria-erp-db-1`

### Current Statistics
- **Total Tables**: 116
- **Total Records**: 217
- **Database Size**: ~8.64 MB
- **Latest Backup**: Available in `./backups/`

## 🛠️ Database Management Tools

### 1. Interactive Database Tools
```bash
./database-tools.sh
```
Provides a menu-driven interface for:
- Database statistics and health checks
- Table browsing and searching
- Custom query execution
- Data cleanup operations
- Sample data export

### 2. Backup Operations

#### Create Backup
```bash
./backup-database.sh
```
- Creates compressed backup with timestamp
- Includes triggers, routines, and events
- Automatic cleanup of old backups (7 days)
- Shows database statistics

#### Restore Backup
```bash
./restore-database.sh <backup_file.sql.gz>
```
- Restores from compressed backup
- Creates safety backup before restore
- Verifies restoration success

#### Setup Automated Backups
```bash
./setup-automated-backups.sh
```
Choose from:
- Daily backups at 2:00 AM
- Every 12 hours
- Every 6 hours
- Custom schedule
- Remove automation

### 3. Direct Database Access

#### MySQL Shell Access
```bash
docker exec -it vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp
```

#### Execute Single Query
```bash
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp -e "SHOW TABLES;"
```

#### GUI Tool Connection Settings
- **Host**: localhost
- **Port**: 3306
- **Database**: vtria_erp
- **Username**: vtria_user
- **Password**: dev_password

## 📊 Database Schema Overview

### Core Business Tables
```
├── Client Management
│   ├── clients (8 rows)
│   ├── client_contacts
│   └── client_communications
│
├── Sales & Estimation
│   ├── sales_enquiries (12 rows)
│   ├── estimations (11 rows)
│   ├── estimation_sections (18 rows)
│   └── quotations
│
├── Case Management
│   ├── cases (7 rows)
│   ├── case_history (20 rows)
│   ├── case_milestones
│   ├── case_activity_log
│   └── case_sla_tracking
│
├── Inventory Management
│   ├── products (8 rows)
│   ├── inventory_categories (8 rows)
│   ├── inventory_units (10 rows)
│   ├── inventory_transactions
│   └── multi_location_inventory
│
├── Manufacturing
│   ├── production_operations (8 rows)
│   ├── manufacturing_workflow
│   ├── bom_items
│   └── quality_control
│
├── Financial Management
│   ├── purchase_orders
│   ├── goods_received_notes
│   ├── delivery_challans
│   └── invoice_management
│
└── Advanced Features
    ├── AI Insights (8 tables)
    ├── Mobile Integration (7 tables)
    ├── Client Portal (4 tables)
    └── User Management (RBAC)
```

### AI & Analytics Tables
- `ai_models` - 6 AI models for different analysis types
- `ai_insights` - Generated insights with confidence scoring
- `ai_recommendations` - Actionable recommendations
- `ai_alerts` - Proactive notifications
- `ai_training_data` - Model training datasets
- `ai_predictions` - Prediction results
- `ai_model_performance` - Model accuracy tracking

### Mobile Integration Tables
- `mobile_devices` - Registered mobile devices
- `mobile_app_sessions` - Session management
- `mobile_sync_status` - Offline synchronization
- `mobile_push_notifications` - Push notification tracking
- `mobile_offline_queue` - Offline action queue
- `mobile_app_analytics` - Usage analytics

## 🔐 Security & Maintenance

### Security Best Practices
1. **Regular Backups**: Automated daily backups configured
2. **Access Control**: Limited database user permissions
3. **Connection Security**: Docker network isolation
4. **Audit Logging**: Complete activity tracking
5. **Data Encryption**: Sensitive data encrypted at rest

### Maintenance Tasks

#### Daily
- Automated backups (if configured)
- Health monitoring
- Error log review

#### Weekly
- Database optimization
- Index analysis
- Performance review

#### Monthly
- Cleanup old logs and temporary data
- Security audit
- Backup verification

### Performance Monitoring
```bash
# Check database size
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp -e "
SELECT 
    table_schema as 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema='vtria_erp';"

# Check slow queries
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password -e "
SHOW GLOBAL STATUS LIKE 'Slow_queries';"

# Check connections
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password -e "
SHOW GLOBAL STATUS LIKE 'Connections';"
```

## 🚀 Advanced Operations

### Data Migration
```bash
# Export specific tables
mysqldump -h localhost -P 3306 -u vtria_user -pdev_password vtria_erp table1 table2 > specific_tables.sql

# Import into another database
mysql -h target_host -u target_user -ptarget_pass target_db < specific_tables.sql
```

### Bulk Operations
```bash
# Load CSV data
mysql -h localhost -P 3306 -u vtria_user -pdev_password vtria_erp -e "
LOAD DATA LOCAL INFILE 'data.csv' 
INTO TABLE products 
FIELDS TERMINATED BY ',' 
ENCLOSED BY '\"' 
LINES TERMINATED BY '\n';"
```

### Database Replication Setup
For production environments, consider setting up:
- Master-slave replication
- Point-in-time recovery
- Geographic redundancy
- Load balancing

## 🔧 Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check if container is running
docker ps | grep vtria-erp-db

# Check container logs
docker logs vtria-erp-db-1

# Restart container
docker-compose restart db
```

#### Performance Issues
```bash
# Check running processes
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password -e "SHOW PROCESSLIST;"

# Analyze slow queries
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password -e "
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;"
```

#### Storage Issues
```bash
# Check database size
docker exec vtria-erp-db-1 du -sh /var/lib/mysql

# Clean old logs
docker exec vtria-erp-db-1 mysql -u vtria_user -pdev_password -e "PURGE BINARY LOGS BEFORE NOW();"
```

## 📞 Support & Recovery

### Emergency Procedures

#### Database Corruption
1. Stop the application
2. Create emergency backup
3. Run database repair
4. Verify data integrity
5. Restart application

#### Data Loss Recovery
1. Identify last known good backup
2. Calculate data loss window
3. Restore from backup
4. Apply transaction logs (if available)
5. Verify application functionality

### Backup Verification
```bash
# Test backup integrity
gunzip -t backup_file.sql.gz

# Verify backup contents
gunzip -c backup_file.sql.gz | head -50
```

### Contact Information
- **System Administrator**: Available 24/7
- **Database Support**: Emergency hotline
- **Backup Storage**: Cloud and local redundancy
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-09-13 | 2.0 | Added AI insights and mobile integration |
| 2025-09-13 | 1.5 | Enhanced case management with SLA tracking |
| 2025-09-13 | 1.0 | Initial ERP system implementation |

## 📋 Backup Inventory

Current backups are stored in `./backups/` with the naming convention:
`vtria_erp_backup_YYYYMMDD_HHMMSS.sql.gz`

Latest backup: `vtria_erp_backup_20250913_161640.sql.gz` (39K compressed)

---

*This documentation is automatically updated with each system change and backup operation.*