# VTRIA ERP - Engineering Solutions Management System

A comprehensive Enterprise Resource Planning (ERP) system built specifically for **VTRIA Engineering Solutions Pvt Ltd**, supporting multi-location operations across Mangalore, Bangalore, and Pune.

## 🏗️ Architecture

- **Backend**: Node.js + Express.js with PostgreSQL database
- **Frontend**: React.js with Material-UI components
- **Authentication**: JWT-based with Role-Based Access Control (RBAC)
- **Database**: PostgreSQL with Sequelize ORM
- **Charts**: Chart.js for analytics and reporting

## 🚀 Features

### Core Modules
- **Case/Ticket Management**: Engineering case tracking with status updates
- **Multi-Location Stock Management**: Inventory tracking across all offices
- **Document Management**: File uploads and PDF generation
- **User Management**: Role-based access control with multi-group support
- **Notifications**: Real-time alerts and system notifications
- **Dashboard**: Analytics with charts and key metrics

### Role-Based Access Control
- **Director**: Full system access and administration
- **Manager**: Management level access with reporting capabilities
- **Sales Admin**: Sales and customer management
- **Engineer**: Technical case handling and stock management
- **User**: Basic read-only access

### Multi-Location Support
- **Mangalore Office** (MNG)
- **Bangalore Office** (BLR)
- **Pune Office** (PUN)

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
