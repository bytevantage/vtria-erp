-- ===================================
-- Production Planning & Manufacturing Module Schema
-- ===================================

-- Manufacturing Units/Facilities
CREATE TABLE IF NOT EXISTS manufacturing_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_name VARCHAR(100) NOT NULL,
    unit_code VARCHAR(10) UNIQUE NOT NULL,
    location VARCHAR(200),
    capacity_per_day DECIMAL(10,2),
    unit_of_measurement VARCHAR(20),
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    
    manager_employee_id INT,
    contact_phone VARCHAR(15),
    contact_email VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    INDEX idx_unit_code (unit_code),
    INDEX idx_status (status)
);

-- Production Categories/Product Lines
CREATE TABLE IF NOT EXISTS production_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(20) UNIQUE,
    description TEXT,
    parent_category_id INT,
    
    -- Production characteristics
    default_lead_time_days INT DEFAULT 7,
    default_batch_size INT DEFAULT 1,
    requires_quality_check BOOLEAN DEFAULT TRUE,
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_category_id) REFERENCES production_categories(id) ON DELETE SET NULL,
    INDEX idx_category_code (category_code)
);

-- Production Items/Finished Goods
CREATE TABLE IF NOT EXISTS production_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    category_id INT,
    unit_of_measurement VARCHAR(20) DEFAULT 'PCS',
    
    -- Production specifications
    standard_cost DECIMAL(12,4),
    standard_time_hours DECIMAL(8,2), -- Standard manufacturing time
    batch_size INT DEFAULT 1,
    minimum_stock_level DECIMAL(10,2) DEFAULT 0,
    
    -- BOM information
    has_bom BOOLEAN DEFAULT FALSE,
    bom_version VARCHAR(10) DEFAULT '1.0',
    
    -- Quality parameters
    requires_inspection BOOLEAN DEFAULT TRUE,
    shelf_life_days INT,
    
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (category_id) REFERENCES production_categories(id) ON DELETE SET NULL,
    INDEX idx_item_code (item_code),
    INDEX idx_category (category_id),
    INDEX idx_has_bom (has_bom)
);

-- Bill of Materials (BOM) Header
CREATE TABLE IF NOT EXISTS bom_headers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_number VARCHAR(50) UNIQUE NOT NULL,
    production_item_id INT NOT NULL,
    version VARCHAR(10) DEFAULT '1.0',
    
    -- BOM details
    description TEXT,
    quantity_per_unit DECIMAL(10,4) DEFAULT 1, -- How many units this BOM produces
    
    -- Costing
    material_cost DECIMAL(12,4) DEFAULT 0,
    labor_cost DECIMAL(12,4) DEFAULT 0,
    overhead_cost DECIMAL(12,4) DEFAULT 0,
    total_cost DECIMAL(12,4) GENERATED ALWAYS AS (material_cost + labor_cost + overhead_cost) STORED,
    
    -- Status and validity
    status ENUM('draft', 'active', 'inactive', 'superseded') DEFAULT 'draft',
    effective_from DATE,
    effective_to DATE,
    is_current_version BOOLEAN DEFAULT TRUE,
    
    -- Approval workflow
    approved_by INT,
    approved_date TIMESTAMP,
    approval_comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (production_item_id) REFERENCES production_items(id) ON DELETE CASCADE,
    INDEX idx_bom_number (bom_number),
    INDEX idx_production_item (production_item_id),
    INDEX idx_version (production_item_id, version),
    INDEX idx_current_version (production_item_id, is_current_version)
);

-- Bill of Materials (BOM) Lines/Components
CREATE TABLE IF NOT EXISTS bom_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_header_id INT NOT NULL,
    line_number INT NOT NULL,
    
    component_type ENUM('raw_material', 'sub_assembly', 'purchased_part', 'service') NOT NULL,
    component_id INT NOT NULL, -- References inventory_items or production_items
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(200) NOT NULL,
    
    -- Quantity requirements
    quantity_required DECIMAL(12,6) NOT NULL,
    unit_of_measurement VARCHAR(20),
    wastage_percentage DECIMAL(5,2) DEFAULT 0,
    total_quantity DECIMAL(12,6) GENERATED ALWAYS AS (quantity_required * (1 + wastage_percentage/100)) STORED,
    
    -- Costing
    unit_cost DECIMAL(12,4) DEFAULT 0,
    total_cost DECIMAL(12,4) GENERATED ALWAYS AS (total_quantity * unit_cost) STORED,
    
    -- Production details
    operation_sequence INT, -- At which operation this component is consumed
    is_critical_component BOOLEAN DEFAULT FALSE,
    substitute_component_id INT,
    
    -- Sourcing
    preferred_supplier_id INT,
    lead_time_days INT DEFAULT 0,
    
    notes TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bom_header_id) REFERENCES bom_headers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_bom_line (bom_header_id, line_number),
    INDEX idx_component_type_id (component_type, component_id),
    INDEX idx_component_code (component_code)
);

