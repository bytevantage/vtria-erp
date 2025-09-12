// Test script for VTRIA ERP API on port 5000
const http = require('http');

console.log('=== VTRIA ERP API Test on Port 5000 ===\n');

// Test health endpoint
function testHealth() {
  return new Promise((resolve) => {
    console.log('Testing health endpoint...');
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      console.log(`Health API Status Code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(data);
            console.log('Health API Response:', JSON.stringify(parsedData, null, 2));
            console.log('Health API Test: PASSED ✓\n');
            resolve(true);
          } catch (e) {
            console.log('Health API Raw Response:', data);
            console.log('Health API Test: PASSED ✓ (but response is not valid JSON)\n');
            resolve(true);
          }
        } else {
          console.log('Health API Raw Response:', data);
          console.log('Health API Test: FAILED ✗ (unexpected status code)\n');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Health API Error: ${error.message}`);
      console.log('Health API Test: FAILED ✗\n');
      resolve(false);
    });
    
    req.end();
  });
}

// Test login endpoint
function testLogin() {
  return new Promise((resolve) => {
    console.log('Testing login endpoint...');
    
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
      console.log(`Login API Status Code: ${res.statusCode}`);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(responseData);
            console.log('Login API Response:', JSON.stringify(parsedData, null, 2));
            console.log('Login API Test: PASSED ✓\n');
            resolve(true);
          } catch (e) {
            console.log('Login API Raw Response:', responseData);
            console.log('Login API Test: PASSED ✓ (but response is not valid JSON)\n');
            resolve(true);
          }
        } else {
          try {
            const parsedData = JSON.parse(responseData);
            console.log('Login API Error Response:', JSON.stringify(parsedData, null, 2));
          } catch (e) {
            console.log('Login API Raw Error Response:', responseData);
          }
          console.log('Login API Test: FAILED ✗ (unexpected status code)\n');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Login API Error: ${error.message}`);
      console.log('Login API Test: FAILED ✗\n');
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

// Run tests
async function runTests() {
  const healthResult = await testHealth();
  const loginResult = await testLogin();
  
  console.log('=== Test Summary ===');
  console.log('Health API:', healthResult ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Login API:', loginResult ? 'PASSED ✓' : 'FAILED ✗');
  
  if (healthResult && loginResult) {
    console.log('\nAll tests PASSED! The server is working correctly on port 5000.');
  } else {
    console.log('\nSome tests FAILED. Please check the server logs for more information.');
  }
}

runTests().catch(console.error);
