-- Sales Order Schema for VTRIA ERP
-- Sales Orders are created from approved quotations

CREATE TABLE IF NOT EXISTS sales_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT NOT NULL,
    date DATE NOT NULL,
    expected_delivery_date DATE,
    status ENUM('draft', 'confirmed', 'in_production', 'ready_for_dispatch', 'dispatched', 'delivered', 'cancelled') DEFAULT 'draft',
    
    -- Customer information (from quotation)
    customer_po_number VARCHAR(100),
    customer_po_date DATE,
    billing_address TEXT,
    shipping_address TEXT,
    
    -- Financial details
    total_amount DECIMAL(15,2) NOT NULL,
    advance_amount DECIMAL(15,2) DEFAULT 0,
    balance_amount DECIMAL(15,2),
    payment_terms TEXT,
    delivery_terms TEXT,
    warranty_terms TEXT,
    
    -- Production details
    production_priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    special_instructions TEXT,
    internal_notes TEXT,
    
    -- Approval and tracking
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_status (status),
    INDEX idx_date (date),
    INDEX idx_expected_delivery (expected_delivery_date)
);

-- Sales Order Items (from quotation items)
CREATE TABLE IF NOT EXISTS sales_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(20),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    
    -- Tax details
    cgst_percentage DECIMAL(5,2) DEFAULT 0,
    sgst_percentage DECIMAL(5,2) DEFAULT 0,
    igst_percentage DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Production details
    production_status ENUM('pending', 'in_progress', 'completed', 'on_hold') DEFAULT 'pending',
    estimated_production_time INT, -- in days
    actual_production_start_date DATE,
    actual_production_end_date DATE,
    
    -- Quality and delivery
    quality_check_status ENUM('pending', 'passed', 'failed', 'rework') DEFAULT 'pending',
    ready_for_dispatch BOOLEAN DEFAULT FALSE,
    dispatched_quantity DECIMAL(10,2) DEFAULT 0,
    dispatch_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_production_status (production_status),
    INDEX idx_quality_status (quality_check_status)
);

-- Production Schedule
CREATE TABLE IF NOT EXISTS production_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    sales_order_item_id INT,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    assigned_to INT, -- technician/team
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('scheduled', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_dates (planned_start_date, planned_end_date),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status)
);

-- Payment Tracking for Sales Orders
CREATE TABLE IF NOT EXISTS sales_order_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    payment_type ENUM('advance', 'milestone', 'final', 'other') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other') NOT NULL,
    reference_number VARCHAR(100),
    bank_details TEXT,
    status ENUM('pending', 'received', 'bounced', 'cancelled') DEFAULT 'received',
    notes TEXT,
    
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_type (payment_type)
);

-- Dispatch/Delivery Tracking
CREATE TABLE IF NOT EXISTS sales_order_dispatch (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    dispatch_date DATE NOT NULL,
    tracking_number VARCHAR(100),
    courier_company VARCHAR(255),
    dispatch_address TEXT NOT NULL,
    dispatch_method ENUM('courier', 'transport', 'self_pickup', 'direct_delivery') NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    status ENUM('packed', 'dispatched', 'in_transit', 'delivered', 'returned') DEFAULT 'packed',
    notes TEXT,
    
    dispatched_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (dispatched_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_dispatch_date (dispatch_date),
    INDEX idx_status (status)
);
