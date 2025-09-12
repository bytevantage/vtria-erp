/**
 * Database Configuration for ByteVantage Licensing Server
 * PostgreSQL connection and query utilities
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bytevantage_licenses',
  user: process.env.DB_USER || 'bytevantage_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle pool connection
pool.on('connect', (client) => {
  logger.debug('New client connected to database');
});

// Handle pool disconnection
pool.on('remove', (client) => {
  logger.debug('Client removed from database pool');
});

/**
 * Execute a database query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params) {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Database query error', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      error: error.message,
      params: params
    });
    
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Database client
 */
async function getClient() {
  try {
    const client = await pool.connect();
    
    // Add query method to client for consistency
    const originalQuery = client.query;
    client.query = async function(text, params) {
      const start = Date.now();
      
      try {
        const result = await originalQuery.call(this, text, params);
        const duration = Date.now() - start;
        
        logger.debug('Transaction query executed', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        logger.error('Transaction query error', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          error: error.message
        });
        
        throw error;
      }
    };
    
    return client;
  } catch (error) {
    logger.error('Failed to get database client', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Function containing transaction logic
 * @returns {Promise} Transaction result
 */
async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back due to error', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    logger.info('Database connection successful', {
      current_time: result.rows[0].current_time,
      pg_version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

/**
 * Close all database connections
 * @returns {Promise} Close result
 */
async function close() {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', error);
    throw error;
  }
}

/**
 * Get pool statistics
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

// Initialize database connection on module load
(async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      logger.error('Failed to establish database connection on startup');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Database initialization error', error);
    process.exit(1);
  }
})();

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  close,
  getPoolStats,
  pool
};
