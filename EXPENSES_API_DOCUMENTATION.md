# Expenses Management API Documentation

## Overview
Complete expense management system with multi-level approval workflows, expense categories, detailed line items, and comprehensive reporting capabilities.

## Database Schema

### Tables Created
1. **expense_categories** - Hierarchical expense categories with approval limits
2. **expenses** - Main expense records with approval workflow
3. **expense_items** - Line-item details for each expense
4. **expense_approvals** - Multi-level approval tracking
5. **credit_debit_notes** - Invoice adjustments (future use)
6. **bank_reconciliation** - Bank statement reconciliation (future use)
7. **bank_reconciliation_items** - Transaction details (future use)
8. **email_notifications** - Email tracking system (future use)

### Default Expense Categories
- **SAL** - Salary & Wages
- **RENT** - Rent & Utilities
- **TRVL** - Travel & Accommodation
- **OFFC** - Office Supplies
- **MARK** - Marketing & Advertising
- **TECH** - Technology & Software
- **PROF** - Professional Services
- **MAIN** - Maintenance & Repairs
- **INSUR** - Insurance
- **TAX** - Taxes & Regulatory
- **MISC** - Miscellaneous

## API Endpoints

### Base URL
```
http://localhost:3001/api/financial
```

### Authentication
All endpoints require JWT authentication token in the header:
```
Authorization: Bearer <token>
```

---

## 1. Get Expense Categories

**GET** `/expense-categories`

Retrieves all active expense categories with hierarchy and approval settings.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category_code": "SAL",
      "category_name": "Salary & Wages",
      "parent_category_id": null,
      "description": "Employee salaries, wages, and bonuses",
      "is_active": true,
      "requires_approval": true,
      "approval_limit": 50000.00
    }
  ]
}
```

---

## 2. Get All Expenses

**GET** `/expenses`

Retrieves expenses with filtering and pagination.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Results per page
- `category_id` - Filter by expense category
- `department_id` - Filter by department
- `employee_id` - Filter by employee
- `approval_status` - Filter by status: draft, pending_approval, approved, rejected, cancelled
- `payment_status` - Filter by status: pending, paid, partially_paid, cancelled
- `start_date` - Filter expenses from date (YYYY-MM-DD)
- `end_date` - Filter expenses to date (YYYY-MM-DD)
- `search` - Search in expense number, description, category name

**Example:**
```bash
GET /expenses?page=1&limit=20&category_id=1&approval_status=approved&start_date=2025-01-01
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "expense_number": "EXP/2025/0001",
      "expense_date": "2025-01-12",
      "category_id": 1,
      "category_name": "Salary & Wages",
      "subcategory_id": null,
      "subcategory_name": "",
      "department_id": 1,
      "department_name": "Production",
      "employee_id": 1,
      "employee_name": "John Doe",
      "supplier_id": null,
      "supplier_name": "",
      "amount": 5000.00,
      "tax_amount": 900.00,
      "total_amount": 5900.00,
      "currency": "INR",
      "payment_method": "bank_transfer",
      "payment_status": "pending",
      "approval_status": "draft",
      "description": "Office supplies",
      "receipt_number": "RCP-001",
      "reference_number": null,
      "created_by": 3,
      "created_by_name": "Admin User",
      "approved_by": null,
      "approved_by_name": "",
      "approved_at": null,
      "created_at": "2025-01-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

## 3. Get Expense by ID

**GET** `/expenses/:id`

