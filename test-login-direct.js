// Simple script to test login API directly using built-in http module
const http = require('http');

function testLogin() {
  console.log('Testing login API...');
  
  return new Promise((resolve) => {
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
        'Content-Length': data.length,
        'Accept': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response data:', JSON.stringify(parsedData, null, 2));
          
          if (res.statusCode === 200 && parsedData.data && parsedData.data.token) {
            console.log('Login successful! Token received.');
            resolve(true);
          } else {
            console.log('Login failed.');
            resolve(false);
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error testing login:', error.message);
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

function testHealth() {
  console.log('Testing health API...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response data:', JSON.stringify(parsedData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('Health check successful!');
            resolve(true);
          } else {
            console.log('Health check failed.');
            resolve(false);
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error testing health:', error.message);
      resolve(false);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('=== VTRIA ERP API Test ===');
  
  const healthResult = await testHealth();
  console.log('\nHealth API:', healthResult ? 'PASSED ✓' : 'FAILED ✗');
  
  const loginResult = await testLogin();
  console.log('\nLogin API:', loginResult ? 'PASSED ✓' : 'FAILED ✗');
  
  console.log('\n=== Test Summary ===');
  console.log('Health API:', healthResult ? 'PASSED ✓' : 'FAILED ✗');
  console.log('Login API:', loginResult ? 'PASSED ✓' : 'FAILED ✗');
}

runTests().catch(console.error);
