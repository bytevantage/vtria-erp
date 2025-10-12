const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'vtria_user',
    password: process.env.DB_PASS || 'dev_password',
    database: process.env.DB_NAME || 'vtria_erp',
    port: parseInt(process.env.DB_PORT || '3306', 10)
};

// Test database connection
router.get('/db-test', async (req, res) => {
    console.log('=== DATABASE CONNECTION TEST ===');
    let connection;
    try {
        // Create a new connection
        connection = await mysql.createConnection(dbConfig);
        console.log('Successfully connected to database');
        
        // Test a simple query
        const [rows] = await connection.execute('SELECT 1 as test_value');
        console.log('Test query result:', rows);
        
        // Try to get some users
        const [users] = await connection.execute('SELECT id, email, first_name, last_name FROM users LIMIT 5');
        console.log('Found users:', users);
        
        res.json({
            success: true,
            message: 'Database connection successful',
            testQuery: rows[0],
            users: users || []
        });
    } catch (error) {
        console.error('Database connection test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection test failed',
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && {
                code: error.code,
                sql: error.sql,
                sqlMessage: error.sqlMessage,
                stack: error.stack
            })
        });
    } finally {
        // Close the connection
        if (connection) {
            try {
                await connection.end();
                console.log('Database connection closed');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

module.exports = router;
