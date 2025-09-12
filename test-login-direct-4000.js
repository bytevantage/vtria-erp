// Simple script to test login API directly using built-in http module
const http = require('http');

function testHealth() {
  console.log('Testing health API on port 5000...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 3000 // 3 second timeout
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
          console.log('Raw response:', responseData);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error testing health:', error.message);
      console.log('This could indicate the server is not running on port 4000.');
      console.log('Try checking if:');
      console.log('1. The server process is running');
      console.log('2. The server is listening on port 4000');
      console.log('3. There are any firewall issues blocking the connection');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Request timed out after 3 seconds');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('=== VTRIA ERP API Test (Port 4000) ===');
  
  const healthResult = await testHealth();
  console.log('\nHealth API:', healthResult ? 'PASSED ✓' : 'FAILED ✗');
  
  console.log('\n=== Test Summary ===');
  console.log('Health API:', healthResult ? 'PASSED ✓' : 'FAILED ✗');
  
  if (!healthResult) {
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if the server is running with: netstat -ano | findstr :4000');
    console.log('2. Verify the server is configured to use port 4000 in server.js');
    console.log('3. Check for any error messages in the server console');
    console.log('4. Try restarting the server with: set PORT=4000 && node server\\src\\server.js');
  }
}

runTests().catch(console.error);
