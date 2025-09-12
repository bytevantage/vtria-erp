// Simple script to test database connection
const path = require('path');

console.log('=================================================');
console.log('  VTRIA ERP Database Connection Test');
console.log('=================================================');

// Try to load the database config
try {
  console.log('Loading database configuration...');
  const { sequelize } = require('./server/src/config/database');
  
  console.log('Database type:', sequelize.options.dialect);
  console.log('Database name:', sequelize.config.database);
  console.log('Database host:', sequelize.config.host);
  console.log('Database port:', sequelize.config.port);
  
  console.log('\nAttempting to connect to database...');
  
  // Test the connection
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connection established successfully!');
      console.log('Database connection is working properly.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Unable to connect to the database:');
      console.error(err.message);
      
      if (err.original) {
        console.error('\nOriginal error:');
        console.error('Code:', err.original.code);
        console.error('Errno:', err.original.errno);
        console.error('SQLState:', err.original.sqlState);
        console.error('SQLMessage:', err.original.sqlMessage);
      }
      
      console.error('\nPossible solutions:');
      console.error('1. Make sure MySQL server is running');
      console.error('2. Check database credentials in .env file');
      console.error('3. Verify that database "vtria_erp_dev" exists');
      console.error('4. Check if MySQL user has proper permissions');
      
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Error loading database configuration:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
