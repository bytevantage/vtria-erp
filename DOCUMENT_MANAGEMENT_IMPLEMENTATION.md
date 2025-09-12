# Document Generation and Versioning System for VTRIA ERP

## Overview

The Document Generation and Versioning System provides comprehensive document management capabilities for VTRIA Engineering Solutions Pvt Ltd. The system supports PDF generation for business documents with company branding, technical document versioning stored in the local filesystem, standardized document ID generation, and integration with existing case and ticket modules.

## Key Features

### 1. Document Generation
- PDF generation for business documents (Enquiry, Quotation, Purchase Order, Invoice)
- Company branding with header, logo, and address
- Standardized document IDs with format VESPL/TYPE/YEAR/SEQUENCE
- Annual sequence reset for document numbering

### 2. Document Versioning
- Full version history for all documents
- Technical document versioning with change tracking
- Current version identification
- Version metadata and change descriptions

### 3. Storage Management
- Organized filesystem storage with type-based directories
- Generated documents stored by type and date
- Technical documents stored with version tracking
- Customizable storage paths via environment variables

### 4. Integration
- Seamless integration with case and ticket modules
- Document association with cases and tickets
- Role-based access control
- License validation middleware

### 5. Audit and Security
- Comprehensive audit logging for all document operations
- Secure file access with authentication
- Role-based permissions for document operations
- File type validation and size limits

## System Architecture

### Database Models

1. **Document**
   - Core document metadata
   - Document type and number
   - File information (path, size, mime type)
   - Associations with cases and tickets
   - Version tracking

2. **DocumentVersion**
   - Version-specific metadata
   - Version number and change description
   - File path and size
   - Current version flag
   - Created by and timestamp

### Directory Structure

```
uploads/documents/
├── generated/
│   ├── enquiry/
│   │   └── YYYY-MM/
│   ├── quotation/
│   │   └── YYYY-MM/
│   ├── invoice/
│   │   └── YYYY-MM/
│   └── purchase_order/
│       └── YYYY-MM/
├── technical/
│   └── [file_type]/
└── general/
```

### Document ID Format

- **Format**: `VESPL/TYPE/YEAR/SEQUENCE`
- **Examples**:
  - `VESPL/EQ/2526/001` (Enquiry)
  - `VESPL/QT/2526/002` (Quotation)
  - `VESPL/IN/2526/003` (Invoice)
  - `VESPL/TD/2526/004` (Technical Document)

### Type Codes

| Document Type   | Code |
|-----------------|------|
| ENQUIRY         | EQ   |
| QUOTATION       | QT   |
| PURCHASE_ORDER  | PO   |
| INVOICE         | IN   |
| TECHNICAL       | TD   |
| REPORT          | RP   |
| CASE_ATTACHMENT | CA   |
| OTHER           | DOC  |

## API Endpoints

### Document Management

| Method | Endpoint                            | Description                             | Access                               |
|--------|-------------------------------------|-----------------------------------------|--------------------------------------|
| GET    | /api/documents                      | Get all documents with filtering        | Authenticated                        |
| GET    | /api/documents/:id                  | Get document by ID with versions        | Authenticated                        |
| GET    | /api/documents/:id/versions         | Get document versions                   | Authenticated                        |
| GET    | /api/documents/version/:versionId/download | Download document version file   | Authenticated                        |
| POST   | /api/documents/upload               | Upload general document                 | Director, Manager, Engineer, Sales Admin |
| POST   | /api/documents/technical/upload     | Upload technical document with versioning | Director, Manager, Engineer        |
| PUT    | /api/documents/technical/:id        | Update technical document with new version | Director, Manager, Engineer       |
| POST   | /api/documents/generate             | Generate PDF document                   | Director, Manager, Sales Admin       |
| DELETE | /api/documents/:id                  | Delete document and all versions        | Director, Manager                    |

## PDF Document Templates

### Enquiry Document
- Customer information
- Contact details
- Enquiry description
- Company branding

### Quotation Document
- Customer information
- Reference number
- Validity period
- Item list with quantities and prices
- Total amount
- Terms and conditions

### Invoice Document
- Customer information
- Invoice number and date
- PO reference
- Item list with quantities and prices
- Subtotal, taxes, and total
- Payment terms

### Purchase Order Document
- Supplier information
- PO number and date
- Delivery terms
- Item list with quantities and prices
- Total amount
- Terms and conditions

## Technical Document Versioning

### Version Management
- Each document can have multiple versions
- Only one version is marked as current
- Each version stores:
  - Version number
  - File path
  - Change description
  - Creator information
  - Creation timestamp
  - Version-specific metadata

### Version Workflow
1. Upload initial document (version 1)
2. Update document with new version
3. Previous version is marked as non-current
4. New version is marked as current
5. Document version count is incremented

## Integration with Other Modules

### Case Module Integration
- Documents can be associated with cases
- Case-specific document filtering
- Document generation from case data

### Ticket Module Integration
- Documents can be associated with tickets
- Ticket-specific document filtering
- Document generation from ticket data

## Role-Based Access Control

| Role       | Permissions                                                |
|------------|-----------------------------------------------------------|
| Director   | Full access to all document operations                     |
| Manager    | Full access to all document operations                     |
| Engineer   | Upload and update technical documents, view all documents  |
| Sales Admin| Generate business documents, upload general documents      |
| User       | View documents (based on case/ticket access)               |

## Audit Logging

All document operations are logged in the audit trail:
- Document creation
- Document version updates
- Document downloads
- Document deletions

## Testing

A comprehensive test utility is provided to verify document management functionality:
- Document ID generation
- PDF generation for different document types
- Technical document upload and versioning
- Document retrieval with versions

## Environment Variables

| Variable              | Description                           | Default Value        |
|----------------------|---------------------------------------|----------------------|
| DOCUMENT_STORAGE_PATH | Base path for document storage         | uploads/documents     |

## License Validation

All document routes are protected by license validation middleware to ensure the system is properly licensed through the ByteVantage licensing server.
