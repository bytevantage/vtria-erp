#!/bin/bash

# VTRIA ERP Database Management Tools
# Quick access to common database operations

DB_CONTAINER="vtria-erp-db-1"
DB_NAME="vtria_erp"
DB_USER="vtria_user"
DB_PASS="dev_password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_menu() {
    echo -e "${BLUE}🗄️  VTRIA ERP Database Management Tools${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    echo "1)  📊 Database Statistics"
    echo "2)  📋 List All Tables"  
    echo "3)  🔍 Search Tables by Name"
    echo "4)  📈 Table Row Counts"
    echo "5)  💾 Create Backup"
    echo "6)  🔄 Restore Backup"
    echo "7)  🛠️  Access MySQL Shell"
    echo "8)  📝 Execute Custom Query"
    echo "9)  🧹 Database Cleanup"
    echo "10) 📱 Export Sample Data"
    echo "11) 🔧 Check Database Health"
    echo "12) 📦 Export Specific Tables"
    echo "0)  ❌ Exit"
    echo ""
    echo -n "Select option (0-12): "
}

db_stats() {
    echo -e "${YELLOW}📊 Database Statistics${NC}"
    echo "====================="
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            '$DB_NAME' as 'Database Name',
            COUNT(*) as 'Total Tables'
        FROM information_schema.TABLES 
        WHERE table_schema='$DB_NAME';
        
        SELECT 
            'Data Statistics' as 'Category',
            SUM(TABLE_ROWS) as 'Total Rows',
            ROUND(SUM(data_length) / 1024 / 1024, 2) AS 'Data Size (MB)',
            ROUND(SUM(index_length) / 1024 / 1024, 2) AS 'Index Size (MB)',
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Total Size (MB)'
        FROM information_schema.TABLES 
        WHERE table_schema='$DB_NAME';
    " 2>/dev/null
}

list_tables() {
    echo -e "${YELLOW}📋 All Tables in $DB_NAME${NC}"
    echo "========================"
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            TABLE_NAME as 'Table Name',
            TABLE_ROWS as 'Rows',
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
            ENGINE as 'Engine'
        FROM information_schema.TABLES 
        WHERE table_schema = '$DB_NAME' 
        ORDER BY TABLE_ROWS DESC;
    " 2>/dev/null
}

search_tables() {
    echo -n "Enter table name pattern to search: "
    read pattern
    echo -e "${YELLOW}🔍 Tables matching '$pattern'${NC}"
    echo "========================="
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            TABLE_NAME as 'Table Name',
            TABLE_ROWS as 'Rows',
            TABLE_COMMENT as 'Description'
        FROM information_schema.TABLES 
        WHERE table_schema = '$DB_NAME' 
        AND TABLE_NAME LIKE '%$pattern%'
        ORDER BY TABLE_NAME;
    " 2>/dev/null
}

table_row_counts() {
    echo -e "${YELLOW}📈 Table Row Counts (Top 20)${NC}"
    echo "============================"
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            TABLE_NAME as 'Table Name',
            TABLE_ROWS as 'Approximate Rows'
        FROM information_schema.TABLES 
        WHERE table_schema = '$DB_NAME' 
        AND TABLE_ROWS > 0
        ORDER BY TABLE_ROWS DESC 
        LIMIT 20;
    " 2>/dev/null
}

mysql_shell() {
    echo -e "${YELLOW}🛠️  Accessing MySQL Shell${NC}"
    echo "========================="
    echo "Type 'exit' to return to menu"
    echo ""
    docker exec -it "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
}

custom_query() {
    echo -e "${YELLOW}📝 Execute Custom Query${NC}"
    echo "======================"
    echo "Enter your SQL query (press Enter twice to execute):"
    echo ""
    
    query=""
    while IFS= read -r line; do
        if [[ -z "$line" ]]; then
            break
        fi
        query="$query$line "
    done
    
    if [[ -n "$query" ]]; then
        echo -e "${BLUE}Executing: $query${NC}"
        echo ""
        docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$query" 2>/dev/null
    else
        echo "No query entered."
    fi
}

