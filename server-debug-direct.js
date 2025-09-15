// Enhanced debug script for VTRIA ERP server
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('=================================================');
console.log('  VTRIA ERP Server Debug - Direct Mode');
console.log('=================================================');
console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);

// Server directory
const serverDir = path.join(__dirname, 'server');
const serverFile = path.join(serverDir, 'src', 'server.js');

// Create a modified version of server.js that ignores SIGINT
const debugServerFile = path.join(__dirname, 'debug-server.js');

// Read the original server file
console.log(`Reading server file: ${serverFile}`);
let serverCode = fs.readFileSync(serverFile, 'utf8');

// Modify the server code to ignore SIGINT
console.log('Modifying server code to ignore SIGINT signals...');
serverCode = `
// This is a modified version of server.js that ignores SIGINT signals
// Original file: ${serverFile}
// Created by server-debug-direct.js

// Override SIGINT handler to prevent shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received but ignored by debug script');
  console.log('Server will continue running');
  console.log('To stop the server, use Task Manager to end the Node.js process');
});

// Original server code follows
${serverCode}
`;

// Write the modified server code to a new file
console.log(`Writing modified server code to: ${debugServerFile}`);
fs.writeFileSync(debugServerFile, serverCode);

// Set environment variables
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';

console.log('\nStarting server with modified code...');
console.log('Server will ignore SIGINT signals and continue running');
console.log('To stop the server, use Task Manager to end the Node.js process');
console.log('=================================================\n');

// Start the server with the modified code
const serverProcess = spawn('node', [debugServerFile], {
  stdio: 'inherit',
  env: process.env
});

serverProcess.on('error', (err) => {
  console.error(`Failed to start server: ${err.message}`);
});

serverProcess.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  
  // Clean up the temporary file
  try {
    fs.unlinkSync(debugServerFile);
    console.log(`Removed temporary file: ${debugServerFile}`);
  } catch (err) {
    console.error(`Failed to remove temporary file: ${err.message}`);
  }
});

// Keep the parent process running
console.log('Parent process will remain running to monitor the server');
