# VTRIA ERP Security Standards

## Overview
This document outlines the security standards and implementation guidelines for the VTRIA ERP system. All developers must follow these standards to ensure the security and integrity of the system.

## Authentication & Authorization

### JWT Configuration
- **Token Expiration**: 8 hours for regular sessions, 24 hours for extended sessions
- **Refresh Tokens**: 30 days expiration, stored in httpOnly cookies
- **Token Rotation**: Refresh tokens are rotated on each use
- **Secret Management**: Use strong, randomly generated secrets (minimum 256 bits)

### Role-Based Access Control (RBAC)
```javascript
// Role hierarchy (most to least privileged)
const ROLES = {
  DIRECTOR: 'director',       // Full system access
  ADMIN: 'admin',            // All locations, most features
  SALES_ADMIN: 'sales-admin', // Sales, quotations, clients
  DESIGNER: 'designer',       // Estimations, technical drawings
  ACCOUNTS: 'accounts',       // Financial data, invoices
  TECHNICIAN: 'technician'    // Manufacturing, delivery
};

// Location-based access
const LOCATIONS = {
  MANGALORE: 'mangalore',
  BANGALORE: 'bangalore', 
  PUNE: 'pune'
};
```

### Password Requirements
- Minimum 12 characters
- Must contain: uppercase, lowercase, number, special character
- Must not contain common patterns or dictionary words
- Password history: prevent reuse of last 5 passwords
- Account lockout: 5 failed attempts = 15 minute lockout

## Data Protection

### Encryption Standards
- **At Rest**: AES-256 encryption for sensitive data
- **In Transit**: TLS 1.3 minimum, HTTPS only
- **Database**: Encrypt sensitive fields (passwords, PII, financial data)
- **File Storage**: Encrypt uploaded documents

### Sensitive Data Classification
```javascript
// Level 1: Public (no encryption needed)
// - Product catalogs, general company info

// Level 2: Internal (basic protection)
// - Employee directories, internal communications

// Level 3: Confidential (encrypted at rest)
// - Client data, quotations, estimates
// - User credentials, session data

// Level 4: Restricted (encrypted + access logs)
// - Financial records, payment information
// - Director-level strategic data
```

### Data Sanitization
```javascript
// Input validation and sanitization
const sanitize = {
  // Remove HTML tags and scripts
  html: (input) => DOMPurify.sanitize(input),
  
  // SQL injection prevention
  sql: (input) => mysql.escape(input),
  
  // File upload validation
  file: (file) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    return allowedTypes.includes(path.extname(file.name)) && file.size <= maxSize;
  }
};
```

## API Security

### Rate Limiting
```javascript
// API rate limits by endpoint type
const rateLimits = {
  auth: '5 requests per minute',      // Login/logout
  public: '100 requests per minute',   // Public endpoints
  private: '1000 requests per minute', // Authenticated endpoints
  upload: '10 requests per minute'     // File uploads
};
```

### Request Validation
```javascript
// All API requests must be validated
const validation = {
  // Input sanitization
  sanitizeInput: true,
  
  // Request size limits
  maxRequestSize: '50MB',
  
  // Required headers
  requiredHeaders: ['Content-Type', 'Authorization'],
  
  // CORS configuration
  corsOrigins: ['https://vtria-erp.com', 'http://localhost:3000']
};
```

### Error Handling
```javascript
// Security-conscious error responses
const errorHandler = {
  // Never expose internal details
  production: {
    500: 'Internal server error',
    401: 'Authentication required',
    403: 'Access denied'
  },
  
  // Detailed errors only in development
  development: {
    includeStackTrace: true,
    includeInternalDetails: true
  }
};
```

## Database Security

### Connection Security
```javascript
// Secure database configuration
const dbConfig = {
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('path/to/ca-cert.pem'),
    cert: fs.readFileSync('path/to/client-cert.pem'),
    key: fs.readFileSync('path/to/client-key.pem')
  },
  
  // Connection pooling
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000
  }
};
```

### Query Security
- **Prepared Statements**: Always use parameterized queries
- **Principle of Least Privilege**: Database users have minimal required permissions
- **Query Logging**: Log all database operations in production
- **Backup Encryption**: All database backups are encrypted

## Logging & Monitoring

### Security Event Logging
```javascript
// Security events that must be logged
const securityEvents = {
  AUTHENTICATION: [
    'login_success',
    'login_failure', 
    'logout',
    'password_change',
    'account_lockout'
  ],
  
  AUTHORIZATION: [
    'permission_denied',
    'role_change',
    'elevated_access'
  ],
  
  DATA_ACCESS: [
    'sensitive_data_access',
    'bulk_data_export',
    'data_modification'
  ],
  
  SYSTEM: [
    'config_change',
    'user_creation',
    'user_deletion'
  ]
};
```

