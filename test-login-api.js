/**
 * Test script for VTRIA ERP login API
 * Tests the login endpoint with default admin credentials
 */

const http = require('http');

console.log('Testing VTRIA ERP login API endpoint...');

const data = JSON.stringify({
  email: 'admin@vtria.com',
  password: 'VtriaAdmin@2024'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(responseData);
      console.log('Login successful!');
      console.log('Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.token) {
        console.log('\nJWT token received - authentication working correctly');
      } else {
        console.log('\nWARNING: No JWT token in response');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error connecting to server:', error.message);
  console.log('Make sure the server is running on port 5000');
});

req.write(data);
req.end();

console.log('Request sent, waiting for response...');
