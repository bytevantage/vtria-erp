const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'vtria_user',
    password: process.env.DB_PASS || 'dev_password',
    database: process.env.DB_NAME || 'vtria_erp',
    waitForConnections: true,
    connectionLimit: 50, // Increased from 10 for production workload
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Connection timeouts
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 60000
});

const promisePool = pool.promise();

// Add connection monitoring
pool.on('connection', (connection) => {
    console.log(`[DB Pool] Connection ${connection.threadId} acquired`);
});

pool.on('acquire', (connection) => {
    console.log(`[DB Pool] Connection ${connection.threadId} acquired from pool`);
});

pool.on('release', (connection) => {
    console.log(`[DB Pool] Connection ${connection.threadId} released back to pool`);
});

pool.on('enqueue', () => {
    console.warn('[DB Pool] Waiting for available connection (pool exhausted)');
});

pool.on('error', (err) => {
    console.error('[DB Pool] Error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('[DB Pool] Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('[DB Pool] Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.error('[DB Pool] Database connection was refused.');
    }
});

// Test database connection on startup
promisePool.execute('SELECT 1')
    .then(() => {
        console.log('✅ Database connection successful');
        console.log(`📊 Connection pool configured: ${pool.config.connectionLimit} max connections`);
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Server will continue running with limited functionality');
    });

// Export pool stats function for monitoring
promisePool.getPoolStats = () => {
    return {
        connectionLimit: pool.config.connectionLimit,
        activeConnections: pool._allConnections ? pool._allConnections.length : 0,
        freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
        queueLength: pool._connectionQueue ? pool._connectionQueue.length : 0
    };
};

module.exports = promisePool;
