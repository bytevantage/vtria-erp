# VTRIA ERP Case Lifecycle Module Implementation

## Overview

Complete implementation of the queue-based case lifecycle module for VTRIA ERP system with Node.js + Express.js backend, PostgreSQL database, and Chart.js integration for workflow visualization.

## Workflow States

The case lifecycle follows this queue-based workflow:

**Enquiry → Estimation → Quotation → Purchase Enquiry → PO/PI → GRN → Manufacturing → Invoicing → Closure**

### Status Definitions

| Status | Description | Department | Typical SLA | Allowed Roles |
|--------|-------------|------------|-------------|---------------|
| `enquiry` | Initial customer enquiry | Sales | 24h | Sales Admin, Manager, Director |
| `estimation` | Technical estimation | Engineering | 48h | Engineer, Manager, Director |
| `quotation` | Quotation preparation | Sales | 24h | Sales Admin, Manager, Director |
| `purchase_enquiry` | Material sourcing | Procurement | 72h | Engineer, Manager, Director |
| `po_pi` | PO/PI processing | Finance | 48h | Sales Admin, Manager, Director |
| `grn` | Goods receipt | Warehouse | 24h | User, Engineer, Manager, Director |
| `manufacturing` | Production | Production | 168h | Engineer, Manager, Director |
| `invoicing` | Final invoicing | Finance | 24h | Sales Admin, Manager, Director |
| `closure` | Case completed | All | - | All roles |

## Implementation Components

### 1. Database Models

#### Case Model (`/server/src/models/Case.js`)
- Enhanced with queue-based workflow statuses
- Aging status tracking (green/yellow/red)
- JSONB fields for flexible data storage
- Automatic SLA breach detection
- Workflow progress tracking

#### CaseNote Model (`/server/src/models/CaseNote.js`)
- Append-only note system
- Support for internal/customer-visible notes
- Audit trail with timestamps
- Attachment support

#### CaseStatusHistory Model (`/server/src/models/CaseStatusHistory.js`)
- Complete status change tracking
- Duration calculation between statuses
- Assignment history
- Change reasons and metadata

#### CaseQueue Model (`/server/src/models/CaseQueue.js`)
- Queue definitions for each workflow stage
- Role-based access control
- Location-specific queues
- SLA configuration per queue

### 2. Business Logic Services

#### CaseService (`/server/src/services/caseService.js`)
- **Core Functions:**
  - `createCase()` - Create new case with auto-generated number
  - `updateCaseStatus()` - Move case through workflow with validation
  - `assignCase()` - Assign case to user with role checks
  - `addCaseNote()` - Add append-only notes with audit trail
  - `getCases()` - Filtered case retrieval with pagination
  - `getQueueCases()` - Get cases available in user's queues
  - `updateCaseAging()` - Batch update aging status

- **Workflow Features:**
  - Status transition validation
  - Automatic queue assignment
  - SLA calculation and breach detection
  - Chart.js workflow data generation
  - Role-based permission checks

#### NotificationService (`/server/src/services/notificationService.js`)
- Email and in-app notifications
- Event-driven notifications for:
  - Case creation
  - Status changes
  - Assignment changes
  - SLA breaches
- SMTP integration with HTML templates

#### AuditService (`/server/src/services/auditService.js`)
- Comprehensive audit logging
- User action tracking
- Change history maintenance
- Compliance reporting

### 3. REST API Endpoints

#### Case Management (`/api/cases`)

```http
GET    /api/cases                    # List cases with filters
POST   /api/cases                    # Create new case (Sales Admin+)
GET    /api/cases/queue/:queueId?    # Get queue cases
GET    /api/cases/aging/summary      # Aging summary
GET    /api/cases/:id                # Get case details
PUT    /api/cases/:id/status         # Update status (role-based)
PUT    /api/cases/:id/assign         # Assign case (Manager+)
PUT    /api/cases/:id/pick           # Pick from queue
PUT    /api/cases/:id/reject         # Reject with reason
PUT    /api/cases/:id/close          # Close case
POST   /api/cases/:id/notes          # Add note
GET    /api/cases/:id/notes          # Get notes
GET    /api/cases/:id/history        # Status history
GET    /api/cases/:id/workflow       # Chart.js data
```

#### Queue Management (`/api/case-queues`)

```http
GET    /api/case-queues              # List queues
POST   /api/case-queues              # Create queue (Manager+)
PUT    /api/case-queues/:id          # Update queue (Manager+)
```

### 4. Role-Based Access Control

#### Permission Matrix

| Role | Create | Assign | Pick | Update Status | View All |
|------|--------|--------|------|---------------|----------|
| **Director** | ✅ | ✅ | ✅ | All statuses | ✅ |
| **Manager** | ✅ | ✅ | ✅ | All statuses | Location |
| **Sales Admin** | ✅ | ❌ | ✅ | enquiry, quotation, invoicing | Location |
| **Engineer** | ❌ | ❌ | ✅ | estimation, manufacturing | Location |
| **User** | ❌ | ❌ | ✅ | grn | Location |