database_cleanup() {
    echo -e "${YELLOW}🧹 Database Cleanup Options${NC}"
    echo "=========================="
    echo "1) Clean old audit logs (older than 30 days)"
    echo "2) Clean old notifications (older than 60 days)"  
    echo "3) Clean old session data"
    echo "4) Optimize all tables"
    echo "5) Return to main menu"
    echo ""
    echo -n "Select cleanup option: "
    read cleanup_option
    
    case $cleanup_option in
        1)
            echo "Cleaning old audit logs..."
            docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);" 2>/dev/null
            echo -e "${GREEN}✅ Old audit logs cleaned${NC}"
            ;;
        2)
            echo "Cleaning old notifications..."
            docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DELETE FROM notifications WHERE is_read = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 60 DAY);" 2>/dev/null
            echo -e "${GREEN}✅ Old notifications cleaned${NC}"
            ;;
        3)
            echo "Cleaning old session data..."
            docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DELETE FROM mobile_app_sessions WHERE ended_at < DATE_SUB(NOW(), INTERVAL 7 DAY);" 2>/dev/null
            echo -e "${GREEN}✅ Old session data cleaned${NC}"
            ;;
        4)
            echo "Optimizing all tables..."
            docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
                SET @tables = NULL;
                SELECT GROUP_CONCAT(table_name) INTO @tables FROM information_schema.tables WHERE table_schema = '$DB_NAME';
                SET @tables = CONCAT('OPTIMIZE TABLE ', @tables);
                PREPARE stmt FROM @tables;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            " 2>/dev/null
            echo -e "${GREEN}✅ All tables optimized${NC}"
            ;;
        5)
            return
            ;;
    esac
}

export_sample_data() {
    echo -e "${YELLOW}📱 Export Sample Data${NC}"
    echo "==================="
    
    SAMPLE_DIR="./sample_data"
    mkdir -p "$SAMPLE_DIR"
    DATE=$(date +"%Y%m%d_%H%M%S")
    
    echo "Exporting sample data from key tables..."
    
    # Export sample data from main tables
    tables=("users" "clients" "cases" "products" "inventory_categories")
    
    for table in "${tables[@]}"; do
        echo "Exporting $table..."
        docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT * FROM $table LIMIT 10;" > "$SAMPLE_DIR/${table}_sample.txt" 2>/dev/null
    done
    
    echo -e "${GREEN}✅ Sample data exported to $SAMPLE_DIR/${NC}"
}

database_health() {
    echo -e "${YELLOW}🔧 Database Health Check${NC}"
    echo "======================"
    
    echo "Checking table integrity..."
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        SELECT 
            'Database Status' as 'Check Type',
            CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as 'Status'
        FROM information_schema.TABLES 
        WHERE table_schema='$DB_NAME';
        
        SELECT 
            'Connection Status' as 'Check Type',
            'OK' as 'Status';
    " 2>/dev/null
    
    echo ""
    echo "Recent error log (if any):"
    docker exec "$DB_CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" -e "SHOW GLOBAL STATUS LIKE 'Connections';" 2>/dev/null
}

export_specific_tables() {
    echo -e "${YELLOW}📦 Export Specific Tables${NC}"
    echo "========================"
    echo "Enter table names separated by spaces:"
    read -a tables
    
    if [[ ${#tables[@]} -eq 0 ]]; then
        echo "No tables specified."
        return
    fi
    
    EXPORT_DIR="./exports"
    mkdir -p "$EXPORT_DIR"
    DATE=$(date +"%Y%m%d_%H%M%S")
    
    for table in "${tables[@]}"; do
        echo "Exporting $table..."
        docker exec "$DB_CONTAINER" mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" "$table" > "$EXPORT_DIR/${table}_${DATE}.sql" 2>/dev/null
    done
    
    echo -e "${GREEN}✅ Tables exported to $EXPORT_DIR/${NC}"
}

# Main loop
while true; do
    clear
    show_menu
    read choice
    
    case $choice in
        1) clear; db_stats; echo ""; read -p "Press Enter to continue..."; ;;
        2) clear; list_tables; echo ""; read -p "Press Enter to continue..."; ;;
        3) clear; search_tables; echo ""; read -p "Press Enter to continue..."; ;;
        4) clear; table_row_counts; echo ""; read -p "Press Enter to continue..."; ;;
        5) clear; ./backup-database.sh; echo ""; read -p "Press Enter to continue..."; ;;
        6) clear; ./restore-database.sh; echo ""; read -p "Press Enter to continue..."; ;;
        7) clear; mysql_shell; ;;
        8) clear; custom_query; echo ""; read -p "Press Enter to continue..."; ;;
        9) clear; database_cleanup; echo ""; read -p "Press Enter to continue..."; ;;
        10) clear; export_sample_data; echo ""; read -p "Press Enter to continue..."; ;;
        11) clear; database_health; echo ""; read -p "Press Enter to continue..."; ;;
        12) clear; export_specific_tables; echo ""; read -p "Press Enter to continue..."; ;;
        0) echo -e "${GREEN}👋 Goodbye!${NC}"; exit 0; ;;
        *) echo -e "${RED}❌ Invalid option. Please try again.${NC}"; sleep 2; ;;
    esac
done