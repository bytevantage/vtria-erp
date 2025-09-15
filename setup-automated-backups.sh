#!/bin/bash

# VTRIA ERP Automated Backup Setup Script
# This script sets up automated database backups using cron

SCRIPT_DIR=$(dirname "$(readlink -f "$0")" 2>/dev/null || dirname "$(readlink "$0")" 2>/dev/null || dirname "$0")
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"

echo "🔧 Setting up automated VTRIA ERP database backups..."

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create log directory
mkdir -p "$SCRIPT_DIR/logs"

# Backup schedule options
echo "Select backup frequency:"
echo "1) Daily at 2:00 AM"
echo "2) Every 12 hours"
echo "3) Every 6 hours"
echo "4) Custom schedule"
echo "5) Remove automated backups"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="Every 12 hours"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Every 6 hours"
        ;;
    4)
        echo "Enter cron schedule (e.g., '0 2 * * *' for daily at 2 AM):"
        read -p "Schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom schedule: $CRON_SCHEDULE"
        ;;
    5)
        # Remove existing cron job
        (crontab -l 2>/dev/null | grep -v "vtria-erp-backup") | crontab -
        echo "✅ Automated backups removed from cron"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Add to crontab
CRON_COMMAND="$CRON_SCHEDULE cd $SCRIPT_DIR && ./backup-database.sh >> ./logs/backup.log 2>&1 # vtria-erp-backup"

# Remove existing vtria-erp-backup cron job if exists
(crontab -l 2>/dev/null | grep -v "vtria-erp-backup") | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

echo "✅ Automated backup scheduled: $DESCRIPTION"
echo "📁 Backups will be saved to: $SCRIPT_DIR/backups/"
echo "📋 Logs will be saved to: $SCRIPT_DIR/logs/backup.log"

# Show current cron jobs
echo ""
echo "📅 Current cron jobs for VTRIA ERP:"
crontab -l | grep "vtria-erp"

echo ""
echo "To view backup logs: tail -f $SCRIPT_DIR/logs/backup.log"
echo "To test backup now: $SCRIPT_DIR/backup-database.sh"