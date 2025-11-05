# VTRIA ERP - Management Guide

## Quick Start & Stop Commands

From the project root directory (`/Users/srbhandary/Documents/Projects/vtria-erp`):

### 🚀 Starting the System

```bash
# Start in default mode (Docker)
npm start

# Start in development mode (without Docker, for coding)
npm run start:dev

# Start in production mode (Docker, optimized)
npm run start:prod
```

### 🛑 Stopping the System

```bash
# Stop all processes (Docker, Node.js, port cleanup)
npm run stop

# Or use the management script directly
./scripts/manage.sh stop
```

### 🔄 Restarting

```bash
# Stop and start in default mode
npm run restart
```

### 📊 Check Status

```bash
# See what's running (ports, processes, containers)
npm run status
```

### 📝 View Logs

```bash
# View application logs
npm run logs
```

### 👤 Setup Admin User

```bash
# Create initial admin user (after database reset)
npm run setup
```

---

## Management Script Commands

You can also use the management script directly for more control:

```bash
# Show all available commands
./scripts/manage.sh help

# Start/Stop operations
./scripts/manage.sh start
./scripts/manage.sh start-dev
./scripts/manage.sh start-prod
./scripts/manage.sh stop
./scripts/manage.sh restart

# Status and monitoring
./scripts/manage.sh status
./scripts/manage.sh logs

# Admin setup
./scripts/manage.sh setup-admin
```

---

## Docker-Specific Commands

If you're using Docker containers:

```bash
# Docker operations
npm run docker:start    # Start containers
npm run docker:stop     # Stop containers
npm run docker:status   # Show container status
npm run docker:logs     # Show container logs
npm run docker:cleanup  # Clean up containers and volumes
```

---

## Development Workflow

### 1. First Time Setup
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp
npm install
npm run setup  # Create admin user
```

### 2. Daily Development
```bash
npm run start:dev  # Start in dev mode
# ... do your work ...
npm run stop       # Stop when done
```

### 3. Production Deployment
```bash
npm run start:prod # Start in production mode
npm run status     # Verify everything is running
```

### 4. After Database Reset
```bash
npm run stop
npm run setup      # Recreate admin user
npm run start      # Start the system
```

---

## What Each Command Does

### `npm run start` (Default)
- Stops any existing processes
- Cleans up ports 3000, 3001, 3306, 6379
- Starts Docker containers
- Opens: http://localhost:3000

### `npm run start:dev` (Development)
- Stops any existing processes
- Cleans up ports
- Starts API server on port 3001
- Starts React app on port 3000
- No Docker required
- Better for development with hot reload

### `npm run stop`
- Kills Node.js processes
- Stops Docker containers
- Frees up all ports
- Complete cleanup

### `npm run status`
- Shows Docker container status
- Checks which ports are in use
- Shows running Node.js processes
- Gives you a complete system overview

---

## Troubleshooting

### "Port already in use" errors
```bash
npm run stop  # This will clean up all ports
npm start     # Then start again
```

### Docker issues
```bash
npm run docker:cleanup  # Clean up Docker completely
npm start               # Start fresh
```

### Something not working?
```bash
npm run status  # Check what's running
npm run logs    # Look at the logs
```

---

## Access Points

Once started, you can access:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **Health Check**: http://localhost:3001/health

---

## Need Help?

For additional support:
- Contact: srbhandary@bytevantage.in
- Website: www.bytevantage.in
- Company: Bytevantage Enterprise Solutions, Mangalore
