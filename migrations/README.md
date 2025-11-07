# Database Migrations

This directory contains SQL migration scripts for the VTRIA ERP database.

## How to Run Migrations

### On Windows (PowerShell)

```powershell
# Navigate to project directory
cd C:\vtria-erp

# Run a specific migration
docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp < migrations/add_employee_audit_columns.sql
```

### On Linux/Mac (Bash)

```bash
# Navigate to project directory
cd /path/to/vtria-erp

# Run a specific migration
docker-compose exec -T db mysql -u vtria_user --password=dev_password vtria_erp < migrations/add_employee_audit_columns.sql
```

## Migration Files

- `add_employee_audit_columns.sql` - Adds user_id, created_by, and updated_by columns to employees table

## Notes

- All migrations use `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS` to be idempotent
- Migrations are non-destructive and will not delete or modify existing data
- Always backup your database before running migrations in production
