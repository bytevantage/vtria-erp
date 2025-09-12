# VTRIA ERP Ticketing System Implementation

## Overview

The VTRIA ERP Ticketing System provides comprehensive support ticket management with queue-based workflow, warranty tracking, role-based access control, and seamless integration with the existing case lifecycle module.

## Features Implemented

### 🎫 Core Ticketing System
- **Queue-based Workflow**: Support Ticket → Diagnosis → Resolution → Closure
- **Multiple Ticket Types**: Support, Warranty, Maintenance, Installation, Training
- **Priority Management**: Critical, High, Medium, Low with SLA tracking
- **Customer Information**: Contact details, email, and communication history
- **Serial Number Tracking**: Product identification and warranty lookup

### 🛡️ Warranty Management
- **Comprehensive Warranty Tracking**: Vendor and customer warranty periods
- **Expiry Notifications**: Automated alerts for expiring warranties
- **Warranty Status Display**: Active, Expiring Soon, Expired, Not Applicable
- **Product Integration**: Links to stock items and product information
- **Warranty History**: Complete audit trail of warranty-related activities

### 📝 Ticket Notes System
- **Append-only Notes**: Complete audit trail with timestamps
- **Note Types**: General, Diagnosis, Resolution, Customer Communication, Internal
- **Visibility Controls**: Customer-visible vs internal notes
- **Time Tracking**: Minutes spent on each activity
- **Attachments Support**: File attachments with metadata

### 🔧 Parts Management
- **Parts Tracking**: Components used in ticket resolution
- **Cost Calculation**: Unit costs and total costs
- **Warranty on Parts**: Part-specific warranty periods
- **Supplier Integration**: Links to supplier information
- **Installation Tracking**: Installation dates and notes

### 👥 Role-Based Access Control
- **Director**: Full access to all tickets across all locations
- **Manager**: Full access to tickets in their location
- **Sales Admin**: Access to customer-facing tickets and closures
- **Engineer**: Access to tickets in their location, can modify and resolve
- **User**: Access only to assigned tickets with limited permissions

### 🔔 Notification System
- **Email Notifications**: HTML email templates with ticket details
- **In-app Notifications**: Real-time notifications in the application
- **Event-based Triggers**: Creation, assignment, status changes, warranty expiry
- **Recipient Management**: Role-based notification recipients
- **Notification History**: Complete audit trail of sent notifications

### 📊 Dashboard Integration
- **Ticket Overview**: Statistics by status, priority, and warranty
- **Chart.js Visualizations**: Workflow progress, priority distribution, timeline
- **Performance Metrics**: Resolution times, SLA compliance, satisfaction scores
- **Filter Options**: Advanced filtering by multiple criteria
- **Real-time Updates**: Live dashboard data with periodic refresh

### ⏰ Automated Scheduling
- **Warranty Updates**: Periodic warranty status updates
- **Expiry Notifications**: Daily warranty expiry alerts
- **Ticket Aging**: Hourly SLA breach detection
- **Overdue Alerts**: Daily notifications for overdue tickets

## Database Schema

### Tables Created
1. **tickets** - Main ticket information with workflow status
2. **ticket_notes** - Append-only notes with audit trail
3. **ticket_status_history** - Complete status change tracking
4. **ticket_parts** - Parts used in ticket resolution

### Key Fields
- **Ticket**: ID, number, title, description, priority, status, warranty info
- **Customer**: Name, contact, email for communication
- **Product**: Serial number, product ID, warranty details
- **Workflow**: Status, assigned user, location, SLA tracking
- **Resolution**: Time spent, parts used, customer satisfaction

## API Endpoints

### Ticket Management
- `POST /api/tickets` - Create new support ticket
- `GET /api/tickets` - List tickets with filtering and pagination
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket information
- `PUT /api/tickets/:id/status` - Update ticket status
- `PUT /api/tickets/:id/assign` - Assign ticket to user

### Notes and Communication
- `POST /api/tickets/:id/notes` - Add note to ticket
- `GET /api/tickets/:id/notes` - Get ticket notes
- `GET /api/tickets/:id/history` - Get status history

### Parts and Resolution
- `POST /api/tickets/:id/parts` - Add parts used
- `GET /api/tickets/:id/parts` - Get parts list

### Warranty and Analytics
- `GET /api/tickets/warranty/:serial_number` - Get warranty info
- `GET /api/tickets/warranty-expiring` - Get expiring warranties
- `GET /api/tickets/stats` - Get ticket statistics

## Integration Points

### Case Lifecycle Compatibility
- **Shared Models**: User, Location, Notification models
- **Related Cases**: Tickets can be linked to cases
- **Unified Notifications**: Single notification service
- **Common RBAC**: Same role-based access control
- **Shared Scheduling**: Integrated cron job management

### Existing System Integration
- **Database**: Uses existing PostgreSQL schema
- **Authentication**: JWT authentication with existing middleware
- **License Validation**: ByteVantage licensing server integration
- **Audit Logging**: Shared audit service for compliance
- **Email System**: Common SMTP configuration

## Workflow States

### Support Ticket Lifecycle
1. **Support Ticket** - Initial state when ticket is created
2. **Diagnosis** - Investigation and problem identification
3. **Resolution** - Implementing fix or solution
4. **Closure** - Ticket resolved and closed
5. **Rejected** - Ticket rejected (invalid/duplicate)
6. **On Hold** - Temporary pause (can transition to any state)

