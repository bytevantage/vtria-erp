const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createTestUser() {
  try {
    // Generate password hash
    const password = 'TestPayroll@2025';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('Generated password hash:', passwordHash);

    // Connect to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'rootpassword',
      database: 'vtria_erp'
    });

    console.log('Connected to database');

    // Delete existing test user
    await connection.execute(
      'DELETE FROM users WHERE email = ?',
      ['test.payroll@vtria.com']
    );

    // Insert test user
    const [result] = await connection.execute(`
            INSERT INTO users (
                email,
                password_hash,
                full_name,
                user_role,
                status,
                first_name,
                last_name,
                phone,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      'test.payroll@vtria.com',
      passwordHash,
      'Test Payroll User',
      'admin',
      'active',
      'Test',
      'Payroll',
      '+91-9876543210',
      1
    ]);

    console.log('✓ Test user created successfully!');
    console.log('  Email: test.payroll@vtria.com');
    console.log('  Password: TestPayroll@2025');
    console.log('  User ID:', result.insertId);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
