<div align="center">
  <h1>VTRIA ERP</h1>
  <h3>Engineering Solutions Management System</h3>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)
  [![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
  [![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)](#production-deployment)

  A comprehensive Enterprise Resource Planning (ERP) system built specifically for **VTRIA Engineering Solutions Pvt Ltd**, supporting multi-location operations across Mangalore, Bangalore, and Pune.

  **📋 [Complete Documentation](./VTRIA-ERP-DOCUMENTATION.md) | 🚀 [Quick Start](#quick-start) | 🔒 [Production Deployment](#production-deployment)**
</div>

## 📌 Table of Contents
- [Quick Start](#-quick-start)
- [Production Deployment](#-production-deployment)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Development](#-development)
- [Contributing](#-contributing)
- [Documentation](#-documentation)
- [Support](#-support)

## 🚀 Quick Start

### Local Development
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
# Option 1: Use the utility script (recommended)
./vtria-utils.sh dev

# Option 2: Manual start
# Terminal 1 - Backend (port 3001)
cd api && npm run dev

# Terminal 2 - Frontend (port 3000)  
cd client && npm start
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

**Default Credentials:**
- Email: admin@vtria.com
- Password: VtriaAdmin@2024

## 🔒 Production Deployment

### Quick Production Setup
```bash
# 1. Database setup (MySQL)
mysql -u root -p
CREATE DATABASE vtria_erp;
CREATE USER 'vtria_user'@'%' IDENTIFIED BY 'secure_production_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'%';

# 2. Environment configuration
# Update api/.env and client/.env with production settings

# 3. Docker deployment  
docker-compose up -d --build
# Or use utility script: ./vtria-utils.sh docker-start

# 4. Verify deployment
curl http://localhost:3001/health
# Or use utility script: ./vtria-utils.sh health-check
```

**Production Status:** ✅ Ready for Production Use
- All mock data removed
- Environment variables configured
- Database connection handling implemented
- Security settings enabled

## 🏗️ Architecture

- **Backend**: Node.js + Express.js with MySQL/PostgreSQL database
- **Frontend**: React.js with Material-UI components  
- **Authentication**: JWT-based with Role-Based Access Control (RBAC)
- **Database**: MySQL/PostgreSQL with Sequelize ORM
- **Charts**: Chart.js for analytics and reporting

## 🚀 Features

### Core Modules
- **Case Management**: End-to-end tracking from enquiry to delivery
- **Inventory Management**: Real-time stock tracking across 4 locations
- **Document Generation**: Automated PDF generation for quotes, POs, and invoices
- **Manufacturing Workflow**: Technician task management and tracking
- **Purchase Management**: Vendor comparison and procurement workflow
- **Warranty Tracking**: Serial number and warranty management

### Key Features
- **Multi-Location Support**: Real-time inventory across all offices
  - Mangalore (2 locations)
  - Bangalore
  - Pune
- **Role-Based Access Control**:
  - **Director**: Full system access
  - **Admin**: All locations, most features
  - **Sales Admin**: Sales, quotations, clients
  - **Designer**: Estimations, technical drawings
  - **Accounts**: Financial data, invoices
  - **Technician**: Manufacturing, delivery
- **Document Management**:
  - Automated document numbering (VESPL/XX/2526/XXX format)
  - Digital signatures
  - Version control
- **Reporting & Analytics**:
  - Real-time dashboards
  - Custom report generation
  - Export to Excel/PDF

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18
- **UI Library**: Material-UI v5
- **State Management**: Redux Toolkit
- **Charts**: Chart.js
- **Form Handling**: React Hook Form
- **Testing**: Jest, React Testing Library

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT, OAuth2
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest, Supertest

### Database
- **Primary**: PostgreSQL 14+
- **ORM**: Sequelize
- **Migrations**: Sequelize CLI
- **Caching**: Redis

### DevOps
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK Stack
- **Infrastructure**: AWS/GCP (Terraform)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- Redis 6+
- Git
- Yarn or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/vtria-erp.git
   cd vtria-erp
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   yarn install
   
   # Install client dependencies
   cd client
   yarn install
   
   # Install server dependencies
   cd ../api
   yarn install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp client/.env.example client/.env
   cp api/.env.example api/.env
   ```
   Update the environment variables in each `.env` file as needed.

### Configuration

1. **Database Setup**
   ```bash
   # Create database
   createdb vtria_erp
   
   # Run migrations
   cd api
   npx sequelize-cli db:migrate
   
   # Seed initial data
   npx sequelize-cli db:seed:all
   cd ..
   ```

2. **Start the development servers**
   ```bash
   # Start backend server
   cd api
   yarn dev
   
   # In a new terminal, start frontend
   cd ../client
   yarn start
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:5000/api-docs
   - Adminer (Database UI): http://localhost:8080

## 🚧 Development

### Running Locally

#### Development Mode
```bash
# Start all services in development mode
yarn dev
```

#### Production Build
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
cd client
yarn test

# Run API tests
cd ../api
yarn test
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

## 🚀 Deployment

### Docker

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Kubernetes (Optional)

```bash
# Apply Kubernetes configurations
kubectl apply -f k8s/

# Monitor deployment
kubectl get pods -n vtria-erp
```

## 📚 API Documentation

API documentation is available at `/api-docs` when running the development server. The API follows RESTful principles and uses JWT for authentication.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📚 Documentation

For comprehensive documentation including security policies, API references, deployment guides, and troubleshooting, see:

**[📋 VTRIA-ERP-DOCUMENTATION.md](./VTRIA-ERP-DOCUMENTATION.md)**

This consolidated documentation includes:
- Complete production deployment guide
- Security policies and best practices
- API documentation and examples
- Troubleshooting and maintenance
- Architecture details and database schemas

## 🆘 Support

For technical support or questions:
- **Email**: support@vtria.com
- **Business Contact**: contact@vtria.in
- **Website**: https://www.vtria.in

## 📄 License

This project is proprietary software of VTRIA Engineering Solutions Pvt Ltd.

## 🙏 Acknowledgments

- [Material-UI](https://mui.com/)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- And all other amazing open-source projects used in this project.

## 📁 Project Structure

```
vtria-erp/
├── server/                     # Backend API
│   ├── src/
│   │   ├── config/            # Database and app configuration
│   │   ├── middleware/        # JWT auth, validation, etc.
│   │   ├── models/           # Sequelize database models
│   │   ├── routes/           # Express API routes
│   │   └── utils/            # Utilities and helpers
│   ├── package.json
│   └── .env.example
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   └── pages/           # Application pages
│   └── package.json
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vtria-erp
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb vtria_erp_dev
   
   # Run database seeding
   npm run seed
   ```

4. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev
   
   # Terminal 2 - Frontend
   cd client
   npm start
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

## 🔐 Default Credentials

After running the database seed script:

- **Email**: admin@vtria.com
- **Password**: VtriaAdmin@2024

## 📊 Database Models

### Core Entities
- **Users**: Employee information with multi-role support
- **Roles**: RBAC roles with permissions
- **Cases**: Engineering cases and support tickets
- **Stock**: Multi-location inventory management
- **Locations**: Office locations (Mangalore, Bangalore, Pune)
- **Documents**: File attachments and generated reports
- **Notifications**: System alerts and messages

### Key Relationships
- Users ↔ Roles (Many-to-Many)
- Users ↔ Locations (Many-to-Many)
- Cases → Users (Assigned To, Created By)
- Stock → Locations
- Documents → Cases

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

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

### Documents
- `POST /api/documents/upload` - Upload files
- `GET /api/documents` - List documents

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

## 🎨 Frontend Components

### Pages
- **Dashboard**: Overview with charts and metrics
- **Cases**: DataGrid with case management
- **Stock**: Multi-location inventory tracking
- **Users**: Admin interface for user management
- **Documents**: File upload and management
- **Profile**: User profile settings

### Key Features
- Responsive Material-UI design
- Role-based navigation
- Real-time notifications
- Chart.js integration for analytics
- Form validation with Formik + Yup
- React Query for API state management

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Location-based data access
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet.js security headers

## 📈 Monitoring & Logging

- Winston logging with multiple transports
- Health check endpoints
- Error tracking and reporting

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
NODE_ENV=production npm start
```


## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vtria_erp_dev
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is proprietary software of VTRIA Engineering Solutions Pvt Ltd.

## 🆘 Support

For technical support or questions:
- Email: support@vtria.com
- Internal Documentation: Available in the system

## 🔄 Version History

- **v1.0.0** - Initial release with core ERP functionality
  - Case/Ticket management
  - Multi-location stock tracking
  - User management with RBAC
  - Document management
  - Dashboard with analytics

---

**Built with ❤️ for VTRIA Engineering Solutions Pvt Ltd**