### Valid Transitions
- Support Ticket → Diagnosis, Rejected
- Diagnosis → Resolution, Support Ticket, Rejected
- Resolution → Closure, Diagnosis
- Rejected → Support Ticket
- Any State → On Hold
- On Hold → Any State

## Security Features

### Input Validation
- **express-validator**: Comprehensive input validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **File Upload Security**: Attachment validation

### Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-based Authorization**: Granular permission system
- **License Validation**: Integration with licensing server
- **Audit Logging**: Complete activity tracking

## Performance Optimizations

### Database Indexing
- **Primary Keys**: UUID with proper indexing
- **Foreign Keys**: Indexed relationships
- **Search Fields**: Indexed ticket numbers, serial numbers
- **Status Fields**: Indexed for filtering
- **Date Fields**: Indexed for time-based queries

### Caching Strategy
- **License Validation**: Cached license checks
- **Warranty Information**: Cached warranty lookups
- **Dashboard Data**: Periodic cache refresh
- **User Permissions**: Cached role permissions

## Testing Framework

### Comprehensive Test Suite
- **Ticket Creation**: Various ticket types and scenarios
- **Workflow Transitions**: Valid and invalid state changes
- **Warranty Tracking**: Serial number lookup and expiry
- **Role Permissions**: Access control validation
- **Dashboard Data**: Chart.js data generation
- **Notification System**: Email and in-app notifications

### Test Coverage
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Workflow Tests**: End-to-end ticket lifecycle
- **Permission Tests**: Role-based access validation
- **Performance Tests**: Dashboard data generation

## Deployment Configuration

### Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vtria_erp
DB_USER=vtria_user
DB_PASS=your_password

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
SMTP_FROM=noreply@vtria.com

# License Server
LICENSE_SERVER_URL=http://localhost:3001
LICENSE_API_KEY=your_api_key
LICENSE_KEY=your_license_key

# Frontend URL
FRONTEND_URL=http://localhost/vtria-erp
```

### WAMP Server Setup
- **Apache Proxy**: Routes /api requests to Node.js server
- **Port Configuration**: Node.js on port 3000, Apache on port 80
- **Static Files**: React frontend served by Apache
- **Database**: PostgreSQL with proper permissions

## Usage Examples

### Creating a Support Ticket
```javascript
const ticketData = {
  title: 'Printer Not Working',
  description: 'Office printer showing error code E001',
  customer_name: 'ABC Company Ltd',
  customer_contact: '+91-9876543210',
  customer_email: 'support@abc.com',
  priority: 'high',
  ticket_type: 'support',
  serial_number: 'HP-P1102-001',
  location_id: 'location-uuid'
};

const ticket = await TicketService.createTicket(ticketData, userId);
```

### Updating Ticket Status
```javascript
const updatedTicket = await TicketService.updateTicketStatus(
  ticketId,
  'diagnosis',
  userId,
  'Starting hardware diagnosis'
);
```

### Adding Resolution Notes
```javascript
const note = await TicketService.addTicketNote(ticketId, {
  note_type: 'resolution',
  note_text: 'Replaced toner cartridge and cleaned print heads',
  is_customer_visible: true,
  time_spent_minutes: 30
}, userId);
```

### Getting Warranty Information
```javascript
const warrantyInfo = await WarrantyHelper.getWarrantyDetails('HP-P1102-001');
console.log(`Warranty Status: ${warrantyInfo.warranty.status}`);
console.log(`Days Remaining: ${warrantyInfo.warranty.remaining_days}`);
```

## Monitoring and Maintenance

### Scheduled Tasks
- **Warranty Updates**: Every 6 hours
- **Expiry Notifications**: Daily at 9 AM
- **Ticket Aging**: Every hour
- **Overdue Alerts**: Daily at 10 AM

### Health Checks
- **Database Connectivity**: Connection pool monitoring
- **Email Service**: SMTP server availability
- **License Validation**: License server connectivity
- **Scheduler Status**: Cron job monitoring

### Logging
- **Application Logs**: Winston logger with rotation
- **Audit Logs**: Database-stored audit trail
- **Error Logs**: Comprehensive error tracking
- **Performance Logs**: Response time monitoring

## Future Enhancements

### Planned Features
- **Mobile App Integration**: React Native mobile app
- **Advanced Analytics**: Machine learning insights
- **Customer Portal**: Self-service ticket creation
- **Integration APIs**: Third-party system integration
- **Advanced Reporting**: Custom report generation

### Scalability Considerations
- **Database Sharding**: Multi-location data distribution
- **Microservices**: Service-oriented architecture
- **Load Balancing**: Multiple server instances
- **Caching Layer**: Redis for performance optimization

## Support and Documentation

### API Documentation
- **OpenAPI Specification**: Complete API documentation
- **Postman Collection**: Ready-to-use API testing
- **Code Examples**: Implementation examples
- **Error Codes**: Comprehensive error reference

### User Guides
- **Administrator Guide**: System configuration and management
- **User Manual**: End-user ticket management
- **Developer Guide**: Extension and customization
- **Troubleshooting**: Common issues and solutions

---

## Implementation Summary

✅ **Complete Ticketing System** with queue-based workflow  
✅ **Warranty Tracking** with vendor/customer expiry management  
✅ **Role-based Access Control** with granular permissions  
✅ **Notification System** with email and in-app alerts  
✅ **Dashboard Integration** with Chart.js visualizations  
✅ **Comprehensive Testing** with automated test suite  
✅ **WAMP Server Compatibility** with Apache proxy configuration  
✅ **Case Lifecycle Integration** with shared models and services  

The ticketing system is now fully integrated with the existing VTRIA ERP system and ready for production deployment.
