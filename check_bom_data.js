const mysql = require('mysql2/promise');

async function checkBomData() {
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
        
        console.log('--- BOM Headers Data ---');
        const [headers] = await connection.execute('SELECT * FROM bom_headers');
        console.table(headers);
        
        console.log('\n--- BOM Components Data ---');
        const [components] = await connection.execute('SELECT * FROM bom_components');
        console.table(components);
        
        console.log('\n--- BOM Items Data ---');
        const [items] = await connection.execute('SELECT * FROM bom_items');
        console.table(items);
        
        console.log('\n--- BOM Operations Data ---');
        const [operations] = await connection.execute('SELECT * FROM bom_operations');
        console.table(operations);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkBomData();