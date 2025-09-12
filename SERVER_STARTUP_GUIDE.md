# VTRIA ERP Server Startup Guide

This document provides a comprehensive guide to the various server startup options available for the VTRIA ERP system, with a focus on solving the SIGINT shutdown issue and port conflict problems.

## Understanding the Issues

The VTRIA ERP Node.js server was experiencing two main issues:

1. **SIGINT Shutdown Issue**: The server would start on port 5000 but immediately receive a SIGINT signal and shut down gracefully. This prevented the server from remaining active and listening on port 5000.

2. **Port Conflict Issue**: Sometimes port 5000 would already be in use by another process, causing the server to fail to start with an EADDRINUSE error.

## Available Startup Options

### 1. Standard Startup (with SIGINT Handling)

**File:** `start-server.bat`

This script starts the server with SIGINT signal handling disabled, allowing the server to ignore Ctrl+C and other shutdown signals.

```batch
@echo off
cd /d C:\wamp64\www\vtria-erp\server
set PORT=5000
set NODE_ENV=development
set IGNORE_SIGINT=true
node src/server.js
```

**Usage:**
```
start-server.bat
```

### 2. No-Shutdown Mode

**File:** `start-server-no-shutdown.bat`

This script is specifically designed to run the server in a mode that ignores shutdown signals, making it more resilient to unexpected termination.

**Usage:**
```
start-server-no-shutdown.bat
```

### 3. Background Server Execution (PowerShell)

**File:** `start-server.ps1`

This PowerShell script runs the server in a background job, allowing it to continue running even if the PowerShell window is closed. It also includes monitoring capabilities.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File start-server.ps1
```

**Key Features:**
- Runs server as a background job
- Monitors server status and port usage
- Provides job ID for later management
- Continues running even if the PowerShell window is closed

### 4. Windows Service (Recommended for Production)

**Files:** 
- `install-service.js`
- `install-service.bat`

This option installs the VTRIA ERP server as a Windows service, which provides the following benefits:
- Automatic startup when Windows boots
- Automatic restart if the server crashes
- Proper service management through Windows Services
- No need for a console window to remain open

**Prerequisites:**
- Node.js installed
- Administrator privileges

**Installation:**
```
install-service.bat
```

After installation, the service can be managed through Windows Services (services.msc) with the name "VTRIA ERP Server".

### 5. Debug Mode with Verbose Output

**File:** `start-server-debug.bat`

This script starts the server with additional debugging information and verbose output.

**Usage:**
```
start-server-debug.bat
```

### 6. Direct Server Execution

**File:** `direct-start.js`

This script directly executes the server with environment variables set programmatically.

**Usage:**
```
node direct-start.js
```

### 7. Direct Persistent Server Execution

**File:** `start-server-direct-persistent.bat`

This script provides a reliable way to run the server persistently. It:
- Kills any existing process on port 5000
- Sets all required environment variables including IGNORE_SIGINT
- Starts the server using direct-start.js which has enhanced SIGINT handling
- Ignores SIGINT and SIGTERM signals in both parent and child processes

**Usage:**
```
start-server-direct-persistent.bat
```

### 8. Clean Server Start (Most Recommended)

**File:** `start-clean-server.bat`

This is the most robust solution that addresses both the SIGINT shutdown issue and port conflicts. It:
- Checks if port 5000 is available using a test server
- Intelligently kills any process using port 5000 if needed
- Verifies port availability after killing the process
- Sets all required environment variables including IGNORE_SIGINT
- Provides detailed colored console output for easier debugging
- Ignores SIGINT and SIGTERM signals in both parent and child processes
- Changes working directory to the server directory automatically

**Usage:**
```
start-clean-server.bat
```

## Testing Server Availability

To verify that the server is running correctly on port 5000, use one of these test scripts:

### 1. API Health Check

**File:** `test-server-running.js`

Tests the server's health endpoint to verify it's responding.

**Usage:**
```
node test-server-running.js
```

### 2. Comprehensive API Test

**File:** `test-api-port-5000.js`

Tests multiple API endpoints including health check and login functionality.

**Usage:**
```
node test-api-port-5000.js
```

## Troubleshooting

If the server continues to shut down unexpectedly or fails to start:

1. **Use the recommended start-clean-server.bat script** which has been specially designed to solve both SIGINT shutdown issues and port conflicts
2. Check for other processes that might be sending SIGINT signals
3. If you get an EADDRINUSE error, use the kill-port-5000.bat script to free up port 5000
4. Check the server logs for any error messages in server_output.log
5. Try running the server with the `IGNORE_SIGINT=true` environment variable
6. Consider using the Windows Service option for production environments
7. If all else fails, restart your computer to ensure all ports are freed

## Environment Variables

- `PORT=5000`: Sets the server port to 5000
- `NODE_ENV=development`: Runs the server in development mode
- `IGNORE_SIGINT=true`: Prevents the server from shutting down when it receives a SIGINT signal

## Accessing the Application

- Backend API: http://localhost:5000
- Frontend: http://localhost:8080/vtria-erp/
- Default admin credentials: admin@vtria.com / VtriaAdmin@2024
