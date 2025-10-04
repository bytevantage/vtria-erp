# Enterprise-Grade Components

This directory contains enterprise-grade UI components designed to enhance the VTRIA ERP system with professional functionality, security, and user experience features.

## Components

### EnterpriseButton

A sophisticated button component with enterprise-grade features:

#### Core Features
- **Loading States**: Automatic loading indicators with progress feedback
- **Permission Control**: Role-based access control with visual feedback
- **Audit Logging**: Comprehensive action logging for compliance
- **Throttling**: Prevents rapid successive clicks
- **Confirmation Dialogs**: Configurable confirmation prompts for critical actions
- **Retry Mechanism**: Automatic retry with exponential backoff
- **Success/Error Feedback**: Rich notifications and error handling
- **Security Integration**: Permission validation and access control

#### Usage Examples

```jsx
import EnterpriseButton from './common/EnterpriseButton';

// Basic usage
<EnterpriseButton
  onClick={handleAction}
  variant="contained"
  color="primary"
>
  Action
</EnterpriseButton>

// Advanced usage with all features
<EnterpriseButton
  onClick={handleCriticalAction}
  variant="contained"
  color="error"
  requirePermission={true}
  userRole={currentUser.role}
  allowedRoles={['admin', 'manager']}
  requireConfirmation={true}
  confirmationTitle="Delete Record"
  confirmationMessage="This action cannot be undone. Are you sure?"
  enableAuditLog={true}
  auditAction="delete_critical_record"
  enableThrottling={true}
  throttleDelay={2000}
  showSuccessMessage={true}
  successMessage="Record deleted successfully"
  enableRetry={true}
  maxRetries={3}
>
  Delete Record
</EnterpriseButton>

// Permission-controlled button
<EnterpriseButton
  onClick={handleApproval}
  variant="contained"
  requirePermission={true}
  userRole="user"
  allowedRoles={['admin', 'manager']}
  enableAuditLog={true}
  auditAction="approve_quotation"
>
  Approve Quotation
</EnterpriseButton>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Button content |
| `onClick` | Function | - | Click handler function |
| `variant` | String | 'contained' | Material-UI button variant |
| `color` | String | 'primary' | Material-UI button color |
| `size` | String | 'medium' | Button size |
| `disabled` | Boolean | false | Disable the button |
| `loading` | Boolean | false | Show loading state |
| `startIcon` | ReactNode | - | Icon at the start |
| `endIcon` | ReactNode | - | Icon at the end |
| `fullWidth` | Boolean | false | Full width button |
| `requireConfirmation` | Boolean | false | Show confirmation dialog |
| `confirmationTitle` | String | 'Confirm Action' | Confirmation dialog title |
| `confirmationMessage` | String | 'Are you sure...' | Confirmation message |
| `requirePermission` | Boolean | false | Enable permission checking |
| `userRole` | String | 'user' | Current user's role |
| `allowedRoles` | Array | ['admin', 'manager', 'user'] | Allowed roles |
| `enableThrottling` | Boolean | true | Enable click throttling |
| `throttleDelay` | Number | 1000 | Throttle delay in ms |
| `showSuccessMessage` | Boolean | false | Show success notification |
| `successMessage` | String | 'Operation completed successfully' | Success message |
| `enableAuditLog` | Boolean | false | Enable audit logging |
| `auditAction` | String | 'button_click' | Audit action name |
| `enableRetry` | Boolean | false | Enable retry mechanism |
| `maxRetries` | Number | 3 | Maximum retry attempts |
| `retryDelay` | Number | 2000 | Retry delay in ms |

### EnterpriseForm

A comprehensive form wrapper with enterprise features:

#### Core Features
- **Auto-save**: Automatic progress saving
- **Version Control**: Form versioning and history
- **Validation**: Real-time field validation
- **Data Recovery**: Automatic data recovery on page refresh
- **Progress Tracking**: Visual form completion progress
- **Audit Trail**: Complete form interaction logging
- **Approval Workflow**: Built-in approval mechanisms
- **Field Locking**: Role-based field access control

#### Usage Examples

```jsx
import EnterpriseForm from './common/EnterpriseForm';

