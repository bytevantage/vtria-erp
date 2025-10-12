# Customer Acceptance Workflow Guide

## Overview
This document explains how quotations move from internal approval to customer acceptance and finally to production.

## Workflow States

### Quotation Status Flow
```
Draft → Sent → Approved (Internal) → Accepted (By Customer) → Production
```

### Case State Flow
```
Enquiry → Estimation → Quotation → Order → Production → Delivery → Closed
```

## Step-by-Step Process

### 1. Create and Approve Quotation (Internal)
**Location**: `/vtria-erp/quotations` or `/vtria-erp/quotations-enhanced`

**Actions**:
- Create quotation from approved estimation
- Submit for approval (if draft)
- **Approve** quotation (internal approval)
  - This creates the BOM automatically
  - Quotation status: `approved`
  - Case state: Still in `quotation` state

### 2. Mark Quotation as Accepted by Customer
**Location**: `/vtria-erp/quotations` or `/vtria-erp/quotations-enhanced`

**Actions**:
- After customer verbally/formally accepts the quotation
- Click **"✓ Customer Accepted"** button (only visible for approved quotations)
- System confirms: "Mark this quotation as accepted by customer? This will move the case to Order state and make it ready for production."

**What Happens**:
- Quotation status changes: `approved` → `accepted`
- Case state automatically updates: `quotation` → `order`
- Case state transition is logged in history
- Case becomes visible in Production Dashboard

### 3. Start Production
**Location**: `/vtria-erp/production`

**Actions**:
- Case now appears in "Cases Ready for Production" section
- Click **"Start Production"** to create manufacturing case
- Manufacturing process begins

## Database Changes

### Quotations Table
```sql
ALTER TABLE quotations 
MODIFY COLUMN status ENUM('draft','sent','approved','rejected','revised','accepted') 
DEFAULT 'draft';
```

### Status Meanings
- **draft**: Quotation being prepared
- **sent**: Quotation sent to customer for review
- **approved**: Internally approved by management
- **accepted**: Customer has accepted the quotation
- **rejected**: Quotation rejected (by internal or customer)
- **revised**: Quotation needs revision

## Key Points

### Why Separate Approval and Acceptance?
1. **Internal Approval** (`approved` status):
   - Management reviews pricing, margins, feasibility
   - BOM is created automatically
   - Quotation is ready to send to customer

2. **Customer Acceptance** (`accepted` status):
   - Customer formally accepts the quotation
   - This is the commitment to proceed
   - Only then should production planning begin

### Automatic Case State Transition
When quotation status changes to `accepted`:
- Case `current_state` updates from `quotation` to `order`
- Transition is logged: "Case transitioned to order state - customer accepted quotation [ID]"
- Case becomes eligible for production

### Production Query
The production dashboard shows cases where:
```sql
WHERE c.current_state = 'order' 
AND c.status = 'active'
AND q.status IN ('approved', 'accepted')
```

## UI Changes

### Quotations.js
- Approve button: "Approve" (internal approval)
- New button appears after approval: "✓ Customer Accepted"

### QuotationsEnhanced.js
- Approve icon button (for pending_approval status)
- New "✓ Customer Accepted" button (for approved status)
- Confirmation dialog before accepting

## Backend Logic

### File: `api/src/controllers/quotationEnhanced.controller.js`

#### Method: `updateQuotationStatus()`
```javascript
// When status changes to 'accepted':
if (status === 'accepted' && quotations[0].case_id) {
  // 1. Update case state to 'order'
  // 2. Log state transition in case_state_transitions table
  // 3. Notify user: "Case moved to order state - ready for production"
}
```

## Testing the Workflow

### Test Scenario 1: New Quotation to Production
1. Create estimation → Approve estimation
2. Create quotation from estimation
3. Approve quotation (internal) ✅
4. Verify quotation shows BOM download option
5. Click "✓ Customer Accepted" ✅
6. Verify quotation status = 'accepted'
7. Navigate to Production dashboard
8. Verify case appears in "Ready for Production" ✅

### Test Scenario 2: Existing Approved Quotation
1. Find approved quotation (status = 'approved')
2. Verify case state = 'quotation' (not in production yet)
3. Click "✓ Customer Accepted"
4. Verify case state updates to 'order'
5. Check Production dashboard - case should appear

## Troubleshooting

### Case Not Appearing in Production
**Check**:
1. Quotation status must be 'accepted' (not just 'approved')
2. Case `current_state` must be 'order'
3. Case `status` must be 'active'
4. Case should not already be in manufacturing_cases table

**SQL Query to Check**:
```sql
SELECT 
  c.case_number,
  c.current_state,
  c.status,
  q.quotation_id,
  q.status as quotation_status
FROM cases c
JOIN quotations q ON c.id = q.case_id
WHERE c.case_number = 'VESPL/C/2526/XXX';
```

### Manually Update Case State (Emergency)
```sql
-- Only use if automatic transition failed
UPDATE cases 
SET current_state = 'order', updated_at = CURRENT_TIMESTAMP 
WHERE case_number = 'VESPL/C/2526/XXX';
```

## Related Files
- `api/src/controllers/quotationEnhanced.controller.js` - Backend logic
- `api/src/controllers/production.controller.js` - Production queries
- `client/src/components/Quotations.js` - Quotations UI
- `client/src/components/QuotationsEnhanced.js` - Enhanced quotations UI
- `client/src/components/ProductionManagement.js` - Production dashboard

## Commit History
- Commit `9c41ea1`: Added customer acceptance workflow
- Commit `a3378f6`: Fixed production dashboard authentication
- Commit `1bd70c3`: Fixed purchase/quotation authentication issues
