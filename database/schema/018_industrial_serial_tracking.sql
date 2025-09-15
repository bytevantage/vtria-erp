-- Enhanced Serial Number Tracking for Industrial Equipment
-- Specialized tracking for PLC, VFD, HMI, and other automation components

-- Add industrial equipment specific fields to existing serial numbers table
ALTER TABLE inventory_serial_numbers ADD COLUMN (
    -- Equipment Classification
    equipment_type ENUM('plc', 'vfd', 'hmi', 'sensor', 'actuator', 'panel', 'relay', 'contactor', 'other') DEFAULT 'other',
    equipment_category ENUM('control', 'drive', 'interface', 'protection', 'measurement', 'communication', 'power') DEFAULT 'control',
    
    -- Technical Specifications
    firmware_version VARCHAR(50) NULL COMMENT 'Current firmware/software version',
    hardware_revision VARCHAR(20) NULL COMMENT 'Hardware revision number',
    rated_voltage VARCHAR(20) NULL COMMENT 'Operating voltage (24VDC, 230VAC, etc.)',
    rated_current VARCHAR(20) NULL COMMENT 'Operating current rating',
    communication_protocol VARCHAR(100) NULL COMMENT 'Modbus, Ethernet/IP, DeviceNet, etc.',
    io_configuration JSON NULL COMMENT 'Input/output configuration details',
    
    -- Installation & Configuration
    commissioning_date DATE NULL COMMENT 'When equipment was commissioned',
    commissioning_location_id INT NULL COMMENT 'Location where commissioned',
    installation_parameters JSON NULL COMMENT 'Installation-specific parameters',
    configuration_backup_path VARCHAR(255) NULL COMMENT 'Path to configuration backup file',
    program_version VARCHAR(50) NULL COMMENT 'PLC program version or HMI application version',
    
    -- Maintenance & Calibration
    last_calibration_date DATE NULL COMMENT 'Last calibration performed',
    next_calibration_due DATE NULL COMMENT 'Next calibration due date',
    calibration_certificate_path VARCHAR(255) NULL COMMENT 'Digital calibration certificate',
    maintenance_schedule_id INT NULL COMMENT 'Reference to maintenance schedule',
    preventive_maintenance_hours INT DEFAULT 0 COMMENT 'Hours after which PM is due',
    
    -- Performance Metrics
    operating_hours_total INT DEFAULT 0 COMMENT 'Total operating hours',
    power_on_cycles INT DEFAULT 0 COMMENT 'Number of power on/off cycles',
    last_performance_test_date DATE NULL COMMENT 'Last performance test date',
    performance_test_result ENUM('excellent', 'good', 'acceptable', 'poor', 'failed') DEFAULT 'good',
    environmental_rating VARCHAR(20) DEFAULT 'IP20' COMMENT 'IP rating, NEMA rating, etc.',
    
    -- Compliance & Certifications
    safety_certifications JSON NULL COMMENT 'CE, UL, CSA, etc. certifications',
    hazardous_area_rating VARCHAR(50) NULL COMMENT 'Ex rating for hazardous areas',
    regulatory_approvals JSON NULL COMMENT 'Regional regulatory approvals',
    
    -- Failure Tracking
    total_fault_count INT DEFAULT 0 COMMENT 'Total number of faults recorded',
    last_fault_date DATETIME NULL COMMENT 'Date of last fault',
    last_fault_code VARCHAR(50) NULL COMMENT 'Last fault/error code',
    mean_time_between_failures INT NULL COMMENT 'MTBF in hours',
    
    -- Replacement & Compatibility
    replacement_part_numbers JSON NULL COMMENT 'Compatible replacement part numbers',
    compatible_accessories JSON NULL COMMENT 'Compatible accessories and modules',
    upgrade_path JSON NULL COMMENT 'Available upgrade options',
    
    -- Energy & Environmental Data
    power_consumption_watts DECIMAL(8,2) NULL COMMENT 'Power consumption in watts',
    operating_temperature_range VARCHAR(50) NULL COMMENT 'Operating temperature range',
    storage_temperature_range VARCHAR(50) NULL COMMENT 'Storage temperature range',
    humidity_rating VARCHAR(50) NULL COMMENT 'Operating humidity range',
    
    -- Updated timestamp for tracking changes
    technical_data_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create equipment performance history table
CREATE TABLE equipment_performance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    
    -- Performance test details
    test_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    test_type ENUM('commissioning', 'routine', 'troubleshooting', 'calibration', 'upgrade') NOT NULL,
    test_performed_by INT NULL COMMENT 'User who performed the test',
    
    -- Performance metrics
    performance_score DECIMAL(5,2) DEFAULT 0 COMMENT 'Performance score 0-100',
    response_time_ms DECIMAL(8,3) NULL COMMENT 'Response time in milliseconds',
    accuracy_percentage DECIMAL(5,2) NULL COMMENT 'Accuracy percentage',
    precision_rating ENUM('excellent', 'good', 'acceptable', 'poor') DEFAULT 'good',
    
    -- Operating conditions during test
    ambient_temperature DECIMAL(5,2) NULL COMMENT 'Temperature during test',
    humidity_percentage DECIMAL(5,2) NULL COMMENT 'Humidity during test',
    supply_voltage DECIMAL(6,2) NULL COMMENT 'Supply voltage during test',
    load_percentage DECIMAL(5,2) NULL COMMENT 'Load percentage during test',
    
    -- Test results
    test_result ENUM('pass', 'pass_with_notes', 'fail', 'inconclusive') NOT NULL,
    test_notes TEXT NULL COMMENT 'Detailed test notes',
    recommendations TEXT NULL COMMENT 'Recommendations for improvement',
    
    -- Performance degradation tracking
    degradation_factor DECIMAL(5,4) DEFAULT 1.0000 COMMENT 'Performance degradation factor (1.0 = no degradation)',
    estimated_remaining_life_hours INT NULL COMMENT 'Estimated remaining useful life',
    
    -- Documentation
    test_report_path VARCHAR(255) NULL COMMENT 'Path to detailed test report',
    oscilloscope_captures JSON NULL COMMENT 'Paths to oscilloscope captures',
    
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id) ON DELETE CASCADE,
    KEY idx_serial_test_date (serial_number_id, test_date),
    KEY idx_test_type (test_type),
    KEY idx_test_result (test_result)
) COMMENT='Equipment performance test history';

-- Create fault/failure tracking table
CREATE TABLE equipment_fault_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    
    -- Fault occurrence details
    fault_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fault_detected_by ENUM('automatic', 'operator', 'maintenance', 'inspection') DEFAULT 'automatic',
    reported_by INT NULL COMMENT 'User who reported the fault',
    
    -- Fault classification
    fault_category ENUM('hardware', 'software', 'configuration', 'environmental', 'communication', 'power', 'mechanical') NOT NULL,
    fault_severity ENUM('critical', 'major', 'minor', 'warning') NOT NULL,
    fault_code VARCHAR(50) NULL COMMENT 'Equipment-specific fault code',
    fault_description TEXT NOT NULL COMMENT 'Detailed fault description',
    
    -- Operating conditions when fault occurred
    operating_hours_at_fault INT NULL COMMENT 'Operating hours when fault occurred',
    load_at_fault_percentage DECIMAL(5,2) NULL COMMENT 'Load when fault occurred',
    temperature_at_fault DECIMAL(5,2) NULL COMMENT 'Temperature when fault occurred',
    voltage_at_fault DECIMAL(6,2) NULL COMMENT 'Voltage when fault occurred',
    
    -- Fault diagnosis
    root_cause_analysis TEXT NULL COMMENT 'Root cause analysis',
    probable_causes JSON NULL COMMENT 'List of probable causes',
    diagnostic_steps JSON NULL COMMENT 'Steps taken to diagnose the fault',
    
    -- Resolution details
    fault_resolved BOOLEAN DEFAULT FALSE,
    resolution_datetime DATETIME NULL,
    resolved_by INT NULL COMMENT 'User who resolved the fault',
    resolution_method ENUM('repair', 'replacement', 'configuration_change', 'firmware_update', 'calibration', 'cleaning') NULL,
    resolution_description TEXT NULL COMMENT 'How the fault was resolved',
    parts_replaced JSON NULL COMMENT 'Parts that were replaced',
    
    -- Cost and time impact
    downtime_minutes INT DEFAULT 0 COMMENT 'Equipment downtime in minutes',
    repair_cost DECIMAL(10,2) DEFAULT 0 COMMENT 'Cost of repair',
    production_impact_cost DECIMAL(12,2) DEFAULT 0 COMMENT 'Production loss due to fault',
    
    -- Prevention measures
    preventive_actions JSON NULL COMMENT 'Actions to prevent recurrence',
    maintenance_schedule_updated BOOLEAN DEFAULT FALSE,
    
    -- Documentation
    fault_photos JSON NULL COMMENT 'Paths to fault photos',
    repair_documentation_path VARCHAR(255) NULL COMMENT 'Path to repair documentation',
    
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id) ON DELETE CASCADE,
    KEY idx_serial_fault_date (serial_number_id, fault_datetime),
    KEY idx_fault_severity (fault_severity),
    KEY idx_fault_category (fault_category),
    KEY idx_fault_resolved (fault_resolved)
) COMMENT='Equipment fault and failure history';

-- Create maintenance schedule table
CREATE TABLE equipment_maintenance_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    equipment_type ENUM('plc', 'vfd', 'hmi', 'sensor', 'actuator', 'panel', 'relay', 'contactor', 'other') NOT NULL,
    
    -- Schedule details
    maintenance_type ENUM('preventive', 'predictive', 'corrective', 'emergency') DEFAULT 'preventive',
    schedule_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    
    -- Frequency settings
    frequency_type ENUM('hours', 'days', 'weeks', 'months', 'cycles', 'runtime_hours') NOT NULL,
    frequency_value INT NOT NULL COMMENT 'Frequency value (e.g., 30 for 30 days)',
    runtime_trigger_hours INT NULL COMMENT 'Trigger maintenance after this many operating hours',
    
    -- Schedule status
    is_active BOOLEAN DEFAULT TRUE,
    next_maintenance_due DATETIME NULL,
    last_maintenance_completed DATETIME NULL,
    
    -- Maintenance tasks
    maintenance_checklist JSON NULL COMMENT 'Standard maintenance checklist',
    required_tools JSON NULL COMMENT 'Tools required for maintenance',
    required_parts JSON NULL COMMENT 'Parts typically required',
    estimated_duration_hours DECIMAL(4,2) DEFAULT 1.00 COMMENT 'Estimated maintenance duration',
    
    -- Assignments
    assigned_technician_id INT NULL,
    maintenance_priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id) ON DELETE CASCADE,
    KEY idx_equipment_type (equipment_type),
    KEY idx_next_due (next_maintenance_due),
    KEY idx_active_schedules (is_active, next_maintenance_due)
) COMMENT='Equipment maintenance schedules';

-- Create maintenance execution log
CREATE TABLE equipment_maintenance_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_schedule_id INT NOT NULL,
    serial_number_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    
    -- Execution details
    maintenance_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by INT NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    maintenance_type ENUM('preventive', 'predictive', 'corrective', 'emergency') NOT NULL,
    
    -- Work performed
    work_description TEXT NOT NULL,
    checklist_completed JSON NULL COMMENT 'Completed checklist items',
    parts_used JSON NULL COMMENT 'Parts used during maintenance',
    issues_found TEXT NULL COMMENT 'Issues discovered during maintenance',
    
    -- Results
    completion_status ENUM('completed', 'partial', 'deferred', 'cancelled') DEFAULT 'completed',
    equipment_condition_after ENUM('excellent', 'good', 'acceptable', 'needs_attention', 'requires_replacement') DEFAULT 'good',
    performance_improvement TEXT NULL COMMENT 'Performance improvements observed',
    
    -- Follow-up actions
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_description TEXT NULL,
    next_maintenance_recommendation TEXT NULL,
    
    -- Costs
    labor_cost DECIMAL(8,2) DEFAULT 0,
    parts_cost DECIMAL(8,2) DEFAULT 0,
    total_cost DECIMAL(8,2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,
    
    -- Documentation
    maintenance_photos JSON NULL COMMENT 'Photos taken during maintenance',
    documentation_path VARCHAR(255) NULL COMMENT 'Path to maintenance documentation',
    
    FOREIGN KEY (maintenance_schedule_id) REFERENCES equipment_maintenance_schedules(id),
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id) ON DELETE CASCADE,
    KEY idx_maintenance_date (maintenance_date),
    KEY idx_performed_by (performed_by),
    KEY idx_completion_status (completion_status)
) COMMENT='Maintenance execution log';

-- Create comprehensive equipment status view
CREATE VIEW equipment_status_comprehensive AS
SELECT 
    isn.id as serial_number_id,
    isn.serial_number,
    isn.product_id,
    p.name as product_name,
    p.product_code,
    
    -- Equipment classification
    isn.equipment_type,
    isn.equipment_category,
    isn.status as current_status,
    
    -- Technical specifications
    isn.firmware_version,
    isn.hardware_revision,
    isn.rated_voltage,
    isn.rated_current,
    isn.communication_protocol,
    
    -- Installation info
    isn.commissioning_date,
    isn.commissioning_location_id,
    l.name as location_name,
    
    -- Performance metrics
    isn.operating_hours_total,
    isn.power_on_cycles,
    isn.total_fault_count,
    isn.last_fault_date,
    isn.performance_test_result,
    
    -- Latest performance data
    lph.performance_score as latest_performance_score,
    lph.test_date as last_performance_test_date,
    lph.test_result as last_test_result,
    
    -- Maintenance status
    COALESCE(ems.next_maintenance_due, DATE_ADD(CURDATE(), INTERVAL 365 DAY)) as next_maintenance_due,
    CASE 
        WHEN ems.next_maintenance_due IS NULL THEN 'No Schedule'
        WHEN ems.next_maintenance_due < CURDATE() THEN 'Overdue'
        WHEN ems.next_maintenance_due < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Due Soon'
        WHEN ems.next_maintenance_due < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Upcoming'
        ELSE 'Scheduled'
    END as maintenance_status,
    
    -- Warranty info
    isn.warranty_start_date,
    isn.warranty_end_date,
    CASE 
        WHEN isn.warranty_end_date IS NULL THEN 'No Warranty'
        WHEN isn.warranty_end_date < CURDATE() THEN 'Expired'
        WHEN isn.warranty_end_date < DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expiring Soon'
        ELSE 'Active'
    END as warranty_status,
    
    -- Failure analysis
    CASE 
        WHEN isn.operating_hours_total = 0 THEN NULL
        WHEN isn.total_fault_count = 0 THEN isn.operating_hours_total
        ELSE isn.operating_hours_total / isn.total_fault_count
    END as mean_time_between_failures,
    
    -- Overall health score
    CASE 
        WHEN isn.total_fault_count > 5 THEN 30
        WHEN isn.total_fault_count > 2 THEN 60
        WHEN lph.performance_score IS NULL THEN 75
        ELSE GREATEST(50, lph.performance_score)
    END as health_score,
    
    -- Risk assessment
    CASE 
        WHEN isn.total_fault_count > 5 OR lph.performance_score < 50 THEN 'High Risk'
        WHEN isn.total_fault_count > 2 OR lph.performance_score < 70 THEN 'Medium Risk'
        WHEN ems.next_maintenance_due < CURDATE() THEN 'Medium Risk'
        ELSE 'Low Risk'
    END as risk_level

FROM inventory_serial_numbers isn
LEFT JOIN products p ON isn.product_id = p.id
LEFT JOIN locations l ON isn.commissioning_location_id = l.id
LEFT JOIN equipment_maintenance_schedules ems ON isn.id = ems.serial_number_id AND ems.is_active = TRUE
LEFT JOIN (
    -- Get latest performance test for each serial number
    SELECT 
        serial_number_id,
        performance_score,
        test_date,
        test_result,
        ROW_NUMBER() OVER (PARTITION BY serial_number_id ORDER BY test_date DESC) as rn
    FROM equipment_performance_history
) lph ON isn.id = lph.serial_number_id AND lph.rn = 1
WHERE isn.equipment_type IS NOT NULL;

-- Create maintenance dashboard view
CREATE VIEW maintenance_dashboard_view AS
SELECT 
    'overdue' as status,
    COUNT(*) as equipment_count,
    AVG(health_score) as avg_health_score
FROM equipment_status_comprehensive
WHERE maintenance_status = 'Overdue'
UNION ALL
SELECT 
    'due_soon' as status,
    COUNT(*) as equipment_count,
    AVG(health_score) as avg_health_score
FROM equipment_status_comprehensive
WHERE maintenance_status = 'Due Soon'
UNION ALL
SELECT 
    'high_risk' as status,
    COUNT(*) as equipment_count,
    AVG(health_score) as avg_health_score
FROM equipment_status_comprehensive
WHERE risk_level = 'High Risk'
UNION ALL
SELECT 
    'warranty_expiring' as status,
    COUNT(*) as equipment_count,
    AVG(health_score) as avg_health_score
FROM equipment_status_comprehensive
WHERE warranty_status = 'Expiring Soon';

-- Create stored procedure for updating equipment operating hours
DELIMITER //

CREATE PROCEDURE UpdateEquipmentOperatingHours(
    IN p_serial_number VARCHAR(100),
    IN p_hours_to_add INT,
    IN p_power_cycles_to_add INT DEFAULT 0
)
BEGIN
    DECLARE v_serial_id INT;
    DECLARE v_current_hours INT;
    DECLARE v_maintenance_due DATETIME;
    
    -- Get serial number ID and current hours
    SELECT id, operating_hours_total 
    INTO v_serial_id, v_current_hours
    FROM inventory_serial_numbers 
    WHERE serial_number = p_serial_number;
    
    IF v_serial_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Serial number not found';
    END IF;
    
    -- Update operating hours and power cycles
    UPDATE inventory_serial_numbers SET 
        operating_hours_total = operating_hours_total + p_hours_to_add,
        power_on_cycles = power_on_cycles + p_power_cycles_to_add
    WHERE id = v_serial_id;
    
    -- Check if maintenance is due based on runtime hours
    SELECT next_maintenance_due INTO v_maintenance_due
    FROM equipment_maintenance_schedules 
    WHERE serial_number_id = v_serial_id 
    AND frequency_type = 'runtime_hours'
    AND (v_current_hours + p_hours_to_add) >= runtime_trigger_hours
    AND is_active = TRUE
    LIMIT 1;
    
    -- Update maintenance due date if runtime threshold reached
    IF v_maintenance_due IS NOT NULL THEN
        UPDATE equipment_maintenance_schedules SET 
            next_maintenance_due = NOW()
        WHERE serial_number_id = v_serial_id 
        AND frequency_type = 'runtime_hours'
        AND is_active = TRUE;
    END IF;
    
END //

DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_serial_equipment_type ON inventory_serial_numbers(equipment_type, equipment_category);
CREATE INDEX idx_serial_operating_hours ON inventory_serial_numbers(operating_hours_total, total_fault_count);
CREATE INDEX idx_serial_maintenance_due ON inventory_serial_numbers(id) WHERE equipment_type IS NOT NULL;

-- Insert sample data for testing
INSERT INTO equipment_maintenance_schedules (
    serial_number_id, serial_number, equipment_type,
    maintenance_type, schedule_name, description,
    frequency_type, frequency_value, runtime_trigger_hours,
    maintenance_checklist, estimated_duration_hours
) VALUES (
    1, 'PLC001', 'plc',
    'preventive', 'Quarterly PLC Inspection', 'Standard preventive maintenance for PLC systems',
    'months', 3, 2000,
    '["Check connections", "Verify I/O status", "Update firmware", "Backup program", "Clean enclosure"]',
    2.5
);

-- Add triggers for automatic maintenance scheduling
DELIMITER //

CREATE TRIGGER create_default_maintenance_schedule
    AFTER INSERT ON inventory_serial_numbers
    FOR EACH ROW
BEGIN
    IF NEW.equipment_type IS NOT NULL THEN
        INSERT INTO equipment_maintenance_schedules (
            serial_number_id, serial_number, equipment_type,
            maintenance_type, schedule_name, description,
            frequency_type, frequency_value,
            next_maintenance_due
        ) VALUES (
            NEW.id, NEW.serial_number, NEW.equipment_type,
            'preventive', 
            CONCAT('Standard ', UPPER(NEW.equipment_type), ' Maintenance'),
            CONCAT('Default preventive maintenance schedule for ', NEW.equipment_type),
            'months', 
            CASE NEW.equipment_type
                WHEN 'plc' THEN 6
                WHEN 'vfd' THEN 4
                WHEN 'hmi' THEN 12
                ELSE 6
            END,
            DATE_ADD(COALESCE(NEW.commissioning_date, CURDATE()), 
                     INTERVAL CASE NEW.equipment_type
                         WHEN 'plc' THEN 6
                         WHEN 'vfd' THEN 4
                         WHEN 'hmi' THEN 12
                         ELSE 6
                     END MONTH)
        );
    END IF;
END //

DELIMITER ;

COMMENT ON TABLE equipment_performance_history IS 'Performance tracking for industrial automation equipment';
COMMENT ON TABLE equipment_fault_history IS 'Comprehensive fault and failure tracking';
COMMENT ON TABLE equipment_maintenance_schedules IS 'Maintenance scheduling for industrial equipment';
COMMENT ON VIEW equipment_status_comprehensive IS 'Complete equipment status with health scoring';