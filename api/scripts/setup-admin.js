#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const db = require('../src/config/database');
require('dotenv').config();

async function setupInitialAdmin() {
    try {
        console.log('🔧 Setting up initial admin user...\n');

        // Check if users already exist
        const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
        
        if (users[0].count > 0) {
            console.log('❌ System already initialized. Users exist in the database.');
            process.exit(1);
        }

        // Get admin details from command line arguments or use defaults
        const email = process.argv[2] || 'admin@vtria.com';
        const password = process.argv[3] || 'Admin@123456';
        const fullName = process.argv[4] || 'System Administrator';

        console.log(`📧 Email: ${email}`);
        console.log(`👤 Name: ${fullName}`);
        console.log(`🔑 Password: ${'*'.repeat(password.length)}\n`);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin user
        const [result] = await db.execute(
            'INSERT INTO users (email, password_hash, full_name, user_role, status) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, fullName, 'admin', 'active']
        );

        console.log('✅ Initial admin user created successfully!');
        console.log(`📝 User ID: ${result.insertId}`);
        console.log(`🌐 You can now login at: http://localhost:3000/login`);
        console.log('\n⚠️  IMPORTANT: Please change the default password after first login!\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
}

// Check if this script is being run directly
if (require.main === module) {
    // Display usage information
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`
🔧 VTRIA ERP - Initial Admin Setup

Usage:
  node setup-admin.js [email] [password] [full_name]

Arguments:
  email     - Admin email address (default: admin@vtria.com)
  password  - Admin password (default: Admin@123456)
  full_name - Admin full name (default: System Administrator)

Examples:
  node setup-admin.js
  node setup-admin.js myemail@company.com MyPassword@123 "John Doe"

Note: This script can only be run once when the database is empty.
        `);
        process.exit(0);
    }

    setupInitialAdmin();
}

module.exports = { setupInitialAdmin };