### 5. Case Aging System

#### Color-Coded Aging
- **🟢 Green**: Within SLA (> 24 hours remaining)
- **🟡 Yellow**: Aging (< 24 hours remaining)
- **🔴 Red**: Overdue (past due date)

#### Automated Processing
- Hourly aging status updates via cron job
- Daily overdue notifications
- SLA breach tracking and reporting

### 6. Chart.js Integration

#### Horizontal Bar Chart
```javascript
// Generated workflow data for Chart.js
{
  type: 'bar',
  data: {
    labels: ['Enquiry', 'Estimation', 'Quotation', ...],
    datasets: [{
      data: [100, 100, 60, 0, 0, ...], // Progress percentages
      backgroundColor: ['#4CAF50', '#4CAF50', '#FF9800', ...] // Color coding
    }]
  },
  options: {
    indexAxis: 'y', // Horizontal bars
    // ... responsive and styling options
  }
}
```

#### Timeline Visualization
- Status change timeline with durations
- User attribution for each change
- Visual progress tracking

### 7. Notification System

#### Email Notifications
- HTML email templates
- SMTP configuration support
- Event-driven triggers:
  - New case assignments
  - Status changes
  - SLA breaches
  - Case completion

#### In-App Notifications
- Real-time notification feed
- Read/unread status tracking
- Notification preferences per user

### 8. Scheduler & Automation

#### Automated Tasks (`/server/src/utils/caseScheduler.js`)
- **Hourly**: Case aging status updates
- **Daily 9 AM**: Overdue case notifications
- **Configurable**: Custom scheduling for business rules

### 9. Testing & Validation

#### Workflow Testing (`/server/src/utils/testCaseWorkflow.js`)
- Complete lifecycle simulation
- Status transition validation
- Role permission testing
- Chart.js data generation testing
- Note system validation

## API Usage Examples

### Create New Case
```javascript
POST /api/cases
{
  "title": "Automation System Development",
  "description": "Complete PLC and HMI system",
  "priority": "high",
  "customer_name": "ABC Manufacturing",
  "customer_contact": "+91-9876543210",
  "estimated_value": 250000,
  "tags": ["automation", "plc"],
  "case_data": {
    "project_type": "automation",
    "complexity": "high"
  }
}
```

### Update Case Status
```javascript
PUT /api/cases/{id}/status
{
  "status": "estimation",
  "reason": "Moving to technical estimation phase",
  "case_data": {
    "estimated_hours": 120,
    "complexity_rating": "high"
  }
}
```

### Get Workflow Data
```javascript
GET /api/cases/{id}/workflow

Response:
{
  "success": true,
  "data": {
    "type": "bar",
    "data": { /* Chart.js configuration */ },
    "options": { /* Chart.js options */ }
  }
}
```

## Database Schema Integration

The implementation integrates with the PostgreSQL schema defined in previous prompts:
- Uses existing `cases`, `case_notes`, `case_status_history` tables
- Adds `case_queues` table for queue management
- Leverages JSONB fields for flexible data storage
- Maintains referential integrity with users and locations

## Security Features

- **License Validation**: Integration with ByteVantage licensing server
- **JWT Authentication**: Secure API access
- **Role-Based Authorization**: Granular permission control
- **Input Validation**: Express-validator for all endpoints
- **Audit Logging**: Complete action tracking
- **Rate Limiting**: API abuse prevention

## Performance Optimizations

- **Database Indexing**: Optimized queries for case retrieval
- **Caching**: License validation caching
- **Pagination**: Efficient large dataset handling
- **Connection Pooling**: PostgreSQL connection management
- **Async Processing**: Non-blocking operations

## Deployment Configuration

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vtria_erp_dev
DB_USER=vtria_user
DB_PASSWORD=secure_password

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@vtria.com
SMTP_PASS=app_password

# License Validation
BYTEVANTAGE_API_KEY=your-api-key
LICENSE_KEY=VTRIA-CLIENT01-12345678-ABCD1234-EF56
```

### NPM Scripts
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed:queues": "node src/utils/seedCaseQueues.js",
    "test:workflow": "node src/utils/testCaseWorkflow.js"
  }
}
```

## Integration Points

### Frontend Integration
- React components can consume REST APIs
- Chart.js integration for workflow visualization
- Real-time updates via WebSocket (future enhancement)
- Role-based UI component rendering

### External Systems
- ByteVantage licensing server integration
- Email service provider (SMTP)
- Document management system
- ERP modules (stock, finance, etc.)

## Future Enhancements

1. **WebSocket Integration**: Real-time case updates
2. **Advanced Analytics**: Case performance metrics
3. **Custom Workflows**: Configurable workflow stages
4. **Mobile API**: Mobile app support
5. **Integration APIs**: Third-party system connectors

---

**Implementation Status**: ✅ Complete
**Test Coverage**: ✅ Comprehensive workflow testing included
**Documentation**: ✅ API documentation and usage examples provided
**Security**: ✅ License validation, RBAC, and audit logging implemented
