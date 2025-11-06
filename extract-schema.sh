#!/bin/bash
# Extract only table structures from backup (no data)
awk '
/^DROP TABLE/ {drop=$0; next}
/^CREATE TABLE/ {create=1; print drop; drop=""}
create==1 {print}
/ENGINE=InnoDB/ {create=0; print ""}
' sql/backups/backup_20251019_122214.sql > sql/schema/00-complete_schema.sql

# Add header
sed -i '1i-- VTRIA ERP Complete Database Schema\n-- Auto-generated from production backup\n-- Contains all 181 tables\n\nUSE vtria_erp;\n' sql/schema/00-complete_schema.sql

echo "Created complete schema with all tables"
wc -l sql/schema/00-complete_schema.sql
