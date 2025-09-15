# VTRIA ERP Port Management Guide

This guide explains how to resolve port conflicts and connection issues with the VTRIA ERP system.

## 🚨 Common Issues

### "Error connecting to server. Please check if the API is running."

This typically happens when:
- The API server port changes due to port conflicts
- Processes aren't properly terminated after abrupt shutdown
- Multiple instances of the server are running

## 🛠️ Solutions

### 1. Quick Fix - Use Development Scripts

**For macOS/Linux:**
```bash
npm run dev
```

**For Windows:**
```bash
npm run dev:win
```

These scripts automatically:
- Clean up occupied ports
- Start API server on available port
- Update client configuration
- Launch client application

### 2. Manual Port Management

#### Check Port Status
```bash
npm run ports:check
```

#### Clean Up All Ports
```bash
npm run ports:cleanup
```

#### Monitor Ports Continuously
```bash
npm run ports:monitor
```

### 3. Advanced Port Utilities

#### Port Checker Script
```bash
node scripts/check-ports.js [command]
```

Commands:
- `check` - Show current port status
- `cleanup` - Kill processes on development ports  
- `monitor` - Continuous monitoring
- `help` - Show help

#### Manual Port Cleanup (macOS/Linux)
```bash
# Find process using port 3001
lsof -ti:3001

# Kill process on port 3001
kill -9 $(lsof -ti:3001)

# Kill multiple ports
for port in 3000 3001 3002; do kill -9 $(lsof -ti:$port) 2>/dev/null; done
```

#### Manual Port Cleanup (Windows)
```cmd
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

## 🏗️ Architecture Overview

### Server-Side Port Management

The API server (`api/src/server.js`) now includes:

1. **Intelligent Port Detection**
   - Tries preferred port (3001) first
   - Automatically finds alternative ports (3002-3010)
   - Kills conflicting processes when possible

2. **Graceful Shutdown**
   - Proper cleanup on SIGTERM/SIGINT
   - Port release before exit
   - Database connection cleanup

3. **Port Lock Files**
   - Creates `.port-locks/` directory
   - Tracks active services by port
   - Automatic cleanup on exit

### Client-Side Connection Management

The React client (`client/src/utils/apiConnectionManager.js`) features:

1. **Dynamic Server Discovery**
   - Tests multiple potential API URLs
   - Automatic reconnection on port changes
   - Health monitoring every 30 seconds

2. **Retry Logic**
   - 3 automatic retry attempts
   - Exponential backoff delay
   - Graceful error handling

3. **Connection Status UI**
   - Real-time connection indicator
   - Manual retry functionality
   - Detailed connection diagnostics

## 📋 Port Configuration

### Default Port Assignments
```
3000 - React Development Server
3001 - API Server (Primary)
3002 - API Server (Fallback #1)
3003 - API Server (Fallback #2)
3004 - API Server (Fallback #3)
3005 - API Server (Fallback #4)
5000 - API Server (Alternative)
```

### Environment Configuration

**API Server (.env)**
```
PORT=3001
```

**Client (.env)**
```
REACT_APP_API_URL=http://localhost:3001
```

The system automatically updates these configurations when ports change.

## 🔧 Troubleshooting

### Issue: "Port already in use"
**Solution:**
1. Run port cleanup: `npm run ports:cleanup`
2. Check for zombie processes: `npm run ports:check`
3. Restart with auto-cleanup: `npm run dev`

### Issue: "Cannot connect to API"
**Solution:**
1. Verify API server is running: `npm run ports:check`
2. Check connection status in UI (top-right corner)
3. Try manual reconnection from connection status dialog
4. Restart both servers: `npm run dev`

### Issue: "Connection keeps dropping"
**Solution:**
1. Check system resources (RAM, CPU)
2. Verify firewall/antivirus settings
3. Monitor ports: `npm run ports:monitor`
4. Check network stability

### Issue: "Multiple server instances"
**Solution:**
1. Stop all Node.js processes: `pkill -f node` (macOS/Linux)
2. Clean up ports: `npm run ports:cleanup`  
3. Restart cleanly: `npm run dev`

## 🚀 Best Practices

### Development Workflow
1. Always use `npm run dev` to start development
2. Use `Ctrl+C` to stop servers properly
3. Run `npm run ports:check` if you experience issues
4. Keep only one development instance running

### Production Deployment
1. Set fixed ports in production environment
2. Use process managers (PM2, forever) for stability
3. Implement health checks and monitoring
4. Configure reverse proxy for port management

### Debugging
1. Enable debug logging: `LOG_LEVEL=debug` in API .env
2. Monitor connection status in browser DevTools
3. Use `npm run ports:monitor` for real-time port tracking
4. Check server logs for detailed error information

## 🔍 Connection Status UI

The application now includes a connection status indicator in the top navigation bar:

- **Green with checkmark** - Connected successfully
- **Red with X** - Connection failed  
- **Gray with spinner** - Connecting/retrying

Click the status indicator for detailed connection information and manual retry options.

## 📞 Support

If you continue to experience port conflicts:

1. Run the diagnostic script: `npm run ports:check`
2. Gather logs from both API and client
3. Note your operating system and Node.js version
4. Check if other applications are using these ports
5. Consider using different port ranges in development

The enhanced port management system should resolve most connectivity issues automatically, providing a smoother development experience.