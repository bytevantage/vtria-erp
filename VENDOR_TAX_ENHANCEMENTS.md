# Enhanced Vendor Management for Tax Calculations

## Overview
The vendor management system has been enhanced with additional fields specifically for Indian GST tax calculations (IGST, SGST, CGST). These fields enable accurate tax computation based on vendor location and tax registration status.

## New Vendor Fields

### Tax-Related Fields
1. **GSTIN (GST Number)** - 15-character GST identification number
2. **City** - Vendor's city for location-based tax calculations
3. **State** - Vendor's state for determining interstate vs intrastate transactions
4. **Pincode** - Postal code for precise location identification
5. **PAN Number** - 10-character PAN for tax compliance
6. **Tax Category** - Vendor's GST registration status
7. **Vendor Type** - Transaction type classification

### Tax Category Options
- **REGISTERED** - GST registered vendor (default)
- **UNREGISTERED** - Non-GST registered vendor
- **COMPOSITION** - Composition scheme vendor

### Vendor Type Options
- **DOMESTIC** - Local vendor within India (default)
- **IMPORT** - International vendor/imports
- **SEZ** - Special Economic Zone vendor

## Tax Calculation Logic

### IGST (Integrated GST)
Applied when:
- Vendor state ≠ Company state (Interstate transaction)
- Import transactions (vendor_type = 'IMPORT')
- SEZ transactions (vendor_type = 'SEZ')

### SGST + CGST (State + Central GST)
Applied when:
- Vendor state = Company state (Intrastate transaction)
- vendor_type = 'DOMESTIC'

### Tax Rate Application
- **REGISTERED vendors**: Full GST rates apply
- **UNREGISTERED vendors**: Reverse charge mechanism
- **COMPOSITION vendors**: Lower composition rates

## Database Schema

```sql
-- Enhanced inventory_vendors table
ALTER TABLE inventory_vendors 
ADD COLUMN gstin VARCHAR(15) AFTER address,
ADD COLUMN city VARCHAR(100) AFTER gstin,
ADD COLUMN state VARCHAR(100) AFTER city,
ADD COLUMN pincode VARCHAR(10) AFTER state,
ADD COLUMN pan_number VARCHAR(10) AFTER pincode,
ADD COLUMN tax_category ENUM('REGISTERED', 'UNREGISTERED', 'COMPOSITION') DEFAULT 'REGISTERED',
ADD COLUMN vendor_type ENUM('DOMESTIC', 'IMPORT', 'SEZ') DEFAULT 'DOMESTIC';
```

## API Endpoints

### GET /api/vendors
Retrieve all vendors with tax information

### POST /api/vendors
Create vendor with tax details
```json
{
  "vendor_code": "VEN001",
  "vendor_name": "Sample Vendor Ltd",
  "contact_person": "John Doe",
  "email": "john@vendor.com",
  "phone": "+91 9876543210",
  "address": "Industrial Area",
  "gstin": "29ABCDE1234F1Z5",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "pan_number": "ABCDE1234F",
  "tax_category": "REGISTERED",
  "vendor_type": "DOMESTIC",
  "payment_terms": "Net 30",
  "credit_limit": 500000,
  "rating": "A"
}
```

### PUT /api/vendors/:id
Update vendor tax information

### DELETE /api/vendors/:id
Soft delete vendor (sets is_active = false)

## Frontend Features

### Enhanced Vendor Form
- GST number validation
- State and city selection for accurate location
- Tax category dropdown for compliance classification
- Vendor type selection for transaction classification

### Vendor List View
- GST number display
- City, State location information
- Tax category chips with color coding
- Enhanced search and filtering capabilities

## Tax Calculation Integration

The enhanced vendor data can be used in:
1. **Purchase Order Generation** - Automatic tax calculation
2. **Invoice Processing** - Correct GST application
3. **Tax Reports** - State-wise vendor analysis
4. **Compliance Reporting** - GST return preparation

## Usage Examples

### Interstate Transaction (IGST)
- Company State: Karnataka
- Vendor State: Maharashtra
- Result: IGST applicable

### Intrastate Transaction (SGST + CGST)
- Company State: Karnataka  
- Vendor State: Karnataka
- Result: SGST + CGST applicable

### Import Transaction
- Vendor Type: IMPORT
- Result: IGST + Customs Duty applicable

This enhanced vendor management system provides a solid foundation for accurate GST tax calculations in compliance with Indian tax regulations.