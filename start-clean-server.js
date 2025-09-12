/**
 * VTRIA ERP Clean Server Start
 * This script checks if port 5000 is available, kills any process using it,
 * and then starts the server with proper environment variables
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}=================================================`);
console.log(`  VTRIA ERP Clean Server Start`);
console.log(`=================================================${colors.reset}`);

// Check if port 5000 is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`${colors.yellow}Port ${port} is already in use${colors.reset}`);
        resolve(false);
      } else {
        console.log(`${colors.red}Error checking port ${port}: ${err.message}${colors.reset}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      console.log(`${colors.green}Port ${port} is available${colors.reset}`);
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Kill process using port 5000 (Windows specific)
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    console.log(`${colors.yellow}Attempting to kill process on port ${port}...${colors.reset}`);
    
    // Windows specific command to find and kill process on port
    const command = `for /f "tokens=5" %i in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %i`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`${colors.yellow}No process found on port ${port} or unable to kill${colors.reset}`);
      } else if (stdout) {
        console.log(`${colors.green}Process on port ${port} killed:${colors.reset}`);
        console.log(stdout);
      }
      
      // Give some time for the port to be released
      setTimeout(() => resolve(), 1000);
    });
  });
}

// Start the server
function startServer() {
  console.log(`${colors.cyan}Starting server...${colors.reset}`);
  
  // Set environment variables
  process.env.PORT = '5000';
  process.env.NODE_ENV = 'development';
  process.env.IGNORE_SIGINT = 'true';
  
  console.log(`${colors.blue}Environment variables:${colors.reset}`);
  console.log(`- PORT: ${process.env.PORT}`);
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- IGNORE_SIGINT: ${process.env.IGNORE_SIGINT}`);
  
  // Server directory and file
  const serverDir = path.join(__dirname, 'server');
  const serverFile = path.join(serverDir, 'src', 'server.js');
  
  console.log(`${colors.blue}Server directory:${colors.reset} ${serverDir}`);
  console.log(`${colors.blue}Server file:${colors.reset} ${serverFile}`);
  
  // Change working directory to server directory
  try {
    process.chdir(serverDir);
    console.log(`${colors.green}Changed working directory to:${colors.reset} ${process.cwd()}`);
  } catch (err) {
    console.error(`${colors.red}Failed to change working directory:${colors.reset} ${err.message}`);
    return;
  }
  
  console.log(`\n${colors.green}Starting server process...${colors.reset}`);
  console.log(`${colors.cyan}=================================================${colors.reset}\n`);
  
  // Start the server
  const serverProcess = spawn('node', [serverFile], {
    stdio: 'inherit',
    env: process.env
  });
  
  // Ignore SIGINT in parent process
  process.on('SIGINT', () => {
    console.log(`${colors.yellow}SIGINT received but ignored in parent process${colors.reset}`);
  });
  
  process.on('SIGTERM', () => {
    console.log(`${colors.yellow}SIGTERM received but ignored in parent process${colors.reset}`);
  });
  
  serverProcess.on('error', (err) => {
    console.error(`${colors.red}Failed to start server:${colors.reset} ${err.message}`);
  });
  
  serverProcess.on('exit', (code, signal) => {
    console.log(`${colors.yellow}Server process exited with code ${code} and signal ${signal}${colors.reset}`);
  });
  
  // Keep the parent process running
  console.log(`${colors.blue}Parent process will remain running to keep the server alive${colors.reset}`);
  console.log(`${colors.blue}Press Ctrl+C twice to force shutdown${colors.reset}`);
}

// Main function
async function main() {
  // Check if port is available
  const isPortAvailable = await checkPort(5000);
  
  // If port is not available, kill the process using it
  if (!isPortAvailable) {
    await killProcessOnPort(5000);
    
    // Check again if port is available after killing
    const isPortAvailableNow = await checkPort(5000);
    
    if (!isPortAvailableNow) {
      console.log(`${colors.red}Port 5000 is still in use after attempting to kill the process${colors.reset}`);
      console.log(`${colors.red}Please close any application using port 5000 manually${colors.reset}`);
      process.exit(1);
    }
  }
  
  // Start the server
  startServer();
}

// Run the main function
main().catch(err => {
  console.error(`${colors.red}Error:${colors.reset} ${err.message}`);
});
