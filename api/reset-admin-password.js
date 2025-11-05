const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

const resetPassword = async () => {
  try {
    const email = 'admin@vtria.com';
    const newPassword = 'admin123';

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, email]
    );

    if (result.affectedRows > 0) {
      console.log('✅ Password reset successfully!');
      console.log('Email:', email);
      console.log('Password:', newPassword);

      // Verify it works
      const [users] = await db.execute(
        'SELECT email, password_hash FROM users WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        const match = await bcrypt.compare(newPassword, users[0].password_hash);
        console.log('Password verification:', match ? '✅ PASS' : '❌ FAIL');
      }
    } else {
      console.log('❌ No user found with that email');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetPassword();
