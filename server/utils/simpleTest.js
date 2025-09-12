/**
 * Simple test script to verify Node.js environment
 */

console.log('Simple test script is running!');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

try {
  require('dotenv').config();
  console.log('dotenv module loaded successfully');
  console.log('Environment variables loaded:', Object.keys(process.env).length);
} catch (error) {
  console.error('Error loading dotenv:', error.message);
}

try {
  const fs = require('fs');
  console.log('fs module loaded successfully');
  
  const files = fs.readdirSync('.');
  console.log('Files in current directory:', files.slice(0, 5), '...');
} catch (error) {
  console.error('Error with fs module:', error.message);
}

console.log('Test completed successfully!');
