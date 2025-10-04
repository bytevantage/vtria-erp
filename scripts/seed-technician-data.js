const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function seedTechnicianData() {
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

    // Read the seed data file
    const seedPath = path.join(__dirname, '../simple_seed.sql');
    const seedSQL = await fs.readFile(seedPath, 'utf8');

    console.log('🌱 Seeding technician profile data...');
    
    // Execute the seed script
    const [results] = await connection.query(seedSQL);
    
    console.log('🎉 Technician profile data seeded successfully!');
    console.log('📊 Summary of seeded data:', results);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

seedTechnicianData();