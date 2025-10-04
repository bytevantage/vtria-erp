# VTRIA ERP System - Complete Documentation

<div align="center">
  <h1>VTRIA ERP</h1>
  <h3>Engineering Solutions Management System</h3>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
  [![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
  
  A comprehensive Enterprise Resource Planning (ERP) system built specifically for **VTRIA Engineering Solutions Pvt Ltd**, supporting multi-location operations across Mangalore, Bangalore, and Pune.
</div>

---

## 📋 Table of Contents
- [System Overview](#-system-overview)
- [Quick Start Guide](#-quick-start-guide)
- [Production Deployment](#-production-deployment)
- [Security Policy](#-security-policy)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Core Features](#-core-features)
- [Development Guide](#-development-guide)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Support & Contact](#-support--contact)

---

## 🎯 System Overview

VTRIA ERP is a production-ready Enterprise Resource Planning system designed for engineering solutions companies. The system provides comprehensive case management, inventory tracking, document generation, and workflow automation across multiple business locations.

### Key Capabilities
- **Multi-Location Operations**: Real-time coordination across Mangalore (2 locations), Bangalore, and Pune
- **Case-Driven Workflow**: End-to-end tracking from sales enquiry to delivery
- **Document Automation**: Automated PDF generation with digital signatures
- **Role-Based Security**: Granular access control with location-based permissions
- **Real-Time Analytics**: Live dashboards and custom reporting

---

## 🚀 Quick Start Guide

### VTRIA Utility Script

The project includes a comprehensive utility script for all common operations:

```bash
# Quick start development
./vtria-utils.sh dev

# System management
./vtria-utils.sh start|stop|restart|status
./vtria-utils.sh cleanup|health-check

# Development tools
./vtria-utils.sh build|test|lint|format

# Production deployment
./vtria-utils.sh docker-start|backup|deploy

# See all available commands
./vtria-utils.sh
```

### Development Workflow (MacBook)

```bash
# 1. Start development environment
./vtria-utils.sh dev
# OR: docker-compose up -d

# 2. Sync development tools (if needed)
./scripts/sync-development.sh

# 3. Work with any AI tool:
# - Claude Code (primary)
# - VS Code + GitHub Copilot + Claude Sonnet 4
# - Windsurfer + Claude (web-based)

# 4. Commit changes
git add .
git commit -m "feat: your feature description"
git push
```

### Local Development Setup

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd vtria-erp
npm install

# 2. Backend setup
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials

# 3. Database setup
createdb vtria_erp_dev
npm run seed

# 4. Frontend setup
cd ../client
npm install

# 5. Start development servers
# Terminal 1 - Backend (port 3001)
cd api && npm run dev

# Terminal 2 - Frontend (port 3000)
cd client && npm start
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432

**Default Credentials:**
- Email: admin@vtria.com
- Password: VtriaAdmin@2024

---

## 🚀 Production Deployment

### Production-Ready Status
✅ All mock data removed  
✅ Database connection errors handled properly  
✅ Environment variables configured  
✅ Docker configurations optimized  
✅ Security settings enabled  

### 1. Database Setup

```bash
# Create the database (MySQL)
mysql -u root -p
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'%' IDENTIFIED BY 'secure_production_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Environment Configuration

**API Server (.env)**
```env
NODE_ENV=production
PORT=3001
BYPASS_AUTH=false
FRONTEND_URL=http://your-domain.com
DB_HOST=localhost
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=secure_production_password
DB_NAME=vtria_erp
JWT_SECRET=your_secure_random_jwt_secret_here
```

**Client (.env)**
```env
REACT_APP_API_URL=http://your-domain.com:3001
REACT_APP_LICENSE_SERVER_URL=https://api.bytevantage.in
REACT_APP_NAME=VTRIA ERP System
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

### 3. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d --build

# Or build separately
cd api && docker build -t vtria-erp-api:production --target production .
cd client && docker build -t vtria-erp-client:production --target production .
```

### 4. Manual Deployment

```bash
# API Server
cd api
npm ci --only=production
NODE_ENV=production npm start

# Client (build and serve)
cd client
npm ci --only=production
npm run build
# Serve build folder with nginx or any web server
```

### Production URLs
- Frontend: `http://your-domain.com`
- API: `http://your-domain.com:3001`
- Health Check: `http://your-domain.com:3001/health`

### Backup Strategy

**Automated Backups:**
- 📅 Daily: 2:00 AM (database + files)
- 📅 Weekly: 1:00 AM Sunday (full system)
- 🔄 Retention: 30 days daily, 8 weeks weekly

**Emergency Procedures:**
```cmd
# If deployment fails
rollback-production.bat

# If system is corrupted
restore-recovery-point.bat

# Enable maintenance mode
maintenance-mode.bat on
```

---

## 🔒 Security Policy

### Authentication & Authorization

**JWT Configuration:**
- Token Expiration: 8 hours (regular), 24 hours (extended)
- Refresh Tokens: 30 days, stored in httpOnly cookies
- Token Rotation: Refresh tokens rotated on each use
- Secret Management: Minimum 256-bit random secrets

**Role-Based Access Control (RBAC):**
```javascript
const ROLES = {
  DIRECTOR: 'director',       // Full system access
  ADMIN: 'admin',            // All locations, most features
  SALES_ADMIN: 'sales-admin', // Sales, quotations, clients
  DESIGNER: 'designer',       // Estimations, technical drawings
  ACCOUNTS: 'accounts',       // Financial data, invoices
  TECHNICIAN: 'technician'    // Manufacturing, delivery
};

const LOCATIONS = {
  MANGALORE: 'mangalore',
  BANGALORE: 'bangalore', 
  PUNE: 'pune'
};
```

**Password Requirements:**
- Minimum 12 characters
- Must contain: uppercase, lowercase, number, special character
- Password history: prevent reuse of last 5 passwords
- Account lockout: 5 failed attempts = 15 minute lockout

### Data Protection

**Encryption Standards:**
- At Rest: AES-256 encryption for sensitive data
- In Transit: TLS 1.3 minimum, HTTPS only
- Database: Encrypt sensitive fields (passwords, PII, financial data)
- File Storage: Encrypt uploaded documents

**API Security:**
```javascript
const rateLimits = {
  auth: '5 requests per minute',      // Login/logout
  public: '100 requests per minute',   // Public endpoints
  private: '1000 requests per minute', // Authenticated endpoints
  upload: '10 requests per minute'     // File uploads
};
```

### Security Event Logging

```javascript
const securityEvents = {
  AUTHENTICATION: ['login_success', 'login_failure', 'logout', 'password_change'],
  AUTHORIZATION: ['permission_denied', 'role_change', 'elevated_access'],
  DATA_ACCESS: ['sensitive_data_access', 'bulk_data_export', 'data_modification'],
  SYSTEM: ['config_change', 'user_creation', 'user_deletion']
};
```

### File Upload Security

```javascript
const uploadSecurity = {
  allowedTypes: ['application/pdf', 'application/msword', 'image/jpeg', 'image/png'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  virusScanning: true,
  storageLocation: '/secure/uploads/',
  accessControl: 'private'
};
```

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI v5
- **State Management**: Redux Toolkit
- **Charts**: Chart.js for analytics
- **Form Handling**: React Hook Form
- **Testing**: Jest, React Testing Library

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT, OAuth2
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest

### Database
- **Primary**: PostgreSQL 14+ / MySQL 8+
- **ORM**: Sequelize
- **Migrations**: Sequelize CLI
- **Caching**: Redis

### DevOps
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack
- **Infrastructure**: AWS/GCP (Terraform)

---

## 🚀 Core Features

### Business Modules

**Case Management**
- End-to-end tracking from enquiry to delivery
- Stage-specific workflows with validation
- Automated document number generation
- Digital signature integration

**Inventory Management**
- Real-time stock tracking across 4 locations
- Multi-location transfer management
- Automated reorder point alerts
- Serial number and warranty tracking

**Document Generation**
- Automated PDF generation for quotes, POs, invoices
- Template-based document creation
- Version control and audit trails
- Digital signature workflow

**Manufacturing Workflow**
- Technician task assignment and tracking
- Production schedule management
- Quality control checkpoints
- Delivery coordination

**Purchase Management**
- Vendor comparison and evaluation
- Purchase requisition workflow
- Automated purchase order generation
- Goods receipt note processing

### Key Features

**Multi-Location Support:**
- Mangalore (2 locations)
- Bangalore
- Pune
- Real-time inventory synchronization

**Document Management:**
- Automated document numbering (VESPL/XX/2526/XXX format)
- Digital signatures and approvals
- Version control and history
- Secure file storage

**Reporting & Analytics:**
- Real-time dashboards
- Custom report generation
- Export to Excel/PDF
- Advanced filtering and search

---

## 🛠 Development Guide

### Running Locally

**Development Mode:**
```bash
# Start all services
yarn dev
```

**Production Build:**
```bash
# Build the application
yarn build

# Start in production mode
yarn start
```

### Testing

```bash
# Run all tests
yarn test

# Run client tests
cd client && yarn test

# Run API tests
cd api && yarn test
```

### Code Quality

```bash
# Lint code
yarn lint

# Format code
yarn format

# Check for security vulnerabilities
yarn audit
```

### Pre-deployment Security Checks
1. Static Code Analysis: Automated security scanning
2. Dependency Audit: Check for known vulnerabilities
3. Configuration Review: Verify security settings
4. Access Control Test: Verify role-based permissions
5. Data Protection: Confirm encryption implementation

---

## 📚 API Documentation

API documentation is available at `/api-docs` when running the development server.

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Core Business Endpoints
- `GET /api/sales-enquiry` - Sales enquiry management
- `GET /api/estimation` - Estimation system
- `GET /api/quotation` - Quotation management  
- `GET /api/sales-order` - Sales order processing
- `GET /api/case-management` - Case workflow & stage management

### Cases Management
- `GET /api/cases` - List cases with filtering
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case

### Stock Management
- `GET /api/stock` - List stock items by location
- `POST /api/stock` - Add new stock item
- `PUT /api/stock/:id` - Update stock item

### User Management (Admin Only)
- `GET /api/users` - List all users
- `PUT /api/users/:id/roles` - Assign roles to user

---

## 📁 Project Structure

```
vtria-erp/
├── api/                          # Backend API
│   ├── src/
│   │   ├── config/              # Database and app configuration
│   │   ├── controllers/         # API controllers
│   │   ├── middleware/          # JWT auth, validation, etc.
│   │   ├── models/             # Sequelize database models
│   │   ├── routes/             # Express API routes
│   │   └── utils/              # Utilities and helpers
│   ├── package.json
│   └── .env
├── client/                       # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # React contexts (Auth, etc.)
│   │   ├── hooks/             # Custom React hooks
│   │   └── pages/             # Application pages
│   └── package.json
├── docker-compose.yml           # Docker configuration
├── scripts/                     # Deployment and utility scripts
└── VTRIA-ERP-DOCUMENTATION.md  # This consolidated documentation
```

### Core Database Models

**Core Entities:**
- **Users**: Employee information with multi-role support
- **Roles**: RBAC roles with permissions
- **Cases**: Engineering cases and support tickets
- **Stock**: Multi-location inventory management
- **Locations**: Office locations (Mangalore, Bangalore, Pune)
- **Documents**: File attachments and generated reports
- **Notifications**: System alerts and messages

**Key Relationships:**
- Users ↔ Roles (Many-to-Many)
- Users ↔ Locations (Many-to-Many)
- Cases → Users (Assigned To, Created By)
- Stock → Locations
- Documents → Cases

---

## 🧪 Testing & Quality Assurance

### Testing Strategy
```bash
# Backend tests
cd api && npm test

# Frontend tests
cd client && npm test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

### Quality Gates
- Unit test coverage: >80%
- Integration test coverage: >70%
- Security vulnerability scan: Pass
- Performance benchmarks: Meet SLA requirements
- Code quality score: A grade minimum

---

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check if database is accessible
mysql -h localhost -u vtria_user -p vtria_erp

# Verify environment variables
echo $DB_HOST $DB_USER $DB_NAME
```

### API Not Responding
```bash
# Check health endpoint
curl http://localhost:3001/health

# Check logs
docker logs vtria-erp-api
# or
tail -f api/logs/combined.log
```

### Client Build Issues
```bash
# Check environment variables
cat client/.env

# Clear cache and rebuild
cd client
rm -rf node_modules build
npm install
npm run build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Standards
- Follow ESLint and Prettier configurations
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all security checks pass
- Follow conventional commit messages

---

## 📧 Support & Contact

### Technical Support
- **Email**: support@vtria.com
- **Developer Contact**: [Your contact information]
- **System Admin**: [Admin contact]
- **Emergency**: [Emergency contact]

### Reporting Issues
- **Security Issues**: security@vtria.in
- **Bug Reports**: Use GitHub issues
- **Feature Requests**: Contact development team

### Business Contact
- **Email**: contact@vtria.in
- **Website**: https://www.vtria.in
- **Address**: Company Address, Mangalore
- **Phone**: +91 XXXXXXXXXX

---

## 📄 License & Acknowledgments

This project is proprietary software of VTRIA Engineering Solutions Pvt Ltd.

### Acknowledgments
- [Material-UI](https://mui.com/) for the UI component library
- [React](https://reactjs.org/) for the frontend framework
- [Express](https://expressjs.com/) for the backend framework
- [Sequelize](https://sequelize.org/) for database ORM
- All open-source projects that made this system possible

---

## 🔄 Version History

- **v1.0.0** - Initial production release
  - Case/Ticket management system
  - Multi-location stock tracking
  - User management with RBAC
  - Document management and generation
  - Dashboard with analytics
  - Production-ready deployment
  - Comprehensive security implementation

---

**Built with ❤️ for VTRIA Engineering Solutions Pvt Ltd**

*Last Updated: 2025-01-XX*  
*Version: 1.0.0*  
*Status: ✅ Production Ready*