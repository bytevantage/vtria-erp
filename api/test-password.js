const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

(async () => {
  try {
    const [users] = await db.execute(
      'SELECT email, password_hash FROM users WHERE email = ?',
      ['admin@vtria.com']
    );

    if (users.length > 0) {
      console.log('User found:', users[0].email);
      console.log('Password hash exists:', !!users[0].password_hash);
      console.log('Hash length:', users[0].password_hash?.length || 0);

      // Test common passwords
      const testPasswords = ['admin123', 'admin', 'password', 'Admin123', 'admin@123', 'vtria123'];

      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, users[0].password_hash);
        if (match) {
          console.log('✅ MATCH FOUND! Password is:', pwd);
        } else {
          console.log('❌ Not matching:', pwd);
        }
      }
    } else {
      console.log('User not found');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
