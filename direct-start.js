// Direct server starter for VTRIA ERP
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=================================================');
console.log('  VTRIA ERP Direct Server Starter');
console.log('=================================================');

// Server directory
const serverDir = path.join(__dirname, 'server');
console.log(`Server directory: ${serverDir}`);

// Check if server directory exists
if (!fs.existsSync(serverDir)) {
  console.error(`ERROR: Server directory not found at ${serverDir}`);
  process.exit(1);
}

// Check if server.js exists
const serverFile = path.join(serverDir, 'src', 'server.js');
if (!fs.existsSync(serverFile)) {
  console.error(`ERROR: Server file not found at ${serverFile}`);
  process.exit(1);
}

// Check if .env exists, if not create from .env.example
const envFile = path.join(serverDir, '.env');
if (!fs.existsSync(envFile)) {
  console.log('Creating .env file from .env.example...');
  const envExampleFile = path.join(serverDir, '.env.example');
  if (fs.existsSync(envExampleFile)) {
    fs.copyFileSync(envExampleFile, envFile);
    console.log('.env file created successfully');
  } else {
    console.warn('WARNING: .env.example not found, creating empty .env file');
    fs.writeFileSync(envFile, '# Auto-generated .env file\nDB_HOST=localhost\nDB_USER=root\nDB_PASSWORD=\nDB_NAME=vtria_erp_dev\nDB_DIALECT=mysql\nPORT=5000\nJWT_SECRET=vtria-erp-secret-key\nJWT_EXPIRATION=24h\n');
  }
}

console.log('Starting Node.js server...');
console.log('Default admin credentials: admin@vtria.com / VtriaAdmin@2024');
console.log('Server will be available at: http://localhost:5000');
console.log('Frontend will be available at: http://localhost:8080/vtria-erp/');
console.log('=================================================');

// Start the server
const serverProcess = spawn('node', [serverFile], { 
  cwd: serverDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5000', IGNORE_SIGINT: 'true', NODE_ENV: 'development' }
});

serverProcess.on('error', (err) => {
  console.error(`Failed to start server: ${err.message}`);
});

console.log('Server process started with SIGINT handling disabled.');

// Ignore SIGINT in this process too
process.on('SIGINT', () => {
  console.log('SIGINT received in parent process - ignoring to keep server running');
  // Do not exit, just ignore the signal
});

// Ignore SIGTERM too
process.on('SIGTERM', () => {
  console.log('SIGTERM received in parent process - ignoring to keep server running');
  // Do not exit, just ignore the signal
});
