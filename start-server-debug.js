/**
 * Enhanced debug script for VTRIA ERP server startup
 * This script will start the server with detailed logging and error handling
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Set port to 5000
process.env.PORT = '5000';

console.log('=================================================');
console.log('  VTRIA ERP Server Debug Starter (Port 5000)');
console.log('=================================================');
console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('PORT:', process.env.PORT);

// Check if the server file exists
const serverPath = path.join(__dirname, 'server', 'src', 'server.js');
if (!fs.existsSync(serverPath)) {
  console.error(`Server file not found at: ${serverPath}`);
  process.exit(1);
}

console.log(`\nStarting server from: ${serverPath}`);
console.log('=================================================');

// Start the server process with environment variables
const serverProcess = spawn('node', [serverPath], {
  env: { ...process.env, PORT: '5000' },
  stdio: 'pipe'
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  process.stdout.write(`[SERVER]: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[SERVER ERROR]: ${data}`);
});

// Handle server process events
serverProcess.on('error', (error) => {
  console.error('Failed to start server process:', error);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server process exited with code ${code}`);
  } else {
    console.log('Server process exited normally');
  }
});

// Keep the main process running
console.log('Server started. Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  serverProcess.kill('SIGINT');
  setTimeout(() => {
    console.log('Exiting debug script');
    process.exit(0);
  }, 1000);
});
