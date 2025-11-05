const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    // First connect without specifying database to create it
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'vtria_user',
      password: process.env.DB_PASS || 'dev_password'
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS vtria_erp');
    console.log('Database vtria_erp created or already exists');

    // Switch to the database
    await connection.query('USE vtria_erp');

    // Read and execute the backup SQL file
    const backupPath = path.join(__dirname, 'sql', 'backups', 'backup_20251019_122214.sql');
    if (fs.existsSync(backupPath)) {
      console.log('Found backup file, restoring schema...');
      const sqlContent = fs.readFileSync(backupPath, 'utf8');

      // Split the SQL file into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.execute(statement);
          } catch (err) {
            // Ignore errors for statements that might already exist
            console.log('Skipping statement (might already exist):', statement.substring(0, 50) + '...');
          }
        }
      }

      console.log('✅ Database schema restored from backup');
    } else {
      console.log('No backup file found, creating minimal schema...');

      // Create minimal tables needed for financial dashboard
      const minimalTables = [
        `CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255),
                    full_name VARCHAR(255),
                    user_role ENUM('admin', 'director', 'manager', 'designer', 'technician') DEFAULT 'technician',
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
        `CREATE TABLE IF NOT EXISTS clients (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    company_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    phone VARCHAR(50),
                    address TEXT,
                    city VARCHAR(100),
                    state VARCHAR(100),
                    gst_number VARCHAR(50),
                    contact_person VARCHAR(255),
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    deleted_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
        `CREATE TABLE IF NOT EXISTS invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    invoice_number VARCHAR(50) NOT NULL UNIQUE,
                    customer_id INT NOT NULL,
                    reference_type ENUM('sales_order','direct') NOT NULL,
                    reference_id INT DEFAULT NULL,
                    invoice_date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    subtotal DECIMAL(15,2) DEFAULT '0.00',
                    tax_amount DECIMAL(15,2) DEFAULT '0.00',
                    total_amount DECIMAL(15,2) DEFAULT '0.00',
                    balance_amount DECIMAL(15,2) DEFAULT '0.00',
                    status ENUM('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
                    created_by INT DEFAULT NULL,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
        `CREATE TABLE IF NOT EXISTS expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    expense_number VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    expense_date DATE NOT NULL,
                    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
                    created_by INT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`,
        `CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    po_id VARCHAR(50) NOT NULL UNIQUE,
                    po_number VARCHAR(50) DEFAULT NULL,
                    supplier_id INT DEFAULT NULL,
                    date DATE NOT NULL,
                    delivery_date DATE DEFAULT NULL,
                    expected_delivery_date DATE DEFAULT NULL,
                    total_amount DECIMAL(15,2) DEFAULT '0.00',
                    grand_total DECIMAL(15,2) DEFAULT '0.00',
                    status ENUM('draft','pending','approved','completed','cancelled') DEFAULT 'draft',
                    created_by INT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    po_date DATE DEFAULT NULL,
                    tax_amount DECIMAL(15,2) DEFAULT '0.00',
                    purchase_request_id INT DEFAULT NULL
                )`
      ];

      for (const tableSQL of minimalTables) {
        await connection.execute(tableSQL);
      }

      console.log('✅ Minimal database schema created');
    }

    // Insert some sample data for testing
    console.log('Inserting sample data...');

    // Sample clients
    await connection.execute(`
            INSERT IGNORE INTO clients (company_name, contact_person, email, phone, status) VALUES
            ('ABC Corp', 'John Doe', 'john@abc.com', '1234567890', 'active'),
            ('XYZ Ltd', 'Jane Smith', 'jane@xyz.com', '0987654321', 'active')
        `);    // Sample invoices
    await connection.execute(`
            INSERT IGNORE INTO invoices (invoice_number, customer_id, reference_type, invoice_date, due_date, subtotal, tax_amount, total_amount, balance_amount, status) VALUES
            ('INV-001', 1, 'direct', '2025-01-15', '2025-02-15', 10000.00, 1800.00, 11800.00, 11800.00, 'sent'),
            ('INV-002', 2, 'direct', '2025-01-20', '2025-02-20', 15000.00, 2700.00, 17700.00, 17700.00, 'paid'),
            ('INV-003', 1, 'direct', '2025-02-01', '2025-03-01', 8000.00, 1440.00, 9440.00, 9440.00, 'overdue')
        `);

    // Sample expenses (simplified)
    await connection.execute(`
            INSERT IGNORE INTO expenses (expense_number, description, amount, total_amount, expense_date, payment_method, payment_status, approval_status, created_by) VALUES
            ('EXP-001', 'Office Supplies', 2500.00, 2500.00, '2025-01-10', 'cash', 'paid', 'approved', 3),
            ('EXP-002', 'Travel Expenses', 5000.00, 5000.00, '2025-01-15', 'bank_transfer', 'paid', 'approved', 3),
            ('EXP-003', 'Software License', 15000.00, 15000.00, '2025-01-20', 'bank_transfer', 'pending', 'approved', 3)
        `); console.log('✅ Sample data inserted');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();