-- Production Operations/Routing
CREATE TABLE IF NOT EXISTS production_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_code VARCHAR(20) UNIQUE NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Operation characteristics
    operation_type ENUM('setup', 'production', 'inspection', 'packaging', 'testing') DEFAULT 'production',
    work_center_code VARCHAR(20),
    
    -- Time standards
    setup_time_hours DECIMAL(8,4) DEFAULT 0,
    run_time_per_unit_hours DECIMAL(8,4) DEFAULT 0,
    teardown_time_hours DECIMAL(8,4) DEFAULT 0,
    
    -- Costing
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    setup_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Quality
    requires_inspection BOOLEAN DEFAULT FALSE,
    inspection_percentage DECIMAL(5,2) DEFAULT 0,
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_operation_code (operation_code),
    INDEX idx_operation_type (operation_type)
);

-- BOM Operations/Routing (Links BOM to Operations)
CREATE TABLE IF NOT EXISTS bom_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_header_id INT NOT NULL,
    operation_id INT NOT NULL,
    sequence_number INT NOT NULL,
    
    -- Operation details for this BOM
    setup_time_hours DECIMAL(8,4) DEFAULT 0,
    run_time_per_unit_hours DECIMAL(8,4) DEFAULT 0,
    batch_quantity INT DEFAULT 1,
    
    -- Dependencies
    predecessor_operation_id INT,
    can_overlap BOOLEAN DEFAULT FALSE,
    overlap_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Quality control
    inspection_required BOOLEAN DEFAULT FALSE,
    inspection_percentage DECIMAL(5,2) DEFAULT 0,
    
    notes TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    FOREIGN KEY (bom_header_id) REFERENCES bom_headers(id) ON DELETE CASCADE,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id) ON DELETE RESTRICT,
    FOREIGN KEY (predecessor_operation_id) REFERENCES bom_operations(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_bom_operation (bom_header_id, sequence_number),
    INDEX idx_sequence (bom_header_id, sequence_number)
);

-- Work Orders (Production Orders)
CREATE TABLE IF NOT EXISTS work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_type ENUM('production', 'rework', 'prototype', 'maintenance') DEFAULT 'production',
    
    -- Production details
    production_item_id INT NOT NULL,
    bom_header_id INT,
    quantity_ordered DECIMAL(12,4) NOT NULL,
    quantity_produced DECIMAL(12,4) DEFAULT 0,
    quantity_scrapped DECIMAL(12,4) DEFAULT 0,
    quantity_remaining DECIMAL(12,4) GENERATED ALWAYS AS (quantity_ordered - quantity_produced - quantity_scrapped) STORED,
    
    unit_of_measurement VARCHAR(20) DEFAULT 'PCS',
    
    -- Scheduling
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Costing
    estimated_material_cost DECIMAL(12,4) DEFAULT 0,
    estimated_labor_cost DECIMAL(12,4) DEFAULT 0,
    estimated_overhead_cost DECIMAL(12,4) DEFAULT 0,
    actual_material_cost DECIMAL(12,4) DEFAULT 0,
    actual_labor_cost DECIMAL(12,4) DEFAULT 0,
    actual_overhead_cost DECIMAL(12,4) DEFAULT 0,
    
    -- Assignment
    manufacturing_unit_id INT,
    assigned_supervisor INT,
    shift_code VARCHAR(10),
    
    -- Status tracking
    status ENUM('draft', 'released', 'in_progress', 'completed', 'cancelled', 'on_hold') DEFAULT 'draft',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- References
    sales_order_id INT, -- If produced for specific sales order
    customer_id INT, -- If customer-specific production
    project_id INT, -- If part of a project
    
    -- Quality
    quality_status ENUM('pending', 'passed', 'failed', 'conditional') DEFAULT 'pending',
    inspection_notes TEXT,
    
    -- Administrative
    notes TEXT,
    special_instructions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    
    FOREIGN KEY (production_item_id) REFERENCES production_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (bom_header_id) REFERENCES bom_headers(id) ON DELETE SET NULL,
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id) ON DELETE SET NULL,
    
    INDEX idx_work_order_number (work_order_number),
    INDEX idx_status (status),
    INDEX idx_planned_dates (planned_start_date, planned_end_date),
    INDEX idx_production_item (production_item_id),
    INDEX idx_priority (priority)
);

