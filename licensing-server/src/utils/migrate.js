/**
 * Database Migration Script for ByteVantage Licensing Server
 * Runs the database schema and seed data
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const logger = require('./logger');

/**
 * Run database migrations
 */
async function migrate() {
  try {
    logger.info('Starting database migration...');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found: ' + schemaPath);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    logger.info('Executing database schema...');
    await db.query(schemaSQL);
    
    logger.info('Database schema created successfully');

    // Run seed data
    await seed();

    logger.info('Database migration completed successfully');

  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

/**
 * Seed initial data
 */
async function seed() {
  try {
    logger.info('Seeding initial data...');

    // Create default product
    const productResult = await db.query(`
      INSERT INTO products (product_name, product_code, description, version, features, pricing_model, base_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (product_code) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      'VTRIA ERP System',
      'VTRIA',
      'Complete ERP solution for engineering companies',
      '1.0.0',
      JSON.stringify({
        users: { max: 100, default: 10 },
        locations: { max: 10, default: 3 },
        modules: ['cases', 'tickets', 'stock', 'documents', 'reports'],
        storage: { max_gb: 50, default_gb: 10 },
        api_calls: { max_per_hour: 10000, default_per_hour: 1000 }
      }),
      'per_user',
      99.00
    ]);

    // Create default client
    const clientResult = await db.query(`
      INSERT INTO clients (client_name, client_code, client_type, contact_person, email, company, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        client_name = EXCLUDED.client_name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [
      'VTRIA Engineering Solutions',
      'VTRIA01',
      'enterprise',
      'System Administrator',
      'admin@vtria.com',
      'VTRIA Engineering Solutions Pvt Ltd',
      'India'
    ]);

    // Create master API key
    const { generateApiKey } = require('./licenseUtils');
    const masterApiKey = generateApiKey('master-key');

    await db.query(`
      INSERT INTO api_keys (key_name, api_key, permissions, rate_limit, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (api_key) DO NOTHING
    `, [
      'Master API Key',
      masterApiKey,
      JSON.stringify(['*']), // All permissions
      10000, // High rate limit
      true
    ]);

    logger.info('Master API Key created:', masterApiKey);
    logger.info('Initial data seeded successfully');

  } catch (error) {
    logger.error('Data seeding failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate, seed };
