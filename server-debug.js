// Enhanced debug script to check server startup issues
const path = require('path');
const fs = require('fs');
const util = require('util');
const child_process = require('child_process');

console.log('=================================================');
console.log('  VTRIA ERP Server Debug Process');
console.log('=================================================');
console.log('Current directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);

// Check environment variables
console.log('\nEnvironment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
process.env.PORT = process.env.PORT || '4000';
console.log('PORT:', process.env.PORT);

// Check critical files
const serverPath = path.join(__dirname, 'server', 'src', 'server.js');
const stockSchedulerPath = path.join(__dirname, 'server', 'src', 'utils', 'stockScheduler.js');
const websocketServicePath = path.join(__dirname, 'server', 'src', 'services', 'websocketService.js');
const ticketSchedulerPath = path.join(__dirname, 'server', 'src', 'utils', 'ticketScheduler.js');

console.log('\nChecking critical files:');
console.log('- Server:', fs.existsSync(serverPath) ? 'Found ✓' : 'Missing ✗');
console.log('- Stock Scheduler:', fs.existsSync(stockSchedulerPath) ? 'Found ✓' : 'Missing ✗');
console.log('- WebSocket Service:', fs.existsSync(websocketServicePath) ? 'Found ✓' : 'Missing ✗');
console.log('- Ticket Scheduler:', fs.existsSync(ticketSchedulerPath) ? 'Found ✓' : 'Missing ✗');

// Check for initialize methods
if (fs.existsSync(stockSchedulerPath)) {
    const stockSchedulerContent = fs.readFileSync(stockSchedulerPath, 'utf8');
    console.log('- Stock Scheduler has initialize():', stockSchedulerContent.includes('initialize(') ? 'Yes ✓' : 'No ✗');
}

if (fs.existsSync(websocketServicePath)) {
    const websocketServiceContent = fs.readFileSync(websocketServicePath, 'utf8');
    console.log('- WebSocket Service has initialize():', websocketServiceContent.includes('initialize(') ? 'Yes ✓' : 'No ✗');
}

if (fs.existsSync(ticketSchedulerPath)) {
    const ticketSchedulerContent = fs.readFileSync(ticketSchedulerPath, 'utf8');
    console.log('- Ticket Scheduler has initialize():', ticketSchedulerContent.includes('initialize(') ? 'Yes ✓' : 'No ✗');
}

console.log('\nAttempting to start server...');

// Check database configuration
const dbConfigPath = path.join(__dirname, 'server', 'src', 'config', 'database.js');
if (fs.existsSync(dbConfigPath)) {
    console.log('- Database config:', 'Found ✓');
    try {
        const dbConfig = require(dbConfigPath);
        console.log('- Database type:', dbConfig.sequelize ? dbConfig.sequelize.options.dialect || 'unknown' : 'unknown');
        console.log('- Database connection will be tested during startup');
    } catch (dbError) {
        console.error('- Error loading database config:', dbError.message);
    }
} else {
    console.log('- Database config:', 'Missing ✗');
}

// Start the server in a child process to prevent SIGINT from reaching it
if (fs.existsSync(serverPath)) {
    console.log('\n=================================================');
    console.log('STARTING SERVER IN PERSISTENT MODE');
    console.log('=================================================');
    console.log('The server will ignore SIGINT signals and continue running');
    console.log('To stop the server, you must use Task Manager to end the Node.js process');
    console.log('=================================================\n');
    
    // Override the SIGINT handler in the parent process
    process.on('SIGINT', () => {
        console.log('\n=================================================');
        console.log('SIGINT received in parent process but ignored');
        console.log('Server will continue running');
        console.log('To stop the server, use Task Manager to end the Node.js process');
        console.log('=================================================\n');
    });
    
    // Set environment variables
    process.env.PORT = process.env.PORT || '5000';
    process.env.IGNORE_SIGINT = 'true';
    
    // Start the server in a detached child process
    const serverProcess = child_process.fork(serverPath, [], {
        env: process.env,
        detached: true,
        stdio: 'inherit'
    });
    
    serverProcess.on('message', (msg) => {
        console.log('Message from server:', msg);
    });
    
    serverProcess.on('error', (err) => {
        console.error('Error in server process:', err);
    });
    
    serverProcess.on('exit', (code, signal) => {
        console.log(`Server process exited with code ${code} and signal ${signal}`);
    });
    
    console.log(`Server started with PID: ${serverProcess.pid}`);
    console.log('Server will continue running even if this console is closed');
    
    // Keep the parent process running
    setInterval(() => {
        console.log(`Server still running. PID: ${serverProcess.pid}, Port: ${process.env.PORT}`);
        
        // Check if the port is actually in use
        const net = require('net');
        const tester = net.createServer()
            .once('error', err => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`✓ Port ${process.env.PORT} is in use - server is running correctly`);
                } else {
                    console.log(`Error checking port: ${err.message}`);
                }
            })
            .once('listening', () => {
                tester.close();
                console.log(`✗ Port ${process.env.PORT} is not in use - server may have stopped`);
            })
            .listen(process.env.PORT);
    }, 10000); // Check every 10 seconds
} else {
    console.error('Server file not found at path:', serverPath);
}
