// Enhanced debug script with verbose output for VTRIA ERP server
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

console.log('=================================================');
console.log('  VTRIA ERP Server Debug - Verbose Mode');
console.log('=================================================');
console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);

// Check if port 5000 is already in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use!`);
        resolve(false);
      } else {
        console.log(`Error checking port ${port}:`, err.message);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      console.log(`Port ${port} is available`);
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Check database connection
function checkDatabase() {
  try {
    console.log('Checking database configuration...');
    const dbConfigPath = path.join(__dirname, 'server', 'src', 'config', 'database.js');
    
    if (fs.existsSync(dbConfigPath)) {
      const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
      console.log('Database configuration found:');
      console.log(dbConfigContent);
    } else {
      console.log('Database configuration file not found at:', dbConfigPath);
    }
  } catch (err) {
    console.error('Error checking database configuration:', err);
  }
}

// Check environment variables
function checkEnvFile() {
  try {
    console.log('Checking .env file...');
    const envPath = path.join(__dirname, 'server', '.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('.env file found:');
      console.log(envContent);
    } else {
      console.log('.env file not found at:', envPath);
      
      // Check for .env.example
      const envExamplePath = path.join(__dirname, 'server', '.env.example');
      if (fs.existsSync(envExamplePath)) {
        console.log('.env.example file found, creating .env from example...');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('.env file created from example');
      }
    }
  } catch (err) {
    console.error('Error checking .env file:', err);
  }
}

// Check node_modules
function checkNodeModules() {
  try {
    console.log('Checking node_modules...');
    const nodeModulesPath = path.join(__dirname, 'server', 'node_modules');
    
    if (fs.existsSync(nodeModulesPath)) {
      console.log('node_modules directory found');
    } else {
      console.log('node_modules directory not found at:', nodeModulesPath);
      console.log('Dependencies may need to be installed with npm install');
    }
  } catch (err) {
    console.error('Error checking node_modules:', err);
  }
}

// Run pre-flight checks
async function runPreflightChecks() {
  console.log('\n=== Running pre-flight checks ===');
  
  // Check if port 5000 is available
  const portAvailable = await checkPort(5000);
  if (!portAvailable) {
    console.log('WARNING: Port 5000 is already in use. Server may fail to start.');
  }
  
  // Check database configuration
  checkDatabase();
  
  // Check .env file
  checkEnvFile();
  
  // Check node_modules
  checkNodeModules();
  
  console.log('=== Pre-flight checks completed ===\n');
}

// Start the server with detailed logging
async function startServer() {
  await runPreflightChecks();
  
  // Set environment variables
  process.env.PORT = '5000';
  process.env.NODE_ENV = 'development';
  process.env.IGNORE_SIGINT = 'true';
  process.env.DEBUG = '*';
  
  console.log('\nStarting server with verbose logging...');
  console.log('Environment variables:');
  console.log('- PORT:', process.env.PORT);
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- IGNORE_SIGINT:', process.env.IGNORE_SIGINT);
  console.log('- DEBUG:', process.env.DEBUG);
  
  // Server directory and file
  const serverDir = path.join(__dirname, 'server');
  const serverFile = path.join(serverDir, 'src', 'server.js');
  
  console.log('Server directory:', serverDir);
  console.log('Server file:', serverFile);
  
  // Change working directory to server directory
  try {
    process.chdir(serverDir);
    console.log('Changed working directory to:', process.cwd());
  } catch (err) {
    console.error('Failed to change working directory:', err.message);
    return;
  }
  
  console.log('\nStarting server process...');
  console.log('=================================================\n');
  
  // Start the server
  const serverProcess = spawn('node', [serverFile], {
    stdio: 'inherit',
    env: process.env
  });
  
  serverProcess.on('error', (err) => {
    console.error(`Failed to start server: ${err.message}`);
  });
  
  serverProcess.on('exit', (code, signal) => {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
  });
  
  // Keep the parent process running
  console.log('Parent process will remain running to monitor the server');
}

// Start the server
startServer().catch(err => {
  console.error('Error starting server:', err);
});