-- Work Order Operations (Actual production steps)
CREATE TABLE IF NOT EXISTS work_order_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    bom_operation_id INT,
    operation_id INT NOT NULL,
    sequence_number INT NOT NULL,
    
    -- Planned details
    planned_quantity DECIMAL(12,4) NOT NULL,
    planned_setup_time DECIMAL(8,4) DEFAULT 0,
    planned_run_time DECIMAL(8,4) DEFAULT 0,
    planned_start_date DATETIME,
    planned_end_date DATETIME,
    
    -- Actual details
    actual_quantity DECIMAL(12,4) DEFAULT 0,
    actual_setup_time DECIMAL(8,4) DEFAULT 0,
    actual_run_time DECIMAL(8,4) DEFAULT 0,
    actual_start_date DATETIME,
    actual_end_date DATETIME,
    
    -- Assignment
    assigned_employee_id INT,
    work_center VARCHAR(50),
    machine_id VARCHAR(50),
    
    -- Status
    status ENUM('pending', 'in_progress', 'completed', 'skipped', 'failed') DEFAULT 'pending',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Quality
    quantity_good DECIMAL(12,4) DEFAULT 0,
    quantity_rework DECIMAL(12,4) DEFAULT 0,
    quantity_scrap DECIMAL(12,4) DEFAULT 0,
    
    -- Costing
    labor_cost DECIMAL(12,4) DEFAULT 0,
    machine_cost DECIMAL(12,4) DEFAULT 0,
    overhead_cost DECIMAL(12,4) DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_operation_id) REFERENCES bom_operations(id) ON DELETE SET NULL,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id) ON DELETE RESTRICT,
    
    UNIQUE KEY unique_wo_operation (work_order_id, sequence_number),
    INDEX idx_status (status),
    INDEX idx_assigned_employee (assigned_employee_id)
);

-- Material Requisitions for Work Orders
CREATE TABLE IF NOT EXISTS work_order_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    bom_component_id INT,
    
    -- Component details
    component_type ENUM('raw_material', 'sub_assembly', 'purchased_part') NOT NULL,
    component_id INT NOT NULL,
    component_code VARCHAR(50) NOT NULL,
    component_name VARCHAR(200) NOT NULL,
    
    -- Quantities
    required_quantity DECIMAL(12,6) NOT NULL,
    reserved_quantity DECIMAL(12,6) DEFAULT 0,
    issued_quantity DECIMAL(12,6) DEFAULT 0,
    consumed_quantity DECIMAL(12,6) DEFAULT 0,
    returned_quantity DECIMAL(12,6) DEFAULT 0,
    
    unit_of_measurement VARCHAR(20),
    
    -- Costing
    unit_cost DECIMAL(12,4) DEFAULT 0,
    total_cost DECIMAL(12,4) GENERATED ALWAYS AS (issued_quantity * unit_cost) STORED,
    
    -- Status
    status ENUM('planned', 'reserved', 'issued', 'consumed', 'returned') DEFAULT 'planned',
    
    -- Tracking
    operation_sequence INT, -- At which operation consumed
    batch_number VARCHAR(50),
    lot_number VARCHAR(50),
    expiry_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_component_id) REFERENCES bom_components(id) ON DELETE SET NULL,
    
    INDEX idx_work_order (work_order_id),
    INDEX idx_component (component_type, component_id),
    INDEX idx_status (status)
);

-- Production Time Logs (Labor tracking)
CREATE TABLE IF NOT EXISTS production_time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    work_order_operation_id INT NOT NULL,
    employee_id INT NOT NULL,
    
    -- Time tracking
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    total_hours DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE 
            WHEN end_time IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60.0 
            ELSE 0 
        END
    ) STORED,
    
    -- Activity type
    activity_type ENUM('setup', 'production', 'maintenance', 'quality_check', 'idle') DEFAULT 'production',
    
    -- Output
    quantity_produced DECIMAL(12,4) DEFAULT 0,
    quantity_scrapped DECIMAL(12,4) DEFAULT 0,
    
    -- Performance
    efficiency_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Status
    status ENUM('active', 'paused', 'completed') DEFAULT 'active',
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_operation_id) REFERENCES work_order_operations(id) ON DELETE CASCADE,
    
    INDEX idx_work_order (work_order_id),
    INDEX idx_employee (employee_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_start_time (start_time)
);

-- Quality Inspection Records
CREATE TABLE IF NOT EXISTS quality_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- What is being inspected
    inspection_type ENUM('incoming', 'in_process', 'final', 'customer_return') NOT NULL,
    work_order_id INT,
    work_order_operation_id INT,
    production_item_id INT,
    
    -- Inspection details
    quantity_inspected DECIMAL(12,4) NOT NULL,
    quantity_accepted DECIMAL(12,4) DEFAULT 0,
    quantity_rejected DECIMAL(12,4) DEFAULT 0,
    quantity_rework DECIMAL(12,4) DEFAULT 0,
    
    unit_of_measurement VARCHAR(20),
    
    -- Quality parameters
    inspection_result ENUM('pass', 'fail', 'conditional', 'pending') DEFAULT 'pending',
    defect_category VARCHAR(100),
    defect_description TEXT,
    
    -- Inspector details
    inspector_employee_id INT NOT NULL,
    inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    inspection_location VARCHAR(100),
    
    -- Documentation
    test_certificate_path VARCHAR(500),
    photos_path VARCHAR(500),
    
    -- Corrective actions
    corrective_action_required BOOLEAN DEFAULT FALSE,
    corrective_action_description TEXT,
    corrective_action_due_date DATE,
    corrective_action_completed BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (work_order_operation_id) REFERENCES work_order_operations(id) ON DELETE SET NULL,
    FOREIGN KEY (production_item_id) REFERENCES production_items(id) ON DELETE SET NULL,
    
    INDEX idx_inspection_number (inspection_number),
    INDEX idx_work_order (work_order_id),
    INDEX idx_inspection_type (inspection_type),
    INDEX idx_result (inspection_result),
    INDEX idx_inspection_date (inspection_date)
);

-- Production Schedules (Master Production Schedule)
CREATE TABLE IF NOT EXISTS production_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_name VARCHAR(100) NOT NULL,
    schedule_period_start DATE NOT NULL,
    schedule_period_end DATE NOT NULL,
    
    -- Planning parameters
    planning_horizon_weeks INT DEFAULT 12,
    freeze_period_weeks INT DEFAULT 2,
    
    status ENUM('draft', 'active', 'frozen', 'completed') DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    INDEX idx_schedule_period (schedule_period_start, schedule_period_end),
    INDEX idx_status (status)
);

-- Production Schedule Items
CREATE TABLE IF NOT EXISTS production_schedule_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    production_schedule_id INT NOT NULL,
    production_item_id INT NOT NULL,
    
    week_number INT NOT NULL, -- Week of the year
    planned_quantity DECIMAL(12,4) NOT NULL,
    committed_quantity DECIMAL(12,4) DEFAULT 0,
    
    -- Demand sources
    forecast_quantity DECIMAL(12,4) DEFAULT 0,
    sales_order_quantity DECIMAL(12,4) DEFAULT 0,
    safety_stock_quantity DECIMAL(12,4) DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (production_schedule_id) REFERENCES production_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (production_item_id) REFERENCES production_items(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_schedule_item_week (production_schedule_id, production_item_id, week_number),
    INDEX idx_week_number (week_number)
);

-- Insert Default Data

-- Default Manufacturing Units
INSERT INTO manufacturing_units (unit_name, unit_code, location, capacity_per_day, unit_of_measurement) VALUES
('Main Production Unit', 'MPU', 'Floor 1, Main Building', 100.00, 'PCS'),
('Assembly Unit', 'ASU', 'Floor 2, Main Building', 50.00, 'PCS'),
('Testing & QC Unit', 'QCU', 'Floor 1, Quality Building', 200.00, 'PCS'),
('Packaging Unit', 'PKU', 'Ground Floor, Warehouse', 500.00, 'PCS')
ON DUPLICATE KEY UPDATE unit_name = VALUES(unit_name);

-- Default Production Categories
INSERT INTO production_categories (category_name, category_code, description, default_lead_time_days) VALUES
('Electronics Components', 'ELEC', 'Electronic components and assemblies', 7),
('Mechanical Parts', 'MECH', 'Mechanical components and parts', 5),
('Software Products', 'SOFT', 'Software and digital products', 3),
('Assemblies', 'ASSY', 'Complete product assemblies', 10),
('Consumables', 'CONS', 'Consumable items and supplies', 2)
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- Default Production Operations
INSERT INTO production_operations (operation_code, operation_name, operation_type, setup_time_hours, run_time_per_unit_hours, hourly_rate) VALUES
('SETUP', 'Machine Setup', 'setup', 0.5, 0, 25.00),
('CUT', 'Cutting Operation', 'production', 0.25, 0.1, 20.00),
('DRILL', 'Drilling Operation', 'production', 0.1, 0.05, 22.00),
('ASSEMBLE', 'Assembly Operation', 'production', 0.2, 0.15, 18.00),
('TEST', 'Testing Operation', 'inspection', 0.1, 0.08, 30.00),
('PACK', 'Packaging Operation', 'packaging', 0.1, 0.02, 15.00),
('QC', 'Quality Control', 'inspection', 0.05, 0.1, 35.00),
('FINISH', 'Finishing Operation', 'production', 0.15, 0.12, 25.00)
ON DUPLICATE KEY UPDATE operation_name = VALUES(operation_name);

-- Views for Reporting and Analytics

-- Work Order Summary View
CREATE OR REPLACE VIEW v_work_order_summary AS
SELECT 
    wo.id,
    wo.work_order_number,
    wo.status,
    wo.priority,
    pi.item_name as production_item,
    pi.item_code,
    wo.quantity_ordered,
    wo.quantity_produced,
    wo.quantity_remaining,
    wo.planned_start_date,
    wo.planned_end_date,
    wo.actual_start_date,
    wo.actual_end_date,
    wo.completion_percentage,
    mu.unit_name as manufacturing_unit,
    DATEDIFF(wo.planned_end_date, wo.planned_start_date) as planned_duration_days,
    DATEDIFF(wo.actual_end_date, wo.actual_start_date) as actual_duration_days,
    (wo.estimated_material_cost + wo.estimated_labor_cost + wo.estimated_overhead_cost) as estimated_total_cost,
    (wo.actual_material_cost + wo.actual_labor_cost + wo.actual_overhead_cost) as actual_total_cost
FROM work_orders wo
JOIN production_items pi ON wo.production_item_id = pi.id
LEFT JOIN manufacturing_units mu ON wo.manufacturing_unit_id = mu.id;

-- BOM Cost Analysis View
CREATE OR REPLACE VIEW v_bom_cost_analysis AS
SELECT 
    bh.id,
    bh.bom_number,
    bh.version,
    pi.item_name as production_item,
    pi.item_code,
    bh.quantity_per_unit,
    COUNT(bc.id) as component_count,
    SUM(bc.total_cost) as total_material_cost,
    bh.labor_cost,
    bh.overhead_cost,
    bh.total_cost,
    bh.status,
    bh.is_current_version
FROM bom_headers bh
JOIN production_items pi ON bh.production_item_id = pi.id
LEFT JOIN bom_components bc ON bh.id = bc.bom_header_id AND bc.status = 'active'
WHERE bh.status = 'active'
GROUP BY bh.id, bh.bom_number, bh.version, pi.item_name, pi.item_code, 
         bh.quantity_per_unit, bh.labor_cost, bh.overhead_cost, bh.total_cost, 
         bh.status, bh.is_current_version;

-- Production Efficiency View
CREATE OR REPLACE VIEW v_production_efficiency AS
SELECT 
    wo.id as work_order_id,
    wo.work_order_number,
    pi.item_name,
    wo.quantity_ordered,
    wo.quantity_produced,
    wo.quantity_scrapped,
    ROUND((wo.quantity_produced / wo.quantity_ordered) * 100, 2) as completion_rate,
    ROUND(((wo.quantity_produced - wo.quantity_scrapped) / wo.quantity_produced) * 100, 2) as quality_rate,
    SUM(ptl.total_hours) as total_labor_hours,
    ROUND(wo.quantity_produced / NULLIF(SUM(ptl.total_hours), 0), 2) as productivity_rate,
    AVG(ptl.efficiency_percentage) as average_efficiency
FROM work_orders wo
JOIN production_items pi ON wo.production_item_id = pi.id
LEFT JOIN work_order_operations woo ON wo.id = woo.work_order_id
LEFT JOIN production_time_logs ptl ON woo.id = ptl.work_order_operation_id
WHERE wo.status IN ('completed', 'in_progress')
GROUP BY wo.id, wo.work_order_number, pi.item_name, wo.quantity_ordered, 
         wo.quantity_produced, wo.quantity_scrapped;