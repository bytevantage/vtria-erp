# ByteVantage Licensing Server

A comprehensive Node.js + Express.js licensing server for managing software licenses with PostgreSQL database backend. This server provides REST APIs for license validation, generation, and management with HTTPS support.

## Features

- **License Management**: Generate, validate, and manage software licenses
- **Client Management**: Manage client information and license assignments
- **API Key Authentication**: Secure API access with rate limiting
- **Usage Analytics**: Track license usage and validation statistics
- **Rate Limiting**: Configurable rate limits per API key
- **Comprehensive Logging**: Winston-based logging with multiple transports
- **Database Transactions**: PostgreSQL with connection pooling
- **Security**: Helmet.js security headers, CORS, input validation

## Installation

1. **Clone and Setup**
```bash
cd c:\wamp64\www\vtria-erp\licensing-server
npm install
```

2. **Environment Configuration**
```bash
copy .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb bytevantage_licenses

# Run migrations
npm run migrate
```

4. **Start Server**
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3001
DOMAIN=licenses.bytevantage.in

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bytevantage_licenses
DB_USER=bytevantage_user
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your-jwt-secret
API_KEY_SECRET=your-api-key-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## API Endpoints

### License Management

#### Validate License
```http
POST /api/licenses/validate
Content-Type: application/json
X-API-Key: your-api-key

{
  "license_key": "VTRIA-CLIENT01-12345678-ABCD1234-EF56",
  "client_info": {
    "ip": "192.168.1.100",
    "hostname": "client-machine"
  },
  "usage_data": {
    "active_users": 5,
    "active_locations": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "status": "active",
    "license": {
      "id": "uuid",
      "client_name": "VTRIA Engineering Solutions",
      "product_name": "VTRIA ERP System",
      "expiry_date": "2025-12-31",
      "max_users": 50,
      "current_users": 5,
      "max_locations": 5,
      "current_locations": 2,
      "features": {
        "modules": ["cases", "tickets", "stock"],
        "storage_gb": 25
      },
      "is_trial": false
    }
  }
}
```

#### Generate License
```http
POST /api/licenses/generate
Content-Type: application/json
X-API-Key: your-api-key

{
  "client_id": "client-uuid",
  "product_id": "product-uuid",
  "license_name": "VTRIA ERP License",
  "expiry_date": "2025-12-31",
  "max_users": 50,
  "max_locations": 5,
  "features": {
    "modules": ["cases", "tickets", "stock", "documents"],
    "storage_gb": 25,
    "api_calls_per_hour": 5000
  },
  "is_trial": false
}
```

#### Get License Information
```http
GET /api/licenses/{license_key}
X-API-Key: your-api-key
```

#### Update License Status
```http
PUT /api/licenses/{license_key}/status
Content-Type: application/json
X-API-Key: your-api-key

{
  "status": "suspended",
  "reason": "Payment overdue"
}
```

#### Get License Usage Statistics
```http
GET /api/licenses/{license_key}/usage?days=30
X-API-Key: your-api-key
```

### Client Management

#### List Clients
```http
GET /api/clients?page=1&limit=20&search=vtria&type=enterprise
X-API-Key: your-api-key
```

#### Create Client
```http
POST /api/clients
Content-Type: application/json
X-API-Key: your-api-key

{
  "client_name": "VTRIA Engineering Solutions",
  "email": "admin@vtria.com",
  "client_type": "enterprise",
  "contact_person": "John Doe",
  "phone": "+91-824-1234567",
  "company": "VTRIA Engineering Solutions Pvt Ltd",
  "address": "Mangalore, Karnataka, India",
  "city": "Mangalore",
  "state": "Karnataka",
  "country": "India"
}
```

#### Get Client Details
```http
GET /api/clients/{client_id}
X-API-Key: your-api-key
```

#### Get Client Licenses
```http
GET /api/clients/{client_id}/licenses?status=active
X-API-Key: your-api-key
```

### System Endpoints

#### Health Check
```http
GET /health
```

#### API Status
```http
GET /api/status
```

## License Key Format

License keys follow the format: `PRODUCT-CLIENT-TIMESTAMP-RANDOM-CHECKSUM`

Example: `VTRIA-CLIENT01-1A2B3C4D-ABCD1234-EF56`

- **PRODUCT**: Product code (2-6 characters)
- **CLIENT**: Client code (2-8 characters)  
- **TIMESTAMP**: Base36 encoded timestamp (8 characters)
- **RANDOM**: Random hex string (8 characters)
- **CHECKSUM**: MD5 checksum for validation (4 characters)

## Database Schema

### Core Tables

- **clients**: Client information and contact details
- **products**: Available products for licensing
- **licenses**: License keys and configurations
- **license_validations**: Validation history and analytics
- **license_usage**: Daily usage statistics
- **license_features**: Individual feature settings
- **api_keys**: API key management
- **notifications**: License-related notifications

### Key Features

- **JSONB Fields**: Flexible storage for features, restrictions, and metadata
- **UUID Primary Keys**: Globally unique identifiers
- **Audit Trails**: Comprehensive logging of all operations
- **Indexes**: Optimized for performance
- **Constraints**: Data integrity enforcement

## Integration with VTRIA ERP

The licensing server integrates with the VTRIA ERP system through the license middleware:

```javascript
// In VTRIA ERP server/src/middleware/license.js
const response = await axios.post('https://licenses.bytevantage.in/api/licenses/validate', {
  license_key: process.env.LICENSE_KEY,
  client_info: {
    ip: req.ip,
    hostname: os.hostname()
  },
  usage_data: {
    active_users: await getActiveUserCount(),
    active_locations: await getActiveLocationCount()
  }
}, {
  headers: {
    'X-API-Key': process.env.BYTEVANTAGE_API_KEY,
    'Content-Type': 'application/json'
  }
});
```

## Security Features

- **API Key Authentication**: All endpoints require valid API keys
- **Rate Limiting**: Configurable limits per API key
- **Input Validation**: Comprehensive request validation
- **HTTPS Support**: SSL/TLS encryption
- **CORS Configuration**: Cross-origin request handling
- **Security Headers**: Helmet.js security middleware
- **Audit Logging**: Complete operation audit trail

## Monitoring and Logging

### Log Files

- `logs/licensing-server.log`: General application logs
- `logs/error.log`: Error logs only
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Unhandled promise rejections

### Metrics

- License validation response times
- API key usage statistics
- Database query performance
- Error rates and patterns

## Deployment

### Production Setup

1. **SSL Certificate**: Configure HTTPS with valid SSL certificates
2. **Environment**: Set `NODE_ENV=production`
3. **Database**: Use production PostgreSQL instance
4. **Logging**: Configure log rotation
5. **Monitoring**: Set up application monitoring
6. **Backup**: Regular database backups

RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {
      // Additional error details
    }
  }
}
```

## Support

For technical support or issues:
- Check application logs in the `logs/` directory
- Review database connection and configuration
- Verify API key permissions and rate limits
- Contact ByteVantage support team

## License

This software is proprietary to ByteVantage Solutions. All rights reserved.

---

**ByteVantage Licensing Server v1.0.0**  
*Secure Software License Management*
