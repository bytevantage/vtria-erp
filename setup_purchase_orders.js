const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupPurchaseOrders() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'vtria_user',
    password: 'dev_password',
    database: 'vtria_erp',
    multipleStatements: true
  });

  try {
    console.log('Connected to database');
    
    // First, let's create required dependencies
    console.log('Creating basic users table if not exists...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating basic suppliers table if not exists...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        supplier_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating basic inventory_items table if not exists...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_name VARCHAR(200) NOT NULL,
        item_code VARCHAR(50) UNIQUE,
        category VARCHAR(100),
        unit VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert sample data
    console.log('Inserting sample users...');
    await connection.execute(`
      INSERT IGNORE INTO users (id, full_name, email) VALUES 
      (1, 'Admin User', 'admin@vtria.com'),
      (2, 'Manager User', 'manager@vtria.com');
    `);
    
    console.log('Inserting sample suppliers...');
    await connection.execute(`
      INSERT IGNORE INTO suppliers (id, supplier_name, company_name, contact_person, phone, email) VALUES 
      (1, 'Steel India Ltd', 'Steel India Limited', 'Rajesh Kumar', '+91-9876543210', 'rajesh@steelindia.com'),
      (2, 'Automation Parts Co', 'Automation Parts Company', 'Amit Sharma', '+91-9876543211', 'amit@autoparts.com');
    `);
    
    console.log('Inserting sample inventory items...');
    await connection.execute(`
      INSERT IGNORE INTO inventory_items (id, item_name, item_code, category, unit) VALUES 
      (1, 'Stainless Steel 304', 'SS304-6MM', 'Raw Materials', 'KG'),
      (2, 'Welding Rod 316L', 'WR316L', 'Consumables', 'PKT'),
      (3, '5KW Servo Motor', 'SM5KW', 'Motors', 'NOS');
    `);
    
    // Read and execute the purchase orders schema
    const schemaPath = path.join(__dirname, 'sql/schema/009_purchase_orders_schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing purchase orders schema...');
    await connection.query(sqlContent);
    
    console.log('Purchase orders schema setup completed successfully!');
    
    // Test the table exists
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM purchase_orders');
    console.log('Purchase orders table verified, record count:', rows[0].count);
    
  } catch (error) {
    console.error('Error setting up purchase orders:', error);
  } finally {
    await connection.end();
  }
}

setupPurchaseOrders();