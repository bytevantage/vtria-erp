# VTRIA ERP Notification and Audit System

## Overview

The VTRIA ERP Notification and Audit System provides comprehensive tracking, logging, and real-time alerting capabilities for the entire ERP platform. This system consists of two main components:

1. **Notification System**: Delivers real-time, in-app, and email notifications to users based on system events.
2. **Audit Logging System**: Records all system activities for compliance, security, and troubleshooting.

## Architecture

### Notification System

The notification system uses a multi-channel approach to deliver alerts:

- **Real-time WebSocket notifications**: Instant in-app alerts via Socket.IO
- **Persistent in-app notifications**: Stored in the database and displayed in the notification center
- **Email notifications**: Sent via SMTP using Nodemailer

#### Key Components

- **WebSocket Service**: Manages real-time connections and rooms for targeted notifications
- **Notification Service**: Core business logic for creating and sending notifications
- **Notification Controllers & Routes**: REST API for managing notifications
- **Database Models**: Persistent storage of notification records

### Audit Logging System

The audit logging system provides immutable, append-only records of all system activities:

- **Comprehensive event tracking**: User actions, data changes, system events
- **Immutable records**: Once created, audit logs cannot be modified
- **Detailed context**: Captures user, action, entity, before/after values, IP address, etc.

#### Key Components

- **Audit Service**: Core service for logging events and retrieving audit records
- **Audit Controllers & Routes**: REST API for querying and analyzing audit data
- **Database Models**: Structured storage of audit records

## Features

### Notification System

- **Multi-channel delivery**: Real-time, in-app, and email
- **Targeted notifications**: Individual, role-based, location-based, or broadcast
- **Read status tracking**: Track read/unread status of notifications
- **Bulk operations**: Mark all as read, delete read notifications
- **Event-specific notifications**: Case, ticket, stock, and system events

### Audit Logging System

- **Comprehensive activity tracking**: All user and system actions
- **Entity history**: Complete change history for any entity
- **User activity logs**: Track actions by specific users
- **Advanced filtering**: By date, action type, entity, severity, etc.
- **Statistical analysis**: Aggregated views of system activity
- **Role-based access**: Restricted access to sensitive audit data

## Integration Points

### Module Integration

The notification and audit systems are integrated with all major VTRIA ERP modules:

- **Case Lifecycle**: Status changes, assignments, aging alerts
- **Ticketing System**: Status updates, warranty alerts, SLA notifications
- **Stock Management**: Low stock alerts, transfers, allocations
- **Document Management**: Version updates, approvals
- **User Management**: Account changes, role updates

### Technical Integration

- **WebSocket**: Real-time communication with frontend
- **REST API**: Management of notifications and audit logs
- **Database**: Persistent storage of records
- **Email**: External communication via SMTP
- **Schedulers**: Automated notifications for recurring events

## API Endpoints

### Notification API

- `GET /api/notifications`: Get user notifications
- `GET /api/notifications/unread/count`: Get unread notification count
- `PUT /api/notifications/:id/read`: Mark notification as read
- `PUT /api/notifications/read/all`: Mark all notifications as read
- `DELETE /api/notifications/:id`: Delete a notification
- `DELETE /api/notifications/read/all`: Delete all read notifications
- `POST /api/notifications/test`: Send test notification (admin only)

### Audit Log API

- `GET /api/audit-logs`: Get audit logs with pagination and filtering
- `GET /api/audit-logs/:id`: Get audit log by ID
- `GET /api/audit-logs/entity/:entity_type/:entity_id`: Get audit logs for a specific entity
- `GET /api/audit-logs/user/:user_id`: Get user activity logs
- `GET /api/audit-logs/stats`: Get audit log statistics
- `POST /api/audit-logs`: Create a manual audit log entry (admin only)

## WebSocket Events

- `connection`: New client connection with JWT authentication
- `disconnect`: Client disconnection
- `notification`: Send notification to client
- `notification_read`: Client acknowledges notification read

## Security

### Authentication & Authorization

- **JWT Authentication**: All API and WebSocket connections require valid JWT tokens
- **Role-Based Access Control**: Different access levels for different user roles
- **License Validation**: All routes validate against the ByteVantage licensing server

### Data Protection

- **Immutable Audit Logs**: Once created, audit records cannot be modified
- **Sensitive Data Handling**: Proper sanitization of sensitive information in logs
- **IP Address Tracking**: Record source of actions for security analysis

## Configuration

### Environment Variables

```
# WebSocket Configuration
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://your-frontend-url

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@vtria.com
```

## Usage Examples

### Sending Notifications

```javascript
// Send individual notification
await notificationService.createInAppNotification(userId, {
  type: 'case_update',
  title: 'Case Status Updated',
  message: 'Case #123 has been moved to Quotation stage',
  data: { case_id: '123', status: 'Quotation' }
});

// Send role-based notification
await notificationService.sendRoleNotification('Manager', {
  type: 'overdue_summary',
  title: 'Overdue Cases Summary',
  message: '5 cases are currently overdue',
  data: { count: 5 }
});

// Send location notification
await notificationService.sendLocationNotification(locationId, {
  type: 'stock_update',
  title: 'Low Stock Alert',
  message: 'Multiple items are below threshold',
  data: { items: ['Item1', 'Item2'] }
});

// Broadcast to all users
await notificationService.broadcastNotification({
  type: 'system_maintenance',
  title: 'Scheduled Maintenance',
  message: 'System will be down for maintenance on Saturday',
  data: { start_time: '2025-09-05T22:00:00Z', duration: '2 hours' }
});
```

### Logging Audit Events

```javascript
// Log a simple action
await auditService.log(
  'CASE_STATUS_UPDATED',
  userId,
  { case_id: caseId, record_id: caseId },
  req.ip
);

// Log with before/after values
await auditService.log(
  'STOCK_TRANSFERRED',
  userId,
  {
    table_name: 'stock_items',
    record_id: stockItemId,
    old_values: { location_id: sourceLocationId, quantity: oldQuantity },
    new_values: { location_id: targetLocationId, quantity: newQuantity }
  },
  req.ip
);
```

## Best Practices

1. **Use appropriate notification channels** based on urgency and importance:
   - Critical alerts: Real-time + Email + In-app
   - Important updates: Real-time + In-app
   - Informational: In-app only

2. **Target notifications appropriately** to avoid notification fatigue:
   - Use role-based notifications for role-specific information
   - Use location-based notifications for location-specific events
   - Reserve broadcasts for truly system-wide announcements

3. **Log appropriate audit detail** without exposing sensitive information:
   - Include enough context to understand the action
   - Mask sensitive data like passwords
   - Include before/after values for change tracking

4. **Implement proper error handling** in notification delivery:
   - Failed email notifications should not break the application flow
   - WebSocket delivery failures should fall back to in-app notifications

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check JWT token validity
   - Verify CORS configuration
   - Ensure client is connecting to correct endpoint

2. **Missing Notifications**
   - Verify user has appropriate roles for targeted notifications
   - Check notification preferences settings
   - Validate email address format and SMTP configuration

3. **Audit Log Performance**
   - Use appropriate filtering when querying large audit datasets
   - Consider archiving old audit logs for performance
   - Ensure proper database indexing on frequently queried fields

## Testing

Use the provided test utilities to verify notification and audit functionality:

```bash
# Test notification workflow
node utils/testNotificationWorkflow.js

# Test audit logging
node utils/testAuditWorkflow.js
```
