const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateInvoicesTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'vtria_user',
      password: process.env.DB_PASS || 'dev_password',
      database: process.env.DB_NAME || 'vtria_erp'
    });

    console.log('Connected to database');

    // Check current table structure
    const [columns] = await connection.execute("DESCRIBE invoices");
    console.log('Current invoices table columns:', columns.map(col => col.Field));

    // Add missing columns
    const alterQueries = [
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT '0.00' AFTER due_date",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT '0.00' AFTER subtotal",
      "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(15,2) DEFAULT '0.00' AFTER total_amount"
    ];

    for (const query of alterQueries) {
      try {
        await connection.execute(query);
        console.log('Executed:', query);
      } catch (err) {
        console.log('Column might already exist or error:', err.message);
      }
    }

    // Verify the updated structure
    const [updatedColumns] = await connection.execute("DESCRIBE invoices");
    console.log('Updated invoices table columns:', updatedColumns.map(col => col.Field));

    console.log('✅ Invoices table schema updated successfully');

  } catch (error) {
    console.error('❌ Error updating invoices table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateInvoicesTable();