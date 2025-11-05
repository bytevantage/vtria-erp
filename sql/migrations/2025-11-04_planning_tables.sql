-- Migration: Production Planning Tables
-- Date: 2025-11-04
-- Purpose: Create tables for production planning, scheduling, waste tracking, and OEE metrics

USE vtria_erp;

-- =============================================
-- PRODUCTION MACHINES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS production_machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_code VARCHAR(50) UNIQUE NOT NULL,
    machine_name VARCHAR(200) NOT NULL,
    machine_type ENUM('cnc', 'lathe', 'mill', 'drill', 'grinder', 'welding', 'assembly', 'testing', 'other') NOT NULL,
    location VARCHAR(100),
    capacity_per_hour DECIMAL(10,2),
    oee_target DECIMAL(5,2) DEFAULT 85.00,
    status ENUM('active', 'maintenance', 'breakdown', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_machine_type (machine_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCTION PLANNING & SCHEDULING TABLES
-- =============================================

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

-- =============================================
-- PRODUCTION WASTE TRACKING
-- =============================================

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

-- =============================================
-- PRODUCTION ANALYTICS & OEE METRICS
-- =============================================

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

-- Insert some default waste categories
INSERT INTO waste_categories (category_code, category_name, waste_type, description) VALUES
('MAT-001', 'Scrap Material', 'material', 'Material that cannot be used due to defects or damage'),
('MAT-002', 'Excess Material', 'material', 'Material cut or prepared in excess of requirements'),
('TIME-001', 'Setup Time', 'time', 'Time spent on machine setup and changeover'),
('TIME-002', 'Waiting Time', 'time', 'Time wasted waiting for materials or equipment'),
('DEF-001', 'Manufacturing Defect', 'defect', 'Products with manufacturing defects'),
('DEF-002', 'Quality Rejection', 'defect', 'Products rejected during quality inspection'),
('OVER-001', 'Overproduction', 'overproduction', 'Production beyond customer requirements'),
('ENRG-001', 'Energy Waste', 'energy', 'Excess energy consumption')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

SELECT 'Production planning tables created successfully' AS status;
