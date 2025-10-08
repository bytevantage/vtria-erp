-- =============================================
-- VTRIA ERP - Missing Production Tables Only
-- =============================================

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Production Operations Table
CREATE TABLE IF NOT EXISTS production_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_code VARCHAR(20) UNIQUE NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    standard_time_minutes DECIMAL(8,2),
    labor_cost_per_hour DECIMAL(10,2),
    machine_cost_per_hour DECIMAL(10,2),
    overhead_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES production_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Production Routes Table
CREATE TABLE IF NOT EXISTS production_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_code VARCHAR(20) UNIQUE NOT NULL,
    route_name VARCHAR(100) NOT NULL,
    product_id INT,
    version VARCHAR(10) DEFAULT '1.0',
    description TEXT,
    total_time_minutes DECIMAL(8,2),
    total_cost DECIMAL(10,2),
    status ENUM('draft', 'active', 'inactive') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Production Route Operations Table
CREATE TABLE IF NOT EXISTS production_route_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    operation_id INT NOT NULL,
    sequence_number INT NOT NULL,
    setup_time_minutes DECIMAL(8,2) DEFAULT 0,
    cycle_time_minutes DECIMAL(8,2) NOT NULL,
    labor_hours DECIMAL(8,2) DEFAULT 0,
    machine_hours DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES production_routes(id) ON DELETE CASCADE,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    UNIQUE KEY unique_route_sequence (route_id, sequence_number)
);

-- Work Order Status Table
CREATE TABLE IF NOT EXISTS work_order_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_code VARCHAR(20) UNIQUE NOT NULL,
    status_name VARCHAR(50) NOT NULL,
    description TEXT,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Work Order Operations Table
CREATE TABLE IF NOT EXISTS work_order_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    operation_id INT NOT NULL,
    sequence_number INT NOT NULL,
    planned_start_date DATETIME,
    planned_end_date DATETIME,
    actual_start_date DATETIME,
    actual_end_date DATETIME,
    assigned_user_id INT,
    status ENUM('pending', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'pending',
    planned_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

-- Quality Control Standards Table
CREATE TABLE IF NOT EXISTS quality_control_standards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    standard_code VARCHAR(20) UNIQUE NOT NULL,
    standard_name VARCHAR(100) NOT NULL,
    description TEXT,
    test_method TEXT,
    acceptance_criteria TEXT,
    measurement_unit VARCHAR(20),
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    target_value DECIMAL(10,4),
    tolerance DECIMAL(10,4),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quality Control Tests Table
CREATE TABLE IF NOT EXISTS quality_control_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id INT,
    operation_id INT,
    standard_id INT NOT NULL,
    test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    tested_by INT,
    test_result DECIMAL(10,4),
    result_status ENUM('pass', 'fail', 'conditional') NOT NULL,
    notes TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    FOREIGN KEY (standard_id) REFERENCES quality_control_standards(id),
    FOREIGN KEY (tested_by) REFERENCES users(id)
);

-- Machine Maintenance Table
CREATE TABLE IF NOT EXISTS machine_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_number VARCHAR(50) UNIQUE NOT NULL,
    machine_id INT,
    maintenance_type ENUM('preventive', 'corrective', 'emergency') NOT NULL,
    scheduled_date DATE,
    actual_date DATE,
    duration_hours DECIMAL(6,2),
    cost DECIMAL(10,2),
    description TEXT,
    performed_by INT,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id),
    INDEX idx_machine_date (machine_id, scheduled_date)
);

-- Production Metrics Table
CREATE TABLE IF NOT EXISTS production_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_date DATE NOT NULL,
    work_order_id INT,
    operation_id INT,
    planned_quantity INT,
    actual_quantity INT,
    good_quantity INT,
    rejected_quantity INT,
    rework_quantity INT,
    planned_time_hours DECIMAL(8,2),
    actual_time_hours DECIMAL(8,2),
    downtime_hours DECIMAL(8,2),
    efficiency_percentage DECIMAL(5,2),
    quality_percentage DECIMAL(5,2),
    oee_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    UNIQUE KEY unique_date_workorder_operation (metric_date, work_order_id, operation_id)
);

-- Insert default work order statuses
INSERT IGNORE INTO work_order_status (status_code, status_name, description, color_code, sort_order) VALUES
('draft', 'Draft', 'Work order is being prepared', '#6c757d', 1),
('released', 'Released', 'Work order has been released for production', '#007bff', 2),
('in_progress', 'In Progress', 'Work order is currently being executed', '#ffc107', 3),
('completed', 'Completed', 'Work order has been completed', '#28a745', 4),
('on_hold', 'On Hold', 'Work order is temporarily suspended', '#fd7e14', 5),
('cancelled', 'Cancelled', 'Work order has been cancelled', '#dc3545', 6);

-- Insert sample production operations
INSERT IGNORE INTO production_operations (operation_code, operation_name, description, category_id, standard_time_minutes, labor_cost_per_hour, machine_cost_per_hour, status, created_by) VALUES
('CUT-001', 'Material Cutting', 'Cut raw materials to required dimensions', 1, 30, 25.00, 15.00, 'active', 1),
('WELD-001', 'Arc Welding', 'Welding operation using arc welding', 1, 45, 35.00, 25.00, 'active', 1),
('MACH-001', 'CNC Machining', 'Precision machining using CNC machines', 1, 60, 40.00, 50.00, 'active', 1),
('ASSM-001', 'Assembly', 'Assembly of components', 1, 90, 30.00, 5.00, 'active', 1),
('PACK-001', 'Packaging', 'Final packaging for delivery', 1, 15, 20.00, 2.00, 'active', 1);

-- Insert sample quality control standards
INSERT IGNORE INTO quality_control_standards (standard_code, standard_name, description, test_method, acceptance_criteria, measurement_unit, min_value, max_value, target_value, tolerance, status, created_by) VALUES
('DIM-001', 'Dimensional Accuracy', 'Check dimensional accuracy of machined parts', 'Caliper measurement', 'Within tolerance limits', 'mm', -0.05, 0.05, 0.00, 0.02, 'active', 1),
('WELD-001', 'Weld Quality', 'Visual inspection of weld quality', 'Visual inspection', 'No visible defects', 'rating', 1, 5, 5, 0, 'active', 1),
('SURF-001', 'Surface Finish', 'Surface roughness measurement', 'Surface roughness tester', 'Ra value within limits', 'Ra', 0.8, 3.2, 1.6, 0.4, 'active', 1);

-- Create indexes for better performance
CREATE INDEX idx_production_operations_category ON production_operations(category_id);
CREATE INDEX idx_production_routes_product ON production_routes(product_id);
CREATE INDEX idx_work_order_operations_wo ON work_order_operations(work_order_id);
CREATE INDEX idx_work_order_operations_status ON work_order_operations(status);
CREATE INDEX idx_quality_tests_workorder ON quality_control_tests(work_order_id);
CREATE INDEX idx_quality_tests_date ON quality_control_tests(test_date);
CREATE INDEX idx_production_metrics_date ON production_metrics(metric_date);