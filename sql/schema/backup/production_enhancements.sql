-- ============================================================================
-- PRODUCTION MODULE ENHANCEMENTS
-- ============================================================================
-- This schema enhances the production module with:
-- - Quality Control Management
-- - Shop Floor Control
-- - Production Analytics
-- - Resource Management
-- - Real-time Monitoring
-- ============================================================================

-- ============================================================================
-- QUALITY CONTROL ENHANCEMENTS
-- ============================================================================

-- Quality Inspection Checkpoints
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkpoint_code VARCHAR(50) UNIQUE NOT NULL,
    checkpoint_name VARCHAR(200) NOT NULL,
    checkpoint_type ENUM('incoming', 'in_process', 'final', 'pre_delivery') DEFAULT 'in_process',
    description TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    sequence_order INT DEFAULT 0,
    applicable_categories JSON COMMENT 'Product categories this applies to',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_checkpoint_type (checkpoint_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quality Defect Types
CREATE TABLE IF NOT EXISTS quality_defect_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    defect_code VARCHAR(50) UNIQUE NOT NULL,
    defect_name VARCHAR(200) NOT NULL,
    category ENUM('critical', 'major', 'minor', 'cosmetic') DEFAULT 'minor',
    description TEXT,
    root_cause_category VARCHAR(100) COMMENT 'Material, Process, Equipment, Human',
    corrective_action_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enhanced Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id INT,
    manufacturing_case_id INT,
    product_id INT,
    checkpoint_id INT,
    batch_number VARCHAR(50),
    lot_number VARCHAR(50),
    inspection_type ENUM('incoming', 'in_process', 'final', 'pre_delivery', 'audit') NOT NULL,
    inspection_date DATETIME NOT NULL,
    inspector_id INT NOT NULL,
    
    -- Quantities
    sample_size INT NOT NULL,
    quantity_inspected INT NOT NULL,
    quantity_accepted INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    quantity_rework INT DEFAULT 0,
    
    -- Results
    overall_result ENUM('passed', 'failed', 'conditional', 'pending') DEFAULT 'pending',
    conformance_percentage DECIMAL(5,2) COMMENT 'Percentage of checks passed',
    
    -- Details
    inspection_criteria JSON COMMENT 'Criteria and measurements',
    defects_found JSON COMMENT 'Array of defects with details',
    measurements JSON COMMENT 'Dimensional and other measurements',
    observations TEXT,
    inspector_notes TEXT,
    
    -- Actions
    action_required ENUM('none', 'rework', 'scrap', 'hold', 'return_to_supplier') DEFAULT 'none',
    corrective_action TEXT,
    preventive_action TEXT,
    
    -- Approvals
    approved_by INT,
    approved_at DATETIME,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    
    -- Attachments
    attachments JSON COMMENT 'Photos, documents, test reports',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (checkpoint_id) REFERENCES quality_checkpoints(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_inspection_type (inspection_type),
    INDEX idx_inspection_date (inspection_date),
    INDEX idx_overall_result (overall_result),
    INDEX idx_work_order (work_order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quality Defect Records
CREATE TABLE IF NOT EXISTS quality_defect_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    defect_type_id INT NOT NULL,
    defect_count INT DEFAULT 1,
    severity ENUM('critical', 'major', 'minor', 'cosmetic') NOT NULL,
    location VARCHAR(200) COMMENT 'Where defect was found',
    description TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    responsible_person_id INT,
    resolved_at DATETIME,
    cost_impact DECIMAL(10,2) COMMENT 'Cost of defect',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES quality_inspections_enhanced(id) ON DELETE CASCADE,
    FOREIGN KEY (defect_type_id) REFERENCES quality_defect_types(id),
    FOREIGN KEY (responsible_person_id) REFERENCES users(id),
    INDEX idx_inspection (inspection_id),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SHOP FLOOR CONTROL
-- ============================================================================

-- Work Order Operations Tracking
CREATE TABLE IF NOT EXISTS work_order_operation_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_operation_id INT NOT NULL,
    work_order_id INT NOT NULL,
    operation_id INT NOT NULL,
    
    -- Resource Assignment
    operator_id INT,
    machine_id INT,
    workstation VARCHAR(100),
    
    -- Time Tracking
    started_at DATETIME,
    paused_at DATETIME,
    resumed_at DATETIME,
    completed_at DATETIME,
    actual_duration_minutes INT COMMENT 'Total working time excluding pauses',
    
    -- Quantity Tracking
    quantity_planned INT NOT NULL,
    quantity_completed INT DEFAULT 0,
    quantity_good INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    quantity_rework INT DEFAULT 0,
    
    -- Status
    status ENUM('not_started', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'not_started',
    pause_reason VARCHAR(200),
    
    -- Performance Metrics
    efficiency_percentage DECIMAL(5,2) COMMENT 'Actual vs standard time',
    quality_percentage DECIMAL(5,2) COMMENT 'Good quantity vs total',
    
    -- Notes
    operator_notes TEXT,
    supervisor_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_operation_id) REFERENCES work_order_operations(id),
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    FOREIGN KEY (operator_id) REFERENCES users(id),
    
    INDEX idx_work_order (work_order_id),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id),
    INDEX idx_dates (started_at, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Machine/Equipment Master
CREATE TABLE IF NOT EXISTS production_machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_code VARCHAR(50) UNIQUE NOT NULL,
    machine_name VARCHAR(200) NOT NULL,
    machine_type VARCHAR(100),
    manufacturer VARCHAR(200),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Location
    manufacturing_unit_id INT,
    workstation VARCHAR(100),
    
    -- Capacity
    capacity_per_hour DECIMAL(10,2),
    capacity_unit VARCHAR(20),
    
    -- Cost
    hourly_rate DECIMAL(10,2),
    
    -- Maintenance
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_interval_days INT DEFAULT 90,
    
    -- Status
    status ENUM('available', 'in_use', 'maintenance', 'breakdown', 'retired') DEFAULT 'available',
    
    -- Specifications
    specifications JSON COMMENT 'Technical specifications',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_status (status),
    INDEX idx_manufacturing_unit (manufacturing_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Machine Utilization Log
CREATE TABLE IF NOT EXISTS machine_utilization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    work_order_id INT,
    operation_tracking_id INT,
    
    -- Time
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_minutes INT,
    
    -- Utilization Type
    utilization_type ENUM('productive', 'setup', 'maintenance', 'breakdown', 'idle') NOT NULL,
    
    -- Downtime Details (if applicable)
    downtime_reason VARCHAR(200),
    downtime_category ENUM('planned', 'unplanned'),
    
    -- Performance
    actual_output INT,
    target_output INT,
    efficiency_percentage DECIMAL(5,2),
    
    operator_id INT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (machine_id) REFERENCES production_machines(id),
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (operation_tracking_id) REFERENCES work_order_operation_tracking(id),
    FOREIGN KEY (operator_id) REFERENCES users(id),
    
    INDEX idx_machine (machine_id),
    INDEX idx_time_range (start_time, end_time),
    INDEX idx_utilization_type (utilization_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCTION PLANNING & SCHEDULING
-- ============================================================================

-- Production Schedule
CREATE TABLE IF NOT EXISTS production_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_code VARCHAR(50) UNIQUE NOT NULL,
    schedule_name VARCHAR(200) NOT NULL,
    schedule_type ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    schedule_date DATE NOT NULL,
    manufacturing_unit_id INT,
    
    -- Planning
    planned_capacity DECIMAL(10,2),
    allocated_capacity DECIMAL(10,2),
    available_capacity DECIMAL(10,2),
    
    -- Status
    status ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    
    -- Performance
    actual_output DECIMAL(10,2),
    efficiency_percentage DECIMAL(5,2),
    
    notes TEXT,
    created_by INT,
    approved_by INT,
    approved_at DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_status (status),
    INDEX idx_manufacturing_unit (manufacturing_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production Schedule Items
CREATE TABLE IF NOT EXISTS production_schedule_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    work_order_id INT NOT NULL,
    sequence_order INT DEFAULT 0,
    
    -- Time Allocation
    planned_start_time DATETIME,
    planned_end_time DATETIME,
    estimated_duration_minutes INT,
    
    -- Actual
    actual_start_time DATETIME,
    actual_end_time DATETIME,
    actual_duration_minutes INT,
    
    -- Resources
    assigned_machine_id INT,
    assigned_operator_id INT,
    
    -- Priority
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    status ENUM('scheduled', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'scheduled',
    delay_reason VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schedule_id) REFERENCES production_schedule(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (assigned_machine_id) REFERENCES production_machines(id),
    FOREIGN KEY (assigned_operator_id) REFERENCES users(id),
    
    INDEX idx_schedule (schedule_id),
    INDEX idx_work_order (work_order_id),
    INDEX idx_time_range (planned_start_time, planned_end_time),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCTION WASTE TRACKING
-- ============================================================================

-- Waste Categories
CREATE TABLE IF NOT EXISTS waste_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    waste_type ENUM('material', 'time', 'energy', 'defect', 'overproduction') NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Waste Records
CREATE TABLE IF NOT EXISTS production_waste_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    waste_category_id INT NOT NULL,
    
    -- Quantity
    waste_quantity DECIMAL(10,2) NOT NULL,
    waste_unit VARCHAR(20) NOT NULL,
    
    -- Cost
    material_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    overhead_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    -- Details
    waste_reason VARCHAR(200),
    root_cause TEXT,
    corrective_action TEXT,
    
    -- Responsibility
    responsible_operator_id INT,
    reported_by INT,
    
    -- Disposal
    disposal_method VARCHAR(100),
    disposed_at DATETIME,
    
    waste_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (waste_category_id) REFERENCES waste_categories(id),
    FOREIGN KEY (responsible_operator_id) REFERENCES users(id),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    
    INDEX idx_work_order (work_order_id),
    INDEX idx_waste_date (waste_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCTION ANALYTICS & METRICS
-- ============================================================================

-- OEE (Overall Equipment Effectiveness) Records
CREATE TABLE IF NOT EXISTS production_oee_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT,
    manufacturing_unit_id INT,
    work_order_id INT,
    
    -- Date
    record_date DATE NOT NULL,
    shift VARCHAR(50),
    
    -- Time Components
    planned_production_time_minutes INT NOT NULL,
    actual_runtime_minutes INT NOT NULL,
    downtime_minutes INT DEFAULT 0,
    
    -- Quantity Components
    target_quantity INT NOT NULL,
    actual_quantity INT NOT NULL,
    good_quantity INT NOT NULL,
    rejected_quantity INT DEFAULT 0,
    
    -- OEE Factors
    availability_percentage DECIMAL(5,2) COMMENT 'Runtime / Planned time',
    performance_percentage DECIMAL(5,2) COMMENT 'Actual / Target',
    quality_percentage DECIMAL(5,2) COMMENT 'Good / Actual',
    oee_percentage DECIMAL(5,2) COMMENT 'Availability × Performance × Quality',
    
    -- World Class OEE Benchmark: 85%+
    oee_rating ENUM('poor', 'fair', 'good', 'excellent', 'world_class') GENERATED ALWAYS AS (
        CASE
            WHEN oee_percentage >= 85 THEN 'world_class'
            WHEN oee_percentage >= 75 THEN 'excellent'
            WHEN oee_percentage >= 65 THEN 'good'
            WHEN oee_percentage >= 50 THEN 'fair'
            ELSE 'poor'
        END
    ) STORED,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (machine_id) REFERENCES production_machines(id),
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    
    INDEX idx_record_date (record_date),
    INDEX idx_machine (machine_id),
    INDEX idx_oee_rating (oee_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- REPORTING VIEWS
-- ============================================================================

-- View: Active Quality Inspections
CREATE OR REPLACE VIEW v_active_quality_inspections AS
SELECT 
    qi.id,
    qi.inspection_number,
    qi.inspection_type,
    qi.inspection_date,
    qi.overall_result,
    qi.status,
    qi.sample_size,
    qi.quantity_inspected,
    qi.quantity_accepted,
    qi.quantity_rejected,
    qi.conformance_percentage,
    wo.work_order_number,
    mc.manufacturing_case_number,
    p.name as product_name,
    qc.checkpoint_name,
    CONCAT(inspector.first_name, ' ', inspector.last_name) as inspector_name,
    qi.created_at
FROM quality_inspections_enhanced qi
LEFT JOIN manufacturing_work_orders wo ON qi.work_order_id = wo.id
LEFT JOIN manufacturing_cases mc ON qi.manufacturing_case_id = mc.id
LEFT JOIN products p ON qi.product_id = p.id
LEFT JOIN quality_checkpoints qc ON qi.checkpoint_id = qc.id
LEFT JOIN users inspector ON qi.inspector_id = inspector.id
WHERE qi.status IN ('draft', 'submitted')
ORDER BY qi.inspection_date DESC;

-- View: Machine Utilization Summary
CREATE OR REPLACE VIEW v_machine_utilization_summary AS
SELECT 
    m.id as machine_id,
    m.machine_code,
    m.machine_name,
    m.status as machine_status,
    mu.unit_name as manufacturing_unit,
    COUNT(DISTINCT mul.id) as utilization_records,
    SUM(CASE WHEN mul.utilization_type = 'productive' THEN mul.duration_minutes ELSE 0 END) as productive_minutes,
    SUM(CASE WHEN mul.utilization_type = 'breakdown' THEN mul.duration_minutes ELSE 0 END) as breakdown_minutes,
    SUM(CASE WHEN mul.utilization_type = 'maintenance' THEN mul.duration_minutes ELSE 0 END) as maintenance_minutes,
    SUM(CASE WHEN mul.utilization_type = 'idle' THEN mul.duration_minutes ELSE 0 END) as idle_minutes,
    SUM(mul.duration_minutes) as total_minutes,
    ROUND((SUM(CASE WHEN mul.utilization_type = 'productive' THEN mul.duration_minutes ELSE 0 END) / 
           NULLIF(SUM(mul.duration_minutes), 0)) * 100, 2) as utilization_percentage
FROM production_machines m
LEFT JOIN manufacturing_units mu ON m.manufacturing_unit_id = mu.id
LEFT JOIN machine_utilization_log mul ON m.id = mul.machine_id 
    AND mul.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY m.id, m.machine_code, m.machine_name, m.status, mu.unit_name;

-- View: Production Schedule Status
CREATE OR REPLACE VIEW v_production_schedule_status AS
SELECT 
    ps.id as schedule_id,
    ps.schedule_code,
    ps.schedule_name,
    ps.schedule_date,
    ps.status as schedule_status,
    mu.unit_name,
    COUNT(psi.id) as total_work_orders,
    COUNT(CASE WHEN psi.status = 'completed' THEN 1 END) as completed_work_orders,
    COUNT(CASE WHEN psi.status = 'in_progress' THEN 1 END) as in_progress_work_orders,
    COUNT(CASE WHEN psi.status = 'delayed' THEN 1 END) as delayed_work_orders,
    ps.planned_capacity,
    ps.allocated_capacity,
    ps.available_capacity,
    ROUND((COUNT(CASE WHEN psi.status = 'completed' THEN 1 END) / 
           NULLIF(COUNT(psi.id), 0)) * 100, 2) as completion_percentage
FROM production_schedule ps
LEFT JOIN manufacturing_units mu ON ps.manufacturing_unit_id = mu.id
LEFT JOIN production_schedule_items psi ON ps.id = psi.schedule_id
GROUP BY ps.id, ps.schedule_code, ps.schedule_name, ps.schedule_date, 
         ps.status, mu.unit_name, ps.planned_capacity, ps.allocated_capacity, ps.available_capacity;

-- View: Quality Metrics Dashboard
CREATE OR REPLACE VIEW v_quality_metrics_dashboard AS
SELECT 
    DATE(qi.inspection_date) as inspection_date,
    qi.inspection_type,
    COUNT(qi.id) as total_inspections,
    COUNT(CASE WHEN qi.overall_result = 'passed' THEN 1 END) as passed_count,
    COUNT(CASE WHEN qi.overall_result = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN qi.overall_result = 'conditional' THEN 1 END) as conditional_count,
    SUM(qi.quantity_inspected) as total_inspected,
    SUM(qi.quantity_accepted) as total_accepted,
    SUM(qi.quantity_rejected) as total_rejected,
    ROUND((SUM(qi.quantity_accepted) / NULLIF(SUM(qi.quantity_inspected), 0)) * 100, 2) as acceptance_rate,
    AVG(qi.conformance_percentage) as avg_conformance
FROM quality_inspections_enhanced qi
WHERE qi.inspection_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(qi.inspection_date), qi.inspection_type
ORDER BY inspection_date DESC;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert default quality checkpoints
INSERT INTO quality_checkpoints (checkpoint_code, checkpoint_name, checkpoint_type, is_mandatory, sequence_order, created_by) VALUES
('IQC-001', 'Incoming Material Inspection', 'incoming', TRUE, 1, 3),
('IPC-001', 'First Piece Inspection', 'in_process', TRUE, 2, 3),
('IPC-002', 'In-Process Quality Check', 'in_process', TRUE, 3, 3),
('FQC-001', 'Final Assembly Inspection', 'final', TRUE, 4, 3),
('FQC-002', 'Pre-Delivery Inspection', 'pre_delivery', TRUE, 5, 3);

-- Insert default defect types
INSERT INTO quality_defect_types (defect_code, defect_name, category, root_cause_category) VALUES
('DEF-DIM-001', 'Dimensional Deviation', 'major', 'Process'),
('DEF-VIS-001', 'Surface Scratch', 'minor', 'Material'),
('DEF-WLD-001', 'Weld Defect', 'critical', 'Process'),
('DEF-ASM-001', 'Assembly Misalignment', 'major', 'Human'),
('DEF-FIN-001', 'Finish Quality Issue', 'cosmetic', 'Material'),
('DEF-FNC-001', 'Functional Failure', 'critical', 'Equipment'),
('DEF-PKG-001', 'Packaging Damage', 'minor', 'Human');

-- Insert default waste categories
INSERT INTO waste_categories (category_code, category_name, waste_type) VALUES
('WST-MAT-001', 'Material Scrap', 'material'),
('WST-MAT-002', 'Excess Material', 'material'),
('WST-DEF-001', 'Defective Units', 'defect'),
('WST-TIM-001', 'Setup Time Waste', 'time'),
('WST-TIM-002', 'Waiting Time', 'time'),
('WST-OVP-001', 'Overproduction', 'overproduction');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Production enhancements schema created successfully!' as message,
       'Added Quality Control, Shop Floor Management, Production Planning, and Analytics' as details;
