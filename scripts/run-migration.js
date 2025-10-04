const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  try {
    // Create a connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vtria_erp',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../sql/migrations/20240918_enhance_hr_schema.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('🚀 Running migration...');
    
    // Execute the migration
    await connection.query(migrationSQL);
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();
