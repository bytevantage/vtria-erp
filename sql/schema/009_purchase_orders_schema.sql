-- VTRIA ERP - Purchase Order Management Schema
-- Created: 2025-09-10
-- Description: Complete purchase order management system with suppliers, purchase orders, and order tracking

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    po_date DATE NOT NULL,
    expected_delivery_date DATE,
    status ENUM('draft', 'pending_approval', 'approved', 'sent_to_supplier', 'partially_received', 'received', 'cancelled') DEFAULT 'draft',
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    grand_total DECIMAL(15,2) DEFAULT 0.00,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    notes TEXT,
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_po_number (po_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_po_date (po_date)
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NOT NULL,
    item_id INT NOT NULL,
    item_description TEXT,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    received_quantity DECIMAL(12,3) DEFAULT 0,
    pending_quantity DECIMAL(12,3) GENERATED ALWAYS AS (quantity - received_quantity) STORED,
    expected_delivery_date DATE,
    notes TEXT,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    INDEX idx_po_id (po_id),
    INDEX idx_item_id (item_id)
);

-- Create goods_received_notes table (GRN)
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grn_number VARCHAR(100) NOT NULL UNIQUE,
    po_id INT NOT NULL,
    supplier_id INT NOT NULL,
    received_date DATE NOT NULL,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    total_received_amount DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('draft', 'verified', 'approved', 'posted') DEFAULT 'draft',
    quality_check_required BOOLEAN DEFAULT FALSE,
    quality_check_status ENUM('pending', 'passed', 'failed', 'not_required') DEFAULT 'not_required',
    received_by INT,
    verified_by INT,
    approved_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_grn_number (grn_number),
    INDEX idx_po_id (po_id),
    INDEX idx_received_date (received_date)
);

-- Create goods_received_items table
CREATE TABLE IF NOT EXISTS goods_received_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grn_id INT NOT NULL,
    po_item_id INT NOT NULL,
    item_id INT NOT NULL,
    ordered_quantity DECIMAL(12,3) NOT NULL,
    received_quantity DECIMAL(12,3) NOT NULL,
    accepted_quantity DECIMAL(12,3) DEFAULT 0,
    rejected_quantity DECIMAL(12,3) DEFAULT 0,
    unit_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (accepted_quantity * unit_price) STORED,
    batch_number VARCHAR(100),
    expiry_date DATE,
    quality_remarks TEXT,
    notes TEXT,
    FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    INDEX idx_grn_id (grn_id),
    INDEX idx_po_item_id (po_item_id)
);

-- Create purchase_requisitions table
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pr_number VARCHAR(100) NOT NULL UNIQUE,
    requested_by INT NOT NULL,
    department VARCHAR(100),
    request_date DATE NOT NULL,
    required_date DATE NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'converted_to_po', 'cancelled') DEFAULT 'draft',
    justification TEXT,
    total_estimated_cost DECIMAL(15,2) DEFAULT 0.00,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_pr_number (pr_number),
    INDEX idx_requested_by (requested_by),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date)
);

-- Create purchase_requisition_items table
CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pr_id INT NOT NULL,
    item_id INT,
    item_description TEXT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    estimated_unit_price DECIMAL(12,2) DEFAULT 0.00,
    estimated_total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED,
    justification TEXT,
    specifications TEXT,
    preferred_supplier VARCHAR(200),
    urgency_reason TEXT,
    FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    INDEX idx_pr_id (pr_id),
    INDEX idx_item_id (item_id)
);

-- Create supplier_quotations table
CREATE TABLE IF NOT EXISTS supplier_quotations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_number VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    pr_id INT,
    quotation_date DATE NOT NULL,
    valid_until DATE,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    delivery_terms VARCHAR(200),
    payment_terms VARCHAR(200),
    warranty_terms VARCHAR(200),
    status ENUM('received', 'under_evaluation', 'selected', 'rejected') DEFAULT 'received',
    evaluation_notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_quotation_number (quotation_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_quotation_date (quotation_date)
);

-- Create supplier_quotation_items table
CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_id INT NOT NULL,
    item_id INT,
    item_description TEXT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    delivery_time_days INT,
    specifications TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    warranty_period VARCHAR(100),
    notes TEXT,
    FOREIGN KEY (quotation_id) REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_item_id (item_id)
);

-- Insert sample data

-- Sample Purchase Requisitions
INSERT IGNORE INTO purchase_requisitions (
    pr_number, requested_by, department, request_date, required_date, 
    priority, status, justification, total_estimated_cost
) VALUES 
('VESPL/PR/2526/001', 1, 'Manufacturing', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 
 'high', 'approved', 'Raw materials required for Tata Motors project', 125000.00),
('VESPL/PR/2526/002', 1, 'Maintenance', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 
 'medium', 'submitted', 'Spare parts for equipment maintenance', 45000.00);

-- Sample PR Items
INSERT IGNORE INTO purchase_requisition_items (
    pr_id, item_id, item_description, quantity, estimated_unit_price, 
    justification, preferred_supplier
) VALUES 
(1, 1, 'Stainless Steel 304 - 6mm Sheet for welding project', 100.00, 850.00, 
 'Required for robot welding system fabrication', 'Steel India Ltd'),
