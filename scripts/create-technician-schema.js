const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function createTechnicianSchema() {
  let connection;
  try {
    // Create a connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'vtria_user',
      password: process.env.DB_PASS || 'dev_password',
      database: process.env.DB_NAME || 'vtria_erp',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read the technician schema file
    const schemaPath = path.join(__dirname, '../sql/schema/031_technician_profile_enhancement.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');

    console.log('🔧 Creating technician profile schema...');
    
    // Execute the schema creation
    await connection.query(schemaSQL);
    
    console.log('🎉 Technician profile schema created successfully!');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

createTechnicianSchema();