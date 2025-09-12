const http = require('http');

// Options for the health endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/health',
  method: 'GET'
};

console.log('Testing VTRIA ERP server health endpoint...');

// Make the request
const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response data:');
    console.log(data);
    console.log('\nServer is running correctly!');
  });
});

req.on('error', (error) => {
  console.error('Error connecting to server:');
  console.error(error.message);
  console.log('\nServer might not be running or has an issue.');
});

req.end();