Retrieves detailed information about a specific expense including items and approval history.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "expense_number": "EXP/2025/0001",
    "expense_date": "2025-01-12",
    "category_name": "Salary & Wages",
    "amount": 5000.00,
    "tax_amount": 900.00,
    "total_amount": 5900.00,
    "items": [
      {
        "id": 1,
        "expense_id": 1,
        "item_description": "Printer",
        "quantity": 1,
        "unit_price": 3000.00,
        "tax_rate": 18.00,
        "tax_amount": 540.00,
        "total_amount": 3540.00
      }
    ],
    "approvals": [
      {
        "id": 1,
        "expense_id": 1,
        "approver_id": 4,
        "approver_name": "Manager",
        "approval_level": 1,
        "status": "approved",
        "comments": "Approved",
        "approved_at": "2025-01-12T11:00:00.000Z"
      }
    ]
  }
}
```

---

## 4. Create Expense

**POST** `/expenses`

Creates a new expense with optional line items.

**Request Body:**
```json
{
  "expense_date": "2025-01-12",
  "category_id": 1,
  "subcategory_id": null,
  "department_id": 1,
  "employee_id": 1,
  "supplier_id": null,
  "amount": 5000,
  "tax_amount": 900,
  "payment_method": "bank_transfer",
  "description": "Office supplies and equipment",
  "receipt_number": "RCP-2025-001",
  "reference_number": null,
  "notes": "Urgent purchase",
  "items": [
    {
      "item_description": "Printer",
      "quantity": 1,
      "unit_price": 3000,
      "tax_rate": 18,
      "tax_amount": 540,
      "total_amount": 3540
    },
    {
      "item_description": "Stationery",
      "quantity": 1,
      "unit_price": 2000,
      "tax_rate": 18,
      "tax_amount": 360,
      "total_amount": 2360
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": 1,
    "expense_number": "EXP/2025/0001"
  }
}
```

---

## 5. Update Expense

**PUT** `/expenses/:id`

Updates an existing expense (only draft or rejected expenses can be updated).

**Request Body:**
```json
{
  "expense_date": "2025-01-12",
  "category_id": 1,
  "amount": 5500,
  "tax_amount": 990,
  "payment_method": "bank_transfer",
  "description": "Office supplies and equipment (Updated)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense updated successfully"
}
```

---

## 6. Submit for Approval

**POST** `/expenses/:id/submit`

Submits an expense for approval workflow.

**Request Body:**
```json
{
  "approver_id": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense submitted for approval"
}
```

---

## 7. Approve/Reject Expense

**POST** `/expenses/:id/approve`

Approves or rejects an expense (only by assigned approver).

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Approved as per budget allocation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense approved successfully"
}
```

---

## 8. Mark as Paid

**POST** `/expenses/:id/pay`

Marks an approved expense as paid.

**Request Body:**
```json
{
  "payment_date": "2025-01-15",
  "payment_reference": "TXN-2025-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense marked as paid"
}
```

---

## 9. Delete Expense

**DELETE** `/expenses/:id`

Soft deletes an expense (sets approval_status to 'cancelled').

**Response:**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

---

## 10. Get Expense Summary

**GET** `/expenses/summary`

Retrieves aggregated expense statistics grouped by category, department, or month.

**Query Parameters:**
- `start_date` - Filter from date
- `end_date` - Filter to date
- `groupBy` - Group by: category (default), department, month

**Example:**
```bash
GET /expenses/summary?start_date=2025-01-01&end_date=2025-01-31&groupBy=category
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "group_name": "Salary & Wages",
      "group_code": "SAL",
      "expense_count": 15,
      "total_amount": 75000.00,
      "total_tax": 13500.00,
      "grand_total": 88500.00,
      "approved_amount": 75000.00,
      "paid_amount": 50000.00
    },
    {
      "group_name": "Office Supplies",
      "group_code": "OFFC",
      "expense_count": 8,
      "total_amount": 25000.00,
      "total_tax": 4500.00,
      "grand_total": 29500.00,
      "approved_amount": 25000.00,
      "paid_amount": 25000.00
    }
  ]
}
```

---

## Expense Workflow

### 1. Draft Stage
- Expense is created with status `draft`
- Can be edited or deleted
- Not visible in reports

### 2. Pending Approval
- Expense is submitted for approval
- Status changes to `pending_approval`
- Assigned approver can approve/reject
- Cannot be edited

### 3. Approved
- Approver approves the expense
- Status changes to `approved`
- Expense is now visible in financial reports
- Ready for payment

### 4. Paid
- Accountant marks expense as paid
- Payment status changes to `paid`
- Expense is complete

### 5. Rejected
- Approver rejects the expense
- Status changes to `rejected`
- Can be edited and resubmitted

---

## Error Codes

- **200** - Success
- **201** - Created successfully
- **400** - Bad request (invalid parameters)
- **401** - Unauthorized (invalid/missing token)
- **404** - Resource not found
- **500** - Internal server error

---

## Integration with P&L Statement

The expenses module integrates directly with the Profit & Loss (P&L) controller to provide accurate expense data instead of estimates.

### Before (Estimated):
```sql
SELECT SUM(total_amount * 0.30) as total_expenses FROM invoices
```

### After (Actual):
```sql
SELECT SUM(total_amount) as total_expenses 
FROM expenses 
WHERE approval_status = 'approved' 
AND expense_date BETWEEN ? AND ?
```

This provides **accurate financial reporting** based on real expense data.

---

## Next Steps

1. ✅ **Expenses API** - Completed
2. ⏳ **Credit/Debit Notes** - Add invoice adjustment endpoints
3. ⏳ **PDF Generation** - Generate expense reports and statements
4. ⏳ **Bank Reconciliation** - Match bank statements with expenses
5. ⏳ **Email Notifications** - Send approval notifications
6. ⏳ **Update P&L Controller** - Use real expenses data

---

## Testing

To test the expenses API:

1. Login to get authentication token:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@vtria.com", "password": "your-password"}'
```

2. Use the token in subsequent requests:
```bash
curl -X GET http://localhost:3001/api/financial/expense-categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Create an expense:
```bash
curl -X POST http://localhost:3001/api/financial/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...expense data...}'
```

---

## Implementation Status

✅ **Completed:**
- Database schema with 8 tables
- 11 default expense categories
- Complete CRUD operations
- Approval workflow
- Payment tracking
- Summary/reporting endpoints
- Pagination and filtering
- Line item support

🔄 **In Progress:**
- Frontend UI components
- Email notifications

⏳ **Planned:**
- Recurring expenses
- Budget comparison
- Expense analytics dashboard
- Mobile app integration

---

## Database Views

### v_expense_summary
Pre-aggregated expense summary with category breakdown:
```sql
SELECT * FROM v_expense_summary;
```

### v_pending_expense_approvals
All expenses waiting for approval:
```sql
SELECT * FROM v_pending_expense_approvals;
```

---

## Support

For issues or questions about the expenses API, contact the development team.
