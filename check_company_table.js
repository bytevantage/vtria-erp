const mysql = require('mysql2/promise');

async function checkCompanyTable() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'vtria_user',
            password: 'dev_password',
            database: 'vtria_erp'
        });

        console.log('Connected to database');

        // Check if table exists and its structure
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'company_config'"
        );
        
        if (tables.length > 0) {
            console.log('✅ company_config table exists');
            
            // Describe the table structure
            const [columns] = await connection.execute('DESCRIBE company_config');
            console.log('\n📋 Current table structure:');
            columns.forEach(col => {
                console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });
            
            // Check if there's any data
            const [rows] = await connection.execute('SELECT * FROM company_config LIMIT 1');
            console.log(`\n📊 Table has ${rows.length} row(s)`);
            if (rows.length > 0) {
                console.log('Sample data:', rows[0]);
            }
        } else {
            console.log('❌ company_config table does not exist');
        }

        await connection.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkCompanyTable();