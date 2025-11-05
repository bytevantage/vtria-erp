-- Migration: Shop Floor Tracking Tables
-- Date: 2025-11-05
-- Purpose: Recreate missing shop floor tracking tables required by the API

USE vtria_erp;

-- =====================================================
-- RESET SHOP FLOOR TABLES TO CANONICAL STRUCTURE
-- WARNING: THIS WILL DROP ANY EXISTING DATA IN THESE TABLES.
-- Ensure you have a backup before running in production.
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS machine_utilization_log;
DROP TABLE IF EXISTS work_order_operation_tracking;
DROP TABLE IF EXISTS production_machines;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- PRODUCTION MACHINES MASTER
-- =============================================

CREATE TABLE production_machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_code VARCHAR(50) NOT NULL,
    machine_name VARCHAR(200) NOT NULL,
    machine_type VARCHAR(100) DEFAULT NULL,
    manufacturer VARCHAR(200) DEFAULT NULL,
    model_number VARCHAR(100) DEFAULT NULL,
    serial_number VARCHAR(100) DEFAULT NULL,
    manufacturing_unit_id INT DEFAULT NULL,
    workstation VARCHAR(100) DEFAULT NULL,
    capacity_per_hour DECIMAL(10,2) DEFAULT NULL,
    capacity_unit VARCHAR(20) DEFAULT NULL,
    hourly_rate DECIMAL(10,2) DEFAULT NULL,
    last_maintenance_date DATE DEFAULT NULL,
    next_maintenance_date DATE DEFAULT NULL,
    maintenance_interval_days INT DEFAULT 90,
    status ENUM('available','in_use','maintenance','breakdown','retired') DEFAULT 'available',
    specifications JSON DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_machine_code (machine_code),
    INDEX idx_status (status),
    INDEX idx_manufacturing_unit (manufacturing_unit_id),
    INDEX idx_created_by (created_by),
    CONSTRAINT fk_production_machines_unit FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    CONSTRAINT fk_production_machines_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCTION OPERATIONS MASTER (ENSURE EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS production_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_code VARCHAR(50) NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    description TEXT,
    standard_time_minutes DECIMAL(8,2),
    labor_cost_per_hour DECIMAL(10,2),
    machine_cost_per_hour DECIMAL(10,2),
    overhead_percentage DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_operation_code (operation_code),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    CONSTRAINT fk_production_operations_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- WORK ORDER OPERATION TRACKING
-- =============================================

CREATE TABLE work_order_operation_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_operation_id INT NULL,
    work_order_id INT NOT NULL,
    operation_id INT NOT NULL,
    operator_id INT NULL,
    machine_id INT NULL,
    workstation VARCHAR(100) DEFAULT NULL,
    started_at DATETIME DEFAULT NULL,
    paused_at DATETIME DEFAULT NULL,
    resumed_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    actual_duration_minutes INT DEFAULT NULL,
    quantity_planned INT NOT NULL,
    quantity_completed INT DEFAULT 0,
    quantity_good INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    quantity_rework INT DEFAULT 0,
    status ENUM('not_started','in_progress','paused','completed','cancelled') DEFAULT 'not_started',
    pause_reason VARCHAR(200) DEFAULT NULL,
    efficiency_percentage DECIMAL(5,2) DEFAULT NULL,
    quality_percentage DECIMAL(5,2) DEFAULT NULL,
    operator_notes TEXT,
    supervisor_notes TEXT,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_work_order (work_order_id),
    INDEX idx_operation (operation_id),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id),
    INDEX idx_machine (machine_id),
    INDEX idx_started_at (started_at),
    CONSTRAINT fk_wot_work_order FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    CONSTRAINT fk_wot_operation FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    CONSTRAINT fk_wot_operator FOREIGN KEY (operator_id) REFERENCES users(id),
    CONSTRAINT fk_wot_machine FOREIGN KEY (machine_id) REFERENCES production_machines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MACHINE UTILIZATION LOG
-- =============================================

CREATE TABLE machine_utilization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    work_order_id INT NULL,
    operation_tracking_id INT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME DEFAULT NULL,
    duration_minutes INT DEFAULT NULL,
    utilization_type ENUM('productive','setup','maintenance','breakdown','idle') NOT NULL,
    downtime_reason VARCHAR(200) DEFAULT NULL,
    downtime_category ENUM('planned','unplanned') DEFAULT NULL,
    actual_output INT DEFAULT NULL,
    target_output INT DEFAULT NULL,
    efficiency_percentage DECIMAL(5,2) DEFAULT NULL,
    operator_id INT NULL,
    notes TEXT,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_machine (machine_id),
    INDEX idx_utilization_type (utilization_type),
    INDEX idx_time_range (start_time, end_time),
    INDEX idx_operator (operator_id),
    INDEX idx_work_order (work_order_id),
    INDEX idx_operation_tracking (operation_tracking_id),
    CONSTRAINT fk_mul_machine FOREIGN KEY (machine_id) REFERENCES production_machines(id),
    CONSTRAINT fk_mul_work_order FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    CONSTRAINT fk_mul_operation_tracking FOREIGN KEY (operation_tracking_id) REFERENCES work_order_operation_tracking(id),
    CONSTRAINT fk_mul_operator FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Shop floor tracking tables created successfully' AS status;
