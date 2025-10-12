# Payroll API Documentation

## Overview

The Payroll API provides comprehensive endpoints for managing employee compensation, payroll processing, statutory compliance, and payroll reporting. This module handles:

- **Salary Components**: Earnings, deductions, and reimbursements
- **Salary Structure**: Employee-wise salary configuration
- **Payroll Processing**: Automated monthly payroll calculation
- **Statutory Compliance**: PF, ESI, Professional Tax, TDS
- **Payslips**: Detailed salary breakup and payment records
- **Loans & Advances**: EMI deductions and tracking
- **Reimbursements**: Expense reimbursement processing
- **Reports**: Payroll summaries, salary registers, statutory reports

## Authentication

All payroll endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Base URL

```
http://localhost:3001/api/hr/payroll
```

---

## Table of Contents

1. [Salary Components](#salary-components)
2. [Employee Salary Structure](#employee-salary-structure)
3. [Payroll Cycles](#payroll-cycles)
4. [Payroll Processing](#payroll-processing)
5. [Payroll Transactions](#payroll-transactions)
6. [Payroll Reports](#payroll-reports)
7. [Statutory Compliance](#statutory-compliance)
8. [Complete Workflow](#complete-workflow)

---

## Salary Components

### Get All Salary Components

Retrieve all active salary components with optional filtering by type.

**Endpoint:** `GET /components`

**Access:** HR, Finance

**Query Parameters:**
- `type` (optional): Filter by component type (`earning`, `deduction`, `reimbursement`)

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/components?type=earning" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "component_code": "BASIC",
      "component_name": "Basic Salary",
      "component_type": "earning",
      "calculation_type": "fixed",
      "percentage_of": null,
      "formula": null,
      "is_taxable": true,
      "is_statutory": false,
      "affects_ctc": true,
      "affects_gross": true,
      "display_order": 1,
      "is_active": true,
      "description": "Basic salary component - foundation for other calculations"
    },
    {
      "id": 2,
      "component_code": "HRA",
      "component_name": "House Rent Allowance",
      "component_type": "earning",
      "calculation_type": "percentage",
      "percentage_of": "BASIC",
      "formula": null,
      "is_taxable": true,
      "is_statutory": false,
      "affects_ctc": true,
      "affects_gross": true,
      "display_order": 2,
      "is_active": true,
      "description": "House Rent Allowance - typically 40-50% of basic"
    }
  ]
}
```

### Create Salary Component

Create a new salary component (earning, deduction, or reimbursement).

**Endpoint:** `POST /components`

**Access:** HR, Finance

**Request Body:**
```json
{
  "component_code": "PERF_BONUS",
  "component_name": "Performance Bonus",
  "component_type": "earning",
  "calculation_type": "fixed",
  "is_taxable": true,
  "is_statutory": false,
  "affects_ctc": true,
  "affects_gross": true,
  "display_order": 15,
  "description": "Quarterly performance bonus"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Salary component created successfully",
  "data": {
    "id": 26
  }
}
```

**Component Types:**
- `earning`: Salary earnings (Basic, HRA, Allowances, Bonuses)
- `deduction`: Salary deductions (PF, ESI, PT, TDS, Loans)
- `reimbursement`: Expense reimbursements (Travel, Medical, Phone)

**Calculation Types:**
- `fixed`: Fixed amount (e.g., Rs. 5000)
- `percentage`: Percentage of another component (e.g., HRA = 50% of Basic)
- `formula`: Custom formula (e.g., DA = (Basic * CPI / 100))

---

## Employee Salary Structure

### Get Employee Salary Structure

Retrieve an employee's current or historical salary structure.

**Endpoint:** `GET /employees/:employee_id/salary-structure`

**Access:** HR, Finance, Manager

**Path Parameters:**
- `employee_id`: Employee ID

**Query Parameters:**
- `effective_date` (optional): Date for which to fetch structure (default: today)

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/employees/25/salary-structure?effective_date=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "employee_id": 25,
    "effective_date": "2025-01-01",
    "components": [
      {
        "id": 150,
        "employee_id": 25,
        "component_id": 1,
        "component_code": "BASIC",
        "component_name": "Basic Salary",
        "component_type": "earning",
        "calculation_type": "fixed",
        "amount": "25000.00",
        "effective_from": "2025-01-01",
        "effective_to": null,
        "is_active": true,
        "notes": null
      },
      {
        "id": 151,
        "component_code": "HRA",
        "component_name": "House Rent Allowance",
        "component_type": "earning",
        "amount": "12500.00"
      },
      {
        "id": 152,
        "component_code": "CONV",
        "component_name": "Conveyance Allowance",
        "component_type": "earning",
        "amount": "1600.00"
      },
      {
        "id": 160,
        "component_code": "PF_EMP",
        "component_name": "PF Employee Contribution",
        "component_type": "deduction",
        "amount": "3000.00"
      },
      {
        "id": 161,
        "component_code": "PT",
        "component_name": "Professional Tax",
        "component_type": "deduction",
        "amount": "200.00"
      }
    ],
    "totals": {
      "total_earnings": 45000.00,
      "total_deductions": 3200.00,
      "total_reimbursements": 0,
      "gross_salary": 45000.00,
      "net_salary": 41800.00,
      "ctc": 48600.00
    }
  }
}
```

### Set Employee Salary Structure

Configure or update an employee's salary structure with effective date.

**Endpoint:** `POST /employees/:employee_id/salary-structure`

**Access:** HR, Finance

**Path Parameters:**
- `employee_id`: Employee ID

**Request Body:**
```json
{
  "effective_from": "2025-02-01",
  "components": [
    {
      "component_id": 1,
      "amount": 30000,
      "notes": "Annual increment - 20%"
    },
    {
      "component_id": 2,
      "amount": 15000,
      "notes": "HRA - 50% of basic"
    },
    {
      "component_id": 3,
      "amount": 1600
    },
    {
      "component_id": 4,
      "amount": 1250
    },
    {
      "component_id": 5,
      "amount": 5000
    },
    {
      "component_id": 11,
      "amount": 3600,
      "notes": "PF on basic (12%)"
    },
    {
      "component_id": 14,
      "amount": 200
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Employee salary structure set successfully"
}
```

**Notes:**
- Previous structure is automatically deactivated with `effective_to` set to one day before new `effective_from`
- Statutory deductions (PF, ESI, PT) are automatically calculated during payroll processing
- All changes are tracked with audit trail

---

## Payroll Cycles

### Get All Payroll Cycles

Retrieve payroll cycles with pagination and filtering.

**Endpoint:** `GET /cycles`

**Access:** HR, Finance

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (`draft`, `processing`, `approved`, `paid`)
- `year` (optional): Filter by year (e.g., 2025)
- `month` (optional): Filter by month (1-12)

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/cycles?year=2025&month=1&status=approved" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "cycle_name": "January 2025 Payroll",
      "pay_period_start": "2025-01-01",
      "pay_period_end": "2025-01-31",
      "payment_date": "2025-02-05",
      "status": "approved",
      "total_employees": 45,
      "total_gross": "2250000.00",
      "total_deductions": "450000.00",
      "total_net": "1800000.00",
      "processed_by": 5,
      "processed_by_name": "Anjali Sharma",
      "processed_at": "2025-02-03T10:30:00.000Z",
      "approved_by": 2,
      "approved_by_name": "Rajesh Kumar",
      "approved_at": "2025-02-04T15:45:00.000Z",
      "remarks": "Regular monthly payroll",
      "created_at": "2025-02-01T09:00:00.000Z"
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

### Create Payroll Cycle

Create a new payroll cycle for processing.

**Endpoint:** `POST /cycles`

**Access:** HR, Finance

**Request Body:**
```json
{
  "cycle_name": "February 2025 Payroll",
  "pay_period_start": "2025-02-01",
  "pay_period_end": "2025-02-28",
  "payment_date": "2025-03-05",
  "remarks": "Regular monthly payroll"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payroll cycle created successfully",
  "data": {
    "id": 16
  }
}
```

**Payroll Cycle Statuses:**
- `draft`: Newly created, ready for processing
- `processing`: Payroll calculation in progress
- `approved`: Payroll approved, ready for payment
- `paid`: Payments completed

---

## Payroll Processing

### Process Payroll

Calculate payroll for all active employees in a cycle.

**Endpoint:** `POST /cycles/:cycle_id/process`

**Access:** HR, Finance

**Path Parameters:**
- `cycle_id`: Payroll cycle ID

**Request Body (Optional):**
```json
{
  "employee_ids": [10, 25, 32, 45]
}
```

**Notes:**
- If `employee_ids` is not provided, processes all active employees
- If provided, processes only specified employees

**Request Example:**
```bash
curl -X POST "http://localhost:3001/api/hr/payroll/cycles/16/process" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payroll processed successfully",
  "data": {
    "cycle_id": 16,
    "employees_processed": 45,
    "total_gross": 2350000.00,
    "total_deductions": 470000.00,
    "total_net": 1880000.00
  }
}
```

**Payroll Calculation Logic:**

1. **Attendance Calculation**
   - Fetches attendance records for pay period
   - Calculates present days, absent days, payable days
   - Applies LOP (Loss of Pay) for unauthorized absences

2. **Earnings Calculation**
   - Fetches employee salary structure
   - Calculates all earning components
   - Sums up to gross salary

3. **Statutory Deductions**
   - **PF (Provident Fund)**: 12% of basic (max Rs. 15,000)
   - **ESI (Employee State Insurance)**: 0.75% of gross (if gross ≤ Rs. 21,000)
   - **Professional Tax**: Based on gross salary slab
   - **TDS (Tax Deducted at Source)**: Based on tax declarations

4. **Other Deductions**
   - Active loan EMI deductions
   - Advance recoveries
   - Other deductions from salary structure

5. **Net Salary**
   - Net Salary = Gross Salary - Total Deductions

### Approve Payroll Cycle

Approve processed payroll for payment release.

**Endpoint:** `POST /cycles/:cycle_id/approve`

**Access:** HR, Finance

**Path Parameters:**
- `cycle_id`: Payroll cycle ID

**Request Example:**
```bash
curl -X POST "http://localhost:3001/api/hr/payroll/cycles/16/approve" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payroll cycle approved successfully"
}
```

---

## Payroll Transactions

### Get Payroll Transactions

Retrieve all payroll transactions for a cycle.

**Endpoint:** `GET /cycles/:cycle_id/transactions`

**Access:** HR, Finance

**Path Parameters:**
- `cycle_id`: Payroll cycle ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `department` (optional): Filter by department
- `status` (optional): Filter by status

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/cycles/16/transactions?department=Engineering" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 450,
      "payroll_cycle_id": 16,
      "employee_id": 25,
      "emp_code": "EMP-2023-025",
      "employee_name": "Priya Deshmukh",
      "department": "Engineering",
      "designation": "Senior Software Engineer",
      "pay_period_start": "2025-02-01",
      "pay_period_end": "2025-02-28",
      "payment_date": "2025-03-05",
      "total_days": 28,
      "present_days": 26,
      "absent_days": 2,
      "payable_days": 26,
      "basic_salary": "30000.00",
      "hra": "15000.00",
      "conveyance_allowance": "1600.00",
      "medical_allowance": "1250.00",
      "special_allowance": "5000.00",
      "other_allowances": "0.00",
      "gross_salary": "52850.00",
      "pf_employee": "3600.00",
      "pf_employer": "3600.00",
      "esi_employee": "0.00",
      "esi_employer": "0.00",
      "professional_tax": "200.00",
      "tds": "1500.00",
      "loan_deduction": "0.00",
      "advance_deduction": "0.00",
      "other_deductions": "0.00",
      "total_deductions": "5300.00",
      "net_salary": "47550.00",
      "total_payment": "47550.00",
      "status": "approved",
      "created_at": "2025-02-03T10:35:22.000Z"
    }
  ]
}
```

### Get Payroll Transaction (Payslip)

Retrieve detailed payslip for a single employee transaction.

**Endpoint:** `GET /transactions/:id`

**Access:** HR, Finance, Manager, Employee (own payslip)

**Path Parameters:**
- `id`: Payroll transaction ID

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/transactions/450" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 450,
    "payroll_cycle_id": 16,
    "employee_id": 25,
    "emp_code": "EMP-2023-025",
    "employee_name": "Priya Deshmukh",
    "email": "priya.d@company.com",
    "department": "Engineering",
    "designation": "Senior Software Engineer",
    "date_of_birth": "1995-06-15",
    "hire_date": "2023-03-20",
    "cycle_name": "February 2025 Payroll",
    "pay_period_start": "2025-02-01",
    "pay_period_end": "2025-02-28",
    "payment_date": "2025-03-05",
    "total_days": 28,
    "present_days": 26,
    "absent_days": 2,
    "payable_days": 26,
    "basic_salary": "30000.00",
    "hra": "15000.00",
    "conveyance_allowance": "1600.00",
    "medical_allowance": "1250.00",
    "special_allowance": "5000.00",
    "other_allowances": "0.00",
    "gross_salary": "52850.00",
    "pf_employee": "3600.00",
    "pf_employer": "3600.00",
    "esi_employee": "0.00",
    "esi_employer": "0.00",
    "professional_tax": "200.00",
    "tds": "1500.00",
    "loan_deduction": "0.00",
    "advance_deduction": "0.00",
    "other_deductions": "0.00",
    "total_deductions": "5300.00",
    "net_salary": "47550.00",
    "total_payment": "47550.00",
    "status": "approved",
    "payment_method": "bank_transfer",
    "bank_account_number": "XXXX-XXXX-1234",
    "remarks": null,
    "components": [
      {
        "component_id": 1,
        "component_name": "Basic Salary",
        "component_code": "BASIC",
        "component_type": "earning",
        "amount": "30000.00"
      },
      {
        "component_id": 2,
        "component_name": "House Rent Allowance",
        "component_code": "HRA",
        "component_type": "earning",
        "amount": "15000.00"
      },
      {
        "component_id": 11,
        "component_name": "PF Employee Contribution",
        "component_code": "PF_EMP",
        "component_type": "deduction",
        "amount": "3600.00"
      },
      {
        "component_id": 14,
        "component_name": "Professional Tax",
        "component_code": "PT",
        "component_type": "deduction",
        "amount": "200.00"
      }
    ]
  }
}
```

---

## Payroll Reports

### Get Payroll Summary Report

Get monthly or yearly payroll summary with department-wise breakdown.

**Endpoint:** `GET /reports/summary`

**Access:** HR, Finance, Manager

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month (1-12)

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/reports/summary?year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "cycle_id": 15,
      "cycle_name": "January 2025 Payroll",
      "pay_period_start": "2025-01-01",
      "pay_period_end": "2025-01-31",
      "payment_date": "2025-02-05",
      "total_employees": 45,
      "total_gross": "2250000.00",
      "total_deductions": "450000.00",
      "total_net": "1800000.00",
      "total_pf_employee": "162000.00",
      "total_pf_employer": "162000.00",
      "total_esi_employee": "0.00",
      "total_esi_employer": "0.00",
      "total_professional_tax": "9000.00",
      "total_tds": "67500.00",
      "status": "paid"
    },
    {
      "cycle_id": 16,
      "cycle_name": "February 2025 Payroll",
      "pay_period_start": "2025-02-01",
      "pay_period_end": "2025-02-28",
      "payment_date": "2025-03-05",
      "total_employees": 45,
      "total_gross": "2350000.00",
      "total_deductions": "470000.00",
      "total_net": "1880000.00",
      "status": "approved"
    }
  ]
}
```

### Get Employee Salary Register

Retrieve an employee's payment history (salary register).

**Endpoint:** `GET /employees/:employee_id/salary-register`

**Access:** HR, Finance, Manager, Employee (own register)

**Path Parameters:**
- `employee_id`: Employee ID

**Query Parameters:**
- `year` (optional): Filter by year
- `limit` (optional): Number of records (default: 12)

**Request Example:**
```bash
curl -X GET "http://localhost:3001/api/hr/payroll/employees/25/salary-register?year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "transaction_id": 450,
      "employee_id": 25,
      "cycle_name": "February 2025 Payroll",
      "pay_period_start": "2025-02-01",
      "pay_period_end": "2025-02-28",
      "payment_date": "2025-03-05",
      "gross_salary": "52850.00",
      "total_deductions": "5300.00",
      "net_salary": "47550.00",
      "status": "approved"
    },
    {
      "transaction_id": 405,
      "cycle_name": "January 2025 Payroll",
      "pay_period_start": "2025-01-01",
      "pay_period_end": "2025-01-31",
      "payment_date": "2025-02-05",
      "gross_salary": "50000.00",
      "total_deductions": "5000.00",
      "net_salary": "45000.00",
      "status": "paid"
    }
  ]
}
```

---

## Statutory Compliance

### PF (Provident Fund)

**Employee Contribution:** 12% of basic salary (max Rs. 15,000 basic)
**Employer Contribution:** 12% of basic salary (max Rs. 15,000 basic)

**Example:**
- Basic Salary: Rs. 30,000
- PF Base: Rs. 15,000 (capped)
- Employee PF: Rs. 1,800 (12% of 15,000)
- Employer PF: Rs. 1,800 (12% of 15,000)

### ESI (Employee State Insurance)

**Applicable:** Gross salary ≤ Rs. 21,000 per month

**Employee Contribution:** 0.75% of gross salary
**Employer Contribution:** 3.25% of gross salary

**Example:**
- Gross Salary: Rs. 18,000
- Employee ESI: Rs. 135 (0.75% of 18,000)
- Employer ESI: Rs. 585 (3.25% of 18,000)

### Professional Tax (Karnataka)

**Slab-based deduction:**
- Up to Rs. 15,000: Rs. 200/month
- Above Rs. 15,000: Rs. 208.33/month (Rs. 2,500/year, with Rs. 2,300 in Feb)

### TDS (Tax Deducted at Source)

**Calculation:**
1. Calculate annual gross salary
2. Apply standard deduction (Rs. 50,000)
3. Deduct 80C investments (max Rs. 1,50,000)
4. Deduct 80D health insurance (max Rs. 25,000)
5. Deduct HRA exemption (if applicable)
6. Calculate tax as per income tax slabs
7. Divide by 12 for monthly TDS

**Income Tax Slabs (New Regime):**
- Up to Rs. 3,00,000: Nil
- Rs. 3,00,001 - Rs. 6,00,000: 5%
- Rs. 6,00,001 - Rs. 9,00,000: 10%
- Rs. 9,00,001 - Rs. 12,00,000: 15%
- Rs. 12,00,001 - Rs. 15,00,000: 20%
- Above Rs. 15,00,000: 30%

---

## Complete Workflow

### 1. Initial Setup (One-time)

**Step 1: Configure Salary Components** (Already done - 25 default components)

```bash
# View all components
GET /api/hr/payroll/components
```

**Step 2: Set Up Employee Salary Structures**

```bash
POST /api/hr/payroll/employees/25/salary-structure
{
  "effective_from": "2025-01-01",
  "components": [
    {"component_id": 1, "amount": 25000},  # Basic
    {"component_id": 2, "amount": 12500},  # HRA
    {"component_id": 3, "amount": 1600},   # Conveyance
    {"component_id": 4, "amount": 1250},   # Medical
    {"component_id": 5, "amount": 5000}    # Special
  ]
}
```

### 2. Monthly Payroll Processing

**Step 1: Create Payroll Cycle**

```bash
POST /api/hr/payroll/cycles
{
  "cycle_name": "February 2025 Payroll",
  "pay_period_start": "2025-02-01",
  "pay_period_end": "2025-02-28",
  "payment_date": "2025-03-05"
}
# Returns: {"data": {"id": 16}}
```

**Step 2: Process Payroll**

```bash
POST /api/hr/payroll/cycles/16/process
{}
# Calculates payroll for all active employees
# Returns summary: employees_processed, total_gross, total_net
```

**Step 3: Review Transactions**

```bash
GET /api/hr/payroll/cycles/16/transactions
# Review all employee payslips
# Check for errors or anomalies
```

**Step 4: Approve Payroll**

```bash
POST /api/hr/payroll/cycles/16/approve
# Marks payroll as approved
# Changes status to "approved"
```

**Step 5: Generate Reports**

```bash
# Payroll summary
GET /api/hr/payroll/reports/summary?year=2025&month=2