// Basic form
<EnterpriseForm
  title="Create Sales Enquiry"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  formId="sales-enquiry-form"
>
  <TextField label="Project Name" required />
  <TextField label="Description" multiline />
  {/* Form fields */}
</EnterpriseForm>

// Advanced form with all features
<EnterpriseForm
  title="Critical Data Entry"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialData={formData}
  validationSchema={validationRules}
  enableAutoSave={true}
  autoSaveInterval={30000}
  enableVersionControl={true}
  enableAuditLog={true}
  requireApproval={true}
  approverRoles={['admin', 'manager']}
  currentUserRole={user.role}
  enableFieldLocking={true}
  lockedFields={['critical_field']}
  enableDataRecovery={true}
  formId="critical-form"
  showFormProgress={true}
>
  {/* Form content */}
</EnterpriseForm>
```

## Implementation Status

### ✅ Completed Components
1. **EnterpriseButton** - Full implementation with all enterprise features
2. **EnterpriseForm** - Complete form wrapper with advanced functionality

### ✅ Enhanced Pages
1. **Sales Enquiry** - Enhanced with EnterpriseButton components
2. **Quotations Enhanced** - Integrated enterprise components

### 🔄 Next Steps for Full Implementation
1. **Sales Orders** - Replace basic buttons with EnterpriseButton
2. **Purchase Orders** - Upgrade form interactions
3. **Manufacturing** - Enhance production workflow buttons
4. **Inventory Management** - Implement enterprise forms
5. **Employee Management** - Add role-based button controls

## Security Features

### Permission-Based Access Control
- Role validation before action execution
- Visual feedback for unauthorized actions
- Audit logging for security compliance

### Audit Trail
- Complete action logging with timestamps
- User attribution for all interactions
- Configurable audit detail levels

### Data Protection
- Auto-save with encryption considerations
- Data recovery with integrity checks
- Version control for change tracking

## Performance Features

### Throttling & Rate Limiting
- Prevents rapid successive clicks
- Configurable delay periods
- User feedback during throttling

### Retry Mechanisms
- Automatic retry for failed operations
- Exponential backoff strategies
- Maximum retry limits

### Loading States
- Sophisticated loading indicators
- Progress tracking for long operations
- Graceful error handling

## Best Practices

### Button Usage
1. Always enable audit logging for critical actions
2. Use confirmation dialogs for destructive operations
3. Implement appropriate permission checks
4. Provide clear success/error feedback

### Form Usage
1. Enable auto-save for long forms
2. Implement version control for critical data
3. Use data recovery for important forms
4. Provide real-time validation feedback

### Security Considerations
1. Validate permissions on both client and server
2. Log all critical actions for audit trails
3. Implement proper error handling
4. Use throttling to prevent abuse

## Migration Guide

### From Basic Button to EnterpriseButton

```jsx
// Before
<Button
  onClick={handleAction}
  variant="contained"
  disabled={loading}
>
  {loading ? <CircularProgress size={16} /> : 'Action'}
</Button>

// After
<EnterpriseButton
  onClick={handleAction}
  variant="contained"
  loading={loading}
  enableAuditLog={true}
  auditAction="user_action"
  requirePermission={true}
  userRole={currentUser.role}
  showSuccessMessage={true}
>
  Action
</EnterpriseButton>
```

### From Basic Form to EnterpriseForm

```jsx
// Before
<form onSubmit={handleSubmit}>
  <TextField />
  <Button type="submit">Submit</Button>
</form>

// After
<EnterpriseForm
  title="Form Title"
  onSubmit={handleSubmit}
  enableAutoSave={true}
  enableAuditLog={true}
  formId="unique-form-id"
>
  <TextField />
</EnterpriseForm>
```

## Testing

The enhanced components have been tested for:
- ✅ Compilation without errors
- ✅ TypeScript compatibility
- ✅ Material-UI integration
- ✅ Permission system functionality
- ✅ Audit logging capabilities
- ✅ Loading state management
- ✅ Error handling mechanisms

## Support

For issues or questions regarding these enterprise components:
1. Check the console for audit logs and error messages
2. Verify permission configurations match user roles
3. Ensure required props are provided correctly
4. Test with different user role scenarios