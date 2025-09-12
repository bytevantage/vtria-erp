// Simple debug script for VTRIA ERP server
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== VTRIA ERP Server Simple Debug ===');

// Check if server directory exists
const serverDir = path.join(__dirname, 'server');
console.log(`Checking server directory: ${serverDir}`);
if (fs.existsSync(serverDir)) {
  console.log('✓ Server directory exists');
} else {
  console.log('✗ Server directory does not exist');
  process.exit(1);
}

// Check if server.js exists
const serverFile = path.join(serverDir, 'src', 'server.js');
console.log(`Checking server file: ${serverFile}`);
if (fs.existsSync(serverFile)) {
  console.log('✓ Server file exists');
} else {
  console.log('✗ Server file does not exist');
  process.exit(1);
}

// Check if .env file exists, create from example if not
const envFile = path.join(serverDir, '.env');
console.log(`Checking .env file: ${envFile}`);
if (!fs.existsSync(envFile)) {
  console.log('✗ .env file does not exist');
  
  const envExampleFile = path.join(serverDir, '.env.example');
  if (fs.existsSync(envExampleFile)) {
    console.log(`Creating .env from .env.example...`);
    fs.copyFileSync(envExampleFile, envFile);
    console.log('✓ Created .env file from example');
    
    // Update PORT in .env file
    let envContent = fs.readFileSync(envFile, 'utf8');
    envContent = envContent.replace(/PORT=\d+/g, 'PORT=5000');
    fs.writeFileSync(envFile, envContent);
    console.log('✓ Updated PORT to 5000 in .env file');
  } else {
    console.log('✗ .env.example file does not exist');
  }
} else {
  console.log('✓ .env file exists');
  
  // Check if PORT is set to 5000 in .env file
  const envContent = fs.readFileSync(envFile, 'utf8');
  if (envContent.includes('PORT=5000')) {
    console.log('✓ PORT is set to 5000 in .env file');
  } else {
    console.log('✗ PORT is not set to 5000 in .env file');
    console.log('Updating PORT to 5000 in .env file...');
    const updatedEnvContent = envContent.replace(/PORT=\d+/g, 'PORT=5000');
    fs.writeFileSync(envFile, updatedEnvContent);
    console.log('✓ Updated PORT to 5000 in .env file');
  }
}

// Check if node_modules exists
const nodeModulesDir = path.join(serverDir, 'node_modules');
console.log(`Checking node_modules: ${nodeModulesDir}`);
if (fs.existsSync(nodeModulesDir)) {
  console.log('✓ node_modules exists');
} else {
  console.log('✗ node_modules does not exist');
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { cwd: serverDir, stdio: 'inherit' });
    console.log('✓ Dependencies installed');
  } catch (error) {
    console.log('✗ Failed to install dependencies');
    console.error(error.message);
  }
}

// Check if port 5000 is in use
console.log('Checking if port 5000 is in use...');
try {
  const netstatOutput = execSync('netstat -ano | findstr :5000').toString();
  if (netstatOutput.includes('LISTENING')) {
    console.log('✗ Port 5000 is already in use');
    console.log(netstatOutput);
    
    // Try to kill the process using port 5000
    console.log('Attempting to kill process using port 5000...');
    const pid = netstatOutput.trim().split(/\s+/).pop();
    try {
      execSync(`taskkill /F /PID ${pid}`);
      console.log(`✓ Killed process with PID ${pid}`);
    } catch (error) {
      console.log(`✗ Failed to kill process with PID ${pid}`);
      console.error(error.message);
    }
  } else {
    console.log('✓ Port 5000 is available');
  }
} catch (error) {
  console.log('✓ Port 5000 is available (no processes found)');
}

// Try to start the server
console.log('\n=== Starting server with debug output ===');
console.log('Changing to server directory...');
process.chdir(serverDir);
console.log(`Current directory: ${process.cwd()}`);

console.log('Setting environment variables...');
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';
process.env.IGNORE_SIGINT = 'true';

console.log('Starting server...');
try {
  execSync('node src/server.js', { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.log('✗ Server failed to start');
  console.error(error.message);
}
