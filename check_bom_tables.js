const mysql = require('mysql2/promise');

async function checkBomTables() {
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
        
        // Check BOM related tables
        const [tables] = await connection.execute("SHOW TABLES LIKE '%bom%'");
        console.log('BOM-related tables:', tables);
        
        // If bom_headers exists, describe it
        if (tables.length > 0) {
            for (const table of tables) {
                const tableName = Object.values(table)[0];
                console.log(`\n--- Structure of ${tableName} ---`);
                const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                console.table(columns);
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkBomTables();