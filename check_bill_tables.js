const mysql = require('mysql2/promise');

async function checkBillTables() {
    let connection;
    
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'vtria_user',
            password: process.env.DB_PASS || 'dev_password',
            database: process.env.DB_NAME || 'vtria_erp'
        };

        connection = await mysql.createConnection(dbConfig);
        
        console.log('--- Tables with "bill" in name ---');
        const [billTables] = await connection.execute("SHOW TABLES LIKE '%bill%'");
        console.table(billTables);
        
        console.log('\n--- All tables ---');
        const [allTables] = await connection.execute("SHOW TABLES");
        console.log('Total tables:', allTables.length);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkBillTables();