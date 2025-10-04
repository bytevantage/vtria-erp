-- Test data for PO-GRN validation system
-- This script creates test scenarios to validate the PO-GRN matching functionality

-- Test Purchase Order with items
INSERT INTO purchase_orders (
    po_number, purchase_requisition_id, supplier_id, po_date, 
    expected_delivery_date, status, total_amount, tax_amount, grand_total, created_by
) VALUES (
    'VESPL/PO/2526/TEST001', 1, 1, CURDATE(), 
    DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'approved', 50000.00, 9000.00, 59000.00, 1
);

SET @test_po_id = LAST_INSERT_ID();

-- Test PO Items
INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, total_price) VALUES
(@test_po_id, 1, 10.00, 1000.00, 10000.00),  -- MCB 32A
(@test_po_id, 2, 20.00, 500.00, 10000.00),   -- Contactor 
(@test_po_id, 3, 5.00, 2000.00, 10000.00),   -- Panel Board
(@test_po_id, 4, 100.00, 50.00, 5000.00),    -- Cables
(@test_po_id, 5, 15.00, 333.33, 5000.00);    -- Terminal Blocks

-- Sample products for testing (if not exist)
INSERT IGNORE INTO products (id, name, category, unit, status) VALUES
(1, 'MCB 32A Schneider', 'Electrical Panel', 'Nos', 'active'),
(2, 'Contactor LC1D09', 'Electrical Panel', 'Nos', 'active'),  
(3, 'Distribution Panel Board', 'Electrical Panel', 'Nos', 'active'),
(4, 'PVC Cable 2.5sqmm', 'Cables', 'Meter', 'active'),
(5, 'Terminal Block 2.5mm', 'Electrical Panel', 'Nos', 'active');

-- Sample supplier
INSERT IGNORE INTO suppliers (id, company_name, contact_person, phone, email, address, status) VALUES
(1, 'Electrical Components Ltd', 'Rajesh Kumar', '+91-9876543210', 'rajesh@ecl.com', 'Electronics City, Bangalore', 'active');

-- Sample locations
INSERT IGNORE INTO inventory_locations (id, name, address, type, status) VALUES
(1, 'Main Warehouse', 'Factory Premises, Bangalore', 'warehouse', 'active'),
(2, 'Quality Check Area', 'QC Department, Bangalore', 'quality', 'active');

-- Test Scenarios Documentation
/*
TEST SCENARIOS FOR PO-GRN VALIDATION:

1. EXACT MATCH SCENARIO:
   - Create GRN with exact quantities and prices as PO
   - Expected: Should pass validation without warnings

2. OVER-RECEIPT SCENARIO:
   - Create GRN with quantities exceeding PO
   - Expected: Should show over-receipt warnings

3. PRICE VARIANCE SCENARIO:
   - Create GRN with prices varying > 5% from PO
   - Expected: Should show price variance warnings

4. SUPPLIER MISMATCH SCENARIO:
   - Create GRN with different supplier than PO
   - Expected: Should fail validation

5. PARTIAL RECEIPT SCENARIO:
   - Create multiple GRNs for same PO
   - Expected: Should track completion status correctly

Sample API Test Calls:

-- Validate before creation:
POST /api/grn/validate-before-creation
{
  "purchase_order_id": @test_po_id,
  "supplier_id": 1,
  "items": [
    {
      "product_id": 1,
      "ordered_quantity": 10,
      "received_quantity": 10,
      "accepted_quantity": 10,
      "rejected_quantity": 0,
      "unit_price": 1000.00,
      "location_id": 1
    }
  ]
}

-- Check PO completion:
GET /api/grn/po-completion/@test_po_id

-- Generate discrepancy report:
GET /api/grn/discrepancy-report/{grn_id}

*/

-- Display test PO ID for reference
SELECT 
    @test_po_id as test_po_id,
    'Use this PO ID for testing PO-GRN validation APIs' as note;