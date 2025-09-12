/**
 * Direct Login Test for VTRIA ERP Server on Port 5000
 * Tests the login API endpoint directly on port 5000 without Apache proxy
 */

const http = require('http');
const fs = require('fs');

console.log('=================================================');
console.log('  VTRIA ERP Direct Login Test (Port 5000)');
console.log('=================================================');

// Login credentials
const loginData = {
  email: 'admin@vtria.com',
  password: 'VtriaAdmin@2024'
};

const data = JSON.stringify(loginData);

// First test the health endpoint
console.log('1. Testing health endpoint...');
const healthReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/health',
  method: 'GET'
}, (res) => {
  console.log(`Health API Status: ${res.statusCode}`);
  
  let healthData = '';
  res.on('data', (chunk) => {
    healthData += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Health API is working!');
      console.log(JSON.parse(healthData));
      console.log('-------------------------------------------------');
      
      // Now test the login endpoint
      console.log('2. Testing login endpoint...');
      const loginReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (loginRes) => {
        console.log(`Login API Status: ${loginRes.statusCode}`);
        
        let loginResponseData = '';
        loginRes.on('data', (chunk) => {
          loginResponseData += chunk;
        });
        
        loginRes.on('end', () => {
          try {
            const parsedData = JSON.parse(loginResponseData);
            console.log('Login response:');
            console.log(JSON.stringify(parsedData, null, 2));
            
            if (loginRes.statusCode === 200 && parsedData.data && parsedData.data.token) {
              console.log('✅ Login API is working! JWT token received.');
              
              // Save token to file for future API tests
              fs.writeFileSync('jwt-token.txt', parsedData.data.token);
              console.log('Token saved to jwt-token.txt');
              
              console.log('\n=================================================');
              console.log('  SERVER IS FULLY OPERATIONAL ON PORT 5000');
              console.log('=================================================');
            } else {
              console.log('❌ Login failed. Check credentials or server configuration.');
            }
          } catch (e) {
            console.error('Error parsing login response:', e.message);
            console.log('Raw response:', loginResponseData);
          }
        });
      });
      
      loginReq.on('error', (error) => {
        console.error('❌ Login API error:', error.message);
      });
      
      loginReq.write(data);
      loginReq.end();
      
    } else {
      console.log('❌ Health API returned non-200 status code');
      console.log(healthData);
    }
  });
});

healthReq.on('error', (error) => {
  console.error('❌ Health API error:', error.message);
  console.log('Make sure the server is running on port 5000');
  console.log('Try running: start-server-direct-persistent.bat');
});

healthReq.end();
