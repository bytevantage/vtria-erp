// Windows Service Installer for VTRIA ERP Server
const path = require('path');
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'VTRIA ERP Server',
  description: 'Node.js server for VTRIA ERP application',
  script: path.join(__dirname, 'server', 'src', 'server.js'),
  nodeOptions: [],
  workingDirectory: path.join(__dirname, 'server'),
  allowServiceLogon: true,
  env: [
    {
      name: "PORT",
      value: 5000
    },
    {
      name: "NODE_ENV",
      value: "development"
    },
    {
      name: "IGNORE_SIGINT",
      value: "true"
    }
  ]
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('Service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

// Listen for the "start" event
svc.on('start', function() {
  console.log('Service started successfully!');
  console.log('VTRIA ERP Server is now running as a Windows service on port 5000');
  console.log('The service will automatically restart if it crashes or if the system reboots');
});

// Listen for the "error" event
svc.on('error', function(err) {
  console.error('Error:', err);
});

console.log('Installing VTRIA ERP Server as a Windows service...');
svc.install();
