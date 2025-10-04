const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
// Simple console logger for migration
const logger = {
    info: (msg) => console.log(`INFO: ${msg}`),
    error: (msg) => console.error(`ERROR: ${msg}`)
};

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true
    });

    try {
        logger.info('Starting database migration...');

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

        // Get all SQL files from schema directory
        const schemaDir = path.join(__dirname, '../../../sql/schema');
        const files = await fs.readdir(schemaDir);
        const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

        // Execute each SQL file in order
        for (const file of sqlFiles) {
            const filePath = path.join(schemaDir, file);
            const sql = await fs.readFile(filePath, 'utf8');

            logger.info(`Executing ${file}...`);
            await connection.query(sql);
            logger.info(`Completed ${file}`);
        }

        logger.info('Database migration completed successfully');

    } catch (error) {
        console.error('Full error details:', error);
        logger.error('Error during migration:', error.message || 'Unknown error');
        if (error.stack) logger.error('Stack:', error.stack);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration if this file is run directly
if (require.main === module) {
    require('dotenv').config();
    migrate().catch(error => {
        logger.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = migrate;
