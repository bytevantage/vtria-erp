const mysql = require('mysql2/promise');
require('dotenv').config({ path: './api/.env' });

async function checkTableStructure() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'vtria_user',
            password: process.env.DB_PASS || 'dev_password',
            database: process.env.DB_NAME || 'vtria_erp'
        });

        console.log('Connected to database');

        // Check cases table structure
        const [casesStructure] = await connection.execute('DESCRIBE cases');
        console.log('\n=== CASES TABLE STRUCTURE ===');
        casesStructure.forEach(field => {
            console.log(`${field.Field}: ${field.Type} | Null: ${field.Null} | Default: ${field.Default}`);
        });

        // Check sales_enquiries table structure
        const [enquiriesStructure] = await connection.execute('DESCRIBE sales_enquiries');
        console.log('\n=== SALES_ENQUIRIES TABLE STRUCTURE ===');
        enquiriesStructure.forEach(field => {
            console.log(`${field.Field}: ${field.Type} | Null: ${field.Null} | Default: ${field.Default}`);
        });

        // Check sample data
        const [sampleEnquiries] = await connection.execute('SELECT * FROM sales_enquiries LIMIT 3');
        console.log('\n=== SAMPLE SALES ENQUIRIES ===');
        console.log(sampleEnquiries);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkTableStructure();