### Log Format
```javascript
// Structured logging format
const logEntry = {
  timestamp: '2025-09-15T10:30:00.000Z',
  level: 'INFO|WARN|ERROR|SECURITY',
  event: 'login_success',
  userId: 123,
  userRole: 'admin',
  location: 'mangalore',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  details: {
    // Event-specific details
  }
};
```

## Environment Security

### Environment Variables
```bash
# Required security environment variables
JWT_SECRET=256-bit-random-string
JWT_REFRESH_SECRET=256-bit-random-string
DB_ENCRYPTION_KEY=256-bit-random-string
API_RATE_LIMIT_SECRET=random-string
SESSION_SECRET=random-string

# External service credentials
SMTP_PASSWORD=encrypted-password
CLOUD_STORAGE_KEY=encrypted-key
PAYMENT_GATEWAY_SECRET=encrypted-secret
```

### Deployment Security
```yaml
# Docker security configuration
security_opt:
  - no-new-privileges:true
  - seccomp:unconfined
  
# Network security
networks:
  vtria_network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
```

## File Upload Security

### Upload Validation
```javascript
const uploadSecurity = {
  // File type validation
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png'
  ],
  
  // Size limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 100 * 1024 * 1024, // 100MB per request
  
  // Virus scanning
  virusScanning: true,
  
  // Storage security
  storageLocation: '/secure/uploads/',
  accessControl: 'private'
};
```

### File Processing
- **Quarantine**: All uploads quarantined and scanned
- **Metadata Stripping**: Remove potentially dangerous metadata
- **Content Validation**: Verify file headers match extensions
- **Access Control**: Role-based file access permissions

## Session Management

### Session Configuration
```javascript
const sessionConfig = {
  // Session storage
  store: 'redis', // Centralized session storage
  
  // Security settings
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  
  // Timeouts
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
  rolling: true, // Extend on activity
  
  // Session rotation
  regenerateOnLogin: true,
  destroyOnLogout: true
};
```

## Incident Response

### Security Incident Types
1. **Authentication Bypass**
2. **Data Breach**
3. **Unauthorized Access**
4. **DDoS Attack**
5. **Malware Detection**

### Response Procedures
1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Containment**: Prevent further damage
4. **Recovery**: Restore normal operations
5. **Post-Incident**: Analysis and improvements

## Compliance & Auditing

### Regular Security Audits
- **Code Reviews**: Security-focused code reviews
- **Penetration Testing**: Quarterly external testing
- **Vulnerability Scanning**: Weekly automated scans
- **Access Reviews**: Monthly user access audits

### Documentation Requirements
- All security configurations must be documented
- Security procedures must be updated quarterly
- Incident response plans reviewed annually
- Training materials updated with each release

## Development Security

### Secure Coding Practices
```javascript
// Security checklist for developers
const securityChecklist = {
  inputValidation: 'All inputs validated and sanitized',
  authentication: 'Proper authentication for all endpoints',
  authorization: 'Role-based access controls implemented',
  errorHandling: 'No sensitive data in error messages',
  logging: 'Security events properly logged',
  encryption: 'Sensitive data encrypted at rest and in transit',
  dependencies: 'All dependencies regularly updated',
  secrets: 'No hardcoded secrets in code'
};
```

### Pre-deployment Security Checks
1. **Static Code Analysis**: Automated security scanning
2. **Dependency Audit**: Check for known vulnerabilities
3. **Configuration Review**: Verify security settings
4. **Access Control Test**: Verify role-based permissions
5. **Data Protection**: Confirm encryption implementation

## Emergency Procedures

### Security Breach Response
1. **Immediate Actions**:
   - Isolate affected systems
   - Preserve evidence
   - Notify security team
   
2. **Communication**:
   - Internal notification within 1 hour
   - Customer notification within 24 hours (if applicable)
   - Regulatory notification per compliance requirements

3. **Recovery**:
   - Restore from secure backups
   - Implement additional security measures
   - Monitor for continued threats

---

## Implementation Status

✅ **Completed**:
- Security documentation
- Basic security guidelines
- Incident response procedures

🔄 **In Progress**:
- Security middleware implementation
- Authentication system hardening
- Logging and monitoring setup

📋 **Pending**:
- Security testing implementation
- Compliance audit procedures
- Advanced threat detection

---

*Last Updated: 2025-09-15*
*Version: 1.0*
*Next Review: 2025-12-15*