# Individual payslips (for email distribution)
GET /api/hr/payroll/transactions/450
```

### 3. Employee Self-Service

**View Own Salary Structure:**
```bash
GET /api/hr/payroll/employees/25/salary-structure
```

**View Own Payslips:**
```bash
GET /api/hr/payroll/employees/25/salary-register?limit=12
```

**Download Specific Payslip:**
```bash
GET /api/hr/payroll/transactions/450
```

---

## Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "effective_from date is required"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized access",
  "error": "Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied",
  "error": "Insufficient permissions for this operation"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "Payroll cycle not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error processing payroll",
  "error": "Database connection failed"
}
```

---

## Best Practices

### 1. Salary Structure Setup
- Set effective dates carefully to avoid gaps
- Always include Basic salary (foundation for PF calculation)
- Configure HRA for tax exemption benefits
- Review statutory settings annually

### 2. Payroll Processing
- Process payroll 3-5 days before payment date
- Always review transactions before approval
- Generate backup reports before processing
- Communicate payment schedule to employees

### 3. Data Validation
- Verify attendance records are complete
- Check for new joiners and exits
- Review leave balances and LOP
- Validate loan EMI schedules

### 4. Statutory Compliance
- Update statutory rates at start of financial year
- Collect employee tax declarations in April
- Generate Form 16 annually
- File monthly PF/ESI challans

