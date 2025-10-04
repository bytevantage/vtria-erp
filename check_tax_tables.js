const mysql = require('mysql2/promise');

async function checkTaxTables() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'vtria_user',
            password: 'dev_password',
            database: 'vtria_erp'
        });

        console.log('Connected to database');

        // Check for tables that might have tax fields
        const tables = [
            'products',
            'sales_order_items', 
            'quotation_items',
            'estimation_items',
            'purchase_order_items',
            'tax_config'
        ];

        for (const table of tables) {
            try {
                const [exists] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
                if (exists.length > 0) {
                    console.log(`\n✅ Table: ${table}`);
                    const [columns] = await connection.execute(`DESCRIBE ${table}`);
                    const taxColumns = columns.filter(col => 
                        col.Field.toLowerCase().includes('tax') || 
                        col.Field.toLowerCase().includes('gst') ||
                        col.Field.toLowerCase().includes('cgst') ||
                        col.Field.toLowerCase().includes('sgst') ||
                        col.Field.toLowerCase().includes('igst')
                    );
                    if (taxColumns.length > 0) {
                        console.log('  Tax-related columns:');
                        taxColumns.forEach(col => {
                            console.log(`    - ${col.Field}: ${col.Type}`);
                        });
                    } else {
                        console.log('  No tax-related columns found');
                    }
                } else {
                    console.log(`❌ Table ${table} does not exist`);
                }
            } catch (error) {
                console.log(`❌ Error checking table ${table}: ${error.message}`);
            }
        }

        await connection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTaxTables();