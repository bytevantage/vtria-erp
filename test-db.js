const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    const config = {
        host: process.env.DB_HOST || 'db',
        user: process.env.DB_USER || 'vtria_user',
        password: process.env.DB_PASS || 'dev_password',
        database: process.env.DB_NAME || 'vtria_erp',
        port: parseInt(process.env.DB_PORT || '3306', 10)
    };

    console.log('Testing database connection with config:');
    console.log({
        ...config,
        password: '***'
    });

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Successfully connected to database');
        
        // Test a simple query
        const [rows] = await connection.execute('SELECT 1 as test_value');
        console.log('Test query result:', rows);
        
        // Try to get some users
        const [users] = await connection.execute('SELECT id, email, first_name, last_name FROM users LIMIT 5');
        console.log(`Found ${users.length} users in the database`);
        console.log('First 5 users:', users);
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Error details:', {
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        return false;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

testConnection().then(success => {
    console.log(success ? '✅ Test completed successfully' : '❌ Test failed');
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