### 5. Security
- Restrict payroll access to HR and Finance only
- Use strong JWT tokens with expiration
- Maintain audit logs for all changes
- Encrypt sensitive salary data

---

## Troubleshooting

### Issue: Employee not processed in payroll

**Possible Causes:**
1. Employee status is not "active"
2. No salary structure configured
3. Salary structure not effective for pay period

**Solution:**
```bash
# Check employee status
GET /api/hr/employees/25

# Check salary structure
GET /api/hr/payroll/employees/25/salary-structure?effective_date=2025-02-01

# Set salary structure if missing
POST /api/hr/payroll/employees/25/salary-structure
```

### Issue: Incorrect PF calculation

**Possible Causes:**
1. Basic salary exceeds Rs. 15,000 ceiling
2. Statutory settings not configured

**Solution:**
```bash
# PF is calculated on min(basic_salary, 15000)
# If basic = 30,000, PF = 12% of 15,000 = 1,800
# This is correct as per statutory rules
```

### Issue: ESI showing zero

**Possible Causes:**
1. Gross salary exceeds Rs. 21,000 ceiling
2. Employee crossed ESI threshold mid-year

**Solution:**
```bash
# ESI only applies if gross_salary <= 21,000
# Once an employee crosses this threshold, ESI stops
# This is correct as per ESIC rules
```

---

## Support

For issues or questions:
- **Email:** hr-support@company.com
- **Slack:** #hr-payroll
- **Documentation:** Internal wiki

---

**Last Updated:** January 2025
**Version:** 1.0.0
