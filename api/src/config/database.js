const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'vtria_user',
    password: process.env.DB_PASS || 'dev_password',
    database: process.env.DB_NAME || 'vtria_erp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Add connection error handling
pool.on('connection', (connection) => {
    console.log('Database connected as id ' + connection.threadId);
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
        console.log('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.log('Database connection was refused.');
    }
});

// Test database connection on startup
promisePool.execute('SELECT 1')
    .then(() => {
        console.log('Database connection successful');
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        console.log('Server will continue running with limited functionality');
    });

module.exports = promisePool;
