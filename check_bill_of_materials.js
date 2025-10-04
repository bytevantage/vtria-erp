const mysql = require('mysql2/promise');

async function checkBillOfMaterials() {
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
        
        console.log('--- Structure of bill_of_materials ---');
        const [columns] = await connection.execute('DESCRIBE bill_of_materials');
        console.table(columns);
        
        console.log('\n--- Data in bill_of_materials ---');
        const [data] = await connection.execute('SELECT * FROM bill_of_materials');
        console.table(data);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkBillOfMaterials();