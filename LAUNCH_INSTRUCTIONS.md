# VTRIA ERP System - Launch Instructions

## Prerequisites

### 1. System Requirements
- Node.js (v16 or higher)
- MySQL Server (v8.0 or higher)
- npm or yarn package manager

### 2. Database Setup
```bash
# Create MySQL database and user
mysql -u root -p
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Quick Launch Steps

### Step 1: Install Dependencies
```bash
# Backend dependencies
cd api
npm install

# Frontend dependencies
cd ../client
npm install
```

### Step 2: Database Migration
```bash
# Run database migrations
cd ../api
npm run migrate
# OR manually run:
node src/database/migrate.js
```

### Step 3: Start Backend Server
```bash
# From api directory
npm run dev
# OR
npm start

# Server will start on http://localhost:3001
```

### Step 4: Start Frontend Application
```bash
# From client directory (new terminal)
npm start

# Application will open on http://localhost:3000
```

## Configuration

### Environment Variables (api/.env)
- `PORT=3001` - Backend server port
- `DB_HOST=localhost` - MySQL host
- `DB_USER=vtria_user` - Database user
- `DB_PASS=dev_password` - Database password
- `DB_NAME=vtria_erp` - Database name
- `BYPASS_AUTH=true` - Skip authentication for development

### Default Access
- No authentication required (BYPASS_AUTH=true)
- All features accessible without login
- Default user role: admin

## Testing Workflow

### 1. Sales Enquiry Flow
1. Navigate to "Sales Enquiry"
2. Create new enquiry (VESPL/EQ/2526/XXX)
3. Assign to designer
4. Move to estimation

### 2. Estimation & Quotation
1. Create estimation from enquiry
2. Add dynamic sections (Main Panel, Generator, etc.)
3. Add products with stock checking
4. Generate quotation with profit calculation

### 3. Manufacturing & Inventory
1. Test multi-location inventory
2. Create work orders
3. Assign to technicians
4. Track manufacturing progress

## Troubleshooting

### Database Connection Issues
```bash
# Check MySQL service
brew services start mysql  # macOS
sudo systemctl start mysql  # Linux

# Test connection
mysql -u vtria_user -p vtria_erp
```

### Port Conflicts
- Backend: Change PORT in api/.env
- Frontend: Set PORT=3001 in client/.env

### Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Features

- Hot reload enabled for both frontend and backend
- Debug endpoints available at `/api/debug`
- Comprehensive logging in `logs/` directory
- API documentation (if Swagger enabled)

## Production Deployment

1. Set `NODE_ENV=production`
2. Set `BYPASS_AUTH=false`
3. Configure proper JWT secrets
4. Set up SSL certificates
5. Configure reverse proxy (nginx)
6. Set up database backups

## Support

For issues or questions:
1. Check logs in `api/logs/`
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Check port availability
