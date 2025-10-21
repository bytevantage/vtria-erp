# Database Backups

This directory stores automated database backups created during deployment.

**Format:** `backup_YYYYMMDD_HHMMSS.sql`

## Restore from Backup

```bash
# List available backups
ls -lh

# Restore a specific backup
docker exec -i <container-name> mysql -uvtria_user -pdev_password vtria_erp < backup_YYYYMMDD_HHMMSS.sql
```

## Automatic Backups

Backups are automatically created when you run `./deploy-new-schemas.sh`