(1, 2, 'Welding Rod 316L for precision welding', 50.00, 450.00, 
 'High quality rods for critical welds', 'Steel India Ltd'),
(2, 3, '5KW Servo Motor for machine upgrade', 2.00, 25000.00, 
 'Replacement for faulty motors', 'Automation Parts Co');

-- Sample Purchase Orders
INSERT IGNORE INTO purchase_orders (
    po_number, supplier_id, po_date, expected_delivery_date, status, 
    total_amount, tax_amount, grand_total, terms_and_conditions, 
    delivery_address, created_by, approved_by, approved_at
) VALUES 
('VESPL/PO/2526/001', 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 
 'approved', 107500.00, 19350.00, 126850.00, 
 'Net 30 days payment terms. Delivery at site.', 
 'VTRIA Engineering Solutions Pvt Ltd, Industrial Area, Bangalore', 
 1, 1, NOW()),
('VESPL/PO/2526/002', 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 
 'sent_to_supplier', 50000.00, 9000.00, 59000.00, 
 'Net 45 days payment terms. FOB destination.', 
 'VTRIA Engineering Solutions Pvt Ltd, Industrial Area, Bangalore', 
 1, 1, NOW());

-- Sample PO Items
INSERT IGNORE INTO purchase_order_items (
    po_id, item_id, item_description, quantity, unit_price, 
    expected_delivery_date
) VALUES 
(1, 1, 'Stainless Steel 304 - 6mm Sheet', 100.00, 850.00, DATE_ADD(CURDATE(), INTERVAL 8 DAY)),
(1, 2, 'Welding Rod 316L', 50.00, 450.00, DATE_ADD(CURDATE(), INTERVAL 8 DAY)),
(2, 3, '5KW Servo Motor', 2.00, 25000.00, DATE_ADD(CURDATE(), INTERVAL 12 DAY));

-- Sample GRN
INSERT IGNORE INTO goods_received_notes (
    grn_number, po_id, supplier_id, received_date, invoice_number, 
    invoice_date, total_received_amount, status, received_by
) VALUES 
('VESPL/GRN/2526/001', 1, 1, CURDATE(), 'SI-2025-1205', CURDATE(), 
 85000.00, 'verified', 1);

-- Sample GRN Items
INSERT IGNORE INTO goods_received_items (
    grn_id, po_item_id, item_id, ordered_quantity, received_quantity, 
    accepted_quantity, unit_price, batch_number
) VALUES 
(1, 1, 1, 100.00, 100.00, 100.00, 850.00, 'SS304-2526-001'),
(1, 2, 2, 50.00, 0.00, 0.00, 450.00, NULL);

-- Create view for purchase order summary
CREATE OR REPLACE VIEW purchase_order_summary AS
SELECT 
    po.id,
    po.po_number,
    po.po_date,
    po.expected_delivery_date,
    po.status,
    po.grand_total,
    s.supplier_name,
    s.contact_person,
    s.phone,
    s.email,
    u.full_name as created_by_name,
    au.full_name as approved_by_name,
    COUNT(poi.id) as total_items,
    SUM(poi.quantity) as total_quantity,
    SUM(poi.received_quantity) as total_received,
    CASE 
        WHEN SUM(poi.quantity) = SUM(poi.received_quantity) THEN 'Fully Received'
        WHEN SUM(poi.received_quantity) > 0 THEN 'Partially Received'
        ELSE 'Pending Receipt'
    END as receipt_status,
    po.created_at,
    po.updated_at
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN users u ON po.created_by = u.id
LEFT JOIN users au ON po.approved_by = au.id
LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
GROUP BY po.id, po.po_number, po.po_date, po.expected_delivery_date, 
         po.status, po.grand_total, s.supplier_name, s.contact_person, 
         s.phone, s.email, u.full_name, au.full_name, po.created_at, po.updated_at;

-- Create view for purchase requisition summary
CREATE OR REPLACE VIEW purchase_requisition_summary AS
SELECT 
    pr.id,
    pr.pr_number,
    pr.request_date,
    pr.required_date,
    pr.priority,
    pr.status,
    pr.total_estimated_cost,
    pr.department,
    u.full_name as requested_by_name,
    au.full_name as approved_by_name,
    COUNT(pri.id) as total_items,
    SUM(pri.quantity) as total_quantity,
    pr.created_at,
    pr.updated_at
FROM purchase_requisitions pr
LEFT JOIN users u ON pr.requested_by = u.id
LEFT JOIN users au ON pr.approved_by = au.id
LEFT JOIN purchase_requisition_items pri ON pr.id = pri.pr_id
GROUP BY pr.id, pr.pr_number, pr.request_date, pr.required_date, 
         pr.priority, pr.status, pr.total_estimated_cost, pr.department,
         u.full_name, au.full_name, pr.created_at, pr.updated_at;

COMMIT;
