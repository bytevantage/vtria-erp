const db = require('../config/database');

class IndustrialEquipmentController {
    // Get comprehensive equipment status
    async getEquipmentStatus(req, res) {
        try {
            const { 
                equipment_type, 
                location_id, 
                risk_level, 
                maintenance_status,
                page = 1, 
                limit = 20 
            } = req.query;

            let whereConditions = [];
            const params = [];

            if (equipment_type && equipment_type !== 'all') {
                whereConditions.push('equipment_type = ?');
                params.push(equipment_type);
            }

            if (location_id && location_id !== '0') {
                whereConditions.push('commissioning_location_id = ?');
                params.push(location_id);
            }

            if (risk_level && risk_level !== 'all') {
                whereConditions.push('risk_level = ?');
                params.push(risk_level);
            }

            if (maintenance_status && maintenance_status !== 'all') {
                whereConditions.push('maintenance_status = ?');
                params.push(maintenance_status);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            const offset = (page - 1) * limit;

            const [equipment] = await db.execute(`
                SELECT 
                    serial_number_id,
                    serial_number,
                    product_name,
                    product_code,
                    equipment_type,
                    equipment_category,
                    current_status,
                    
                    -- Technical specs
                    firmware_version,
                    hardware_revision,
                    rated_voltage,
                    rated_current,
                    communication_protocol,
                    
                    -- Performance metrics
                    operating_hours_total,
                    power_on_cycles,
                    total_fault_count,
                    latest_performance_score,
                    last_performance_test_date,
                    
                    -- Maintenance info
                    next_maintenance_due,
                    maintenance_status,
                    
                    -- Warranty info
                    warranty_start_date,
                    warranty_end_date,
                    warranty_status,
                    
                    -- Health metrics
                    mean_time_between_failures,
                    health_score,
                    risk_level,
                    
                    location_name,
                    commissioning_date
                    
                FROM equipment_status_comprehensive
                ${whereClause}
                ORDER BY 
                    CASE risk_level
                        WHEN 'High Risk' THEN 1
                        WHEN 'Medium Risk' THEN 2
                        ELSE 3
                    END,
                    health_score ASC,
                    next_maintenance_due ASC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get summary statistics
            const [summary] = await db.execute(`
                SELECT 
                    COUNT(*) as total_equipment,
                    AVG(health_score) as avg_health_score,
                    SUM(operating_hours_total) as total_operating_hours,
                    COUNT(CASE WHEN risk_level = 'High Risk' THEN 1 END) as high_risk_count,
                    COUNT(CASE WHEN maintenance_status = 'Overdue' THEN 1 END) as overdue_maintenance,
                    COUNT(CASE WHEN warranty_status = 'Expiring Soon' THEN 1 END) as warranty_expiring
                FROM equipment_status_comprehensive
                ${whereClause}
            `, params);

            // Get equipment type breakdown
            const [typeBreakdown] = await db.execute(`
                SELECT 
                    equipment_type,
                    COUNT(*) as count,
                    AVG(health_score) as avg_health_score,
                    COUNT(CASE WHEN risk_level = 'High Risk' THEN 1 END) as high_risk_count
                FROM equipment_status_comprehensive
                ${whereClause}
                GROUP BY equipment_type
                ORDER BY count DESC
            `, params);

            res.json({
                success: true,
                data: {
                    equipment,
                    summary: summary[0],
                    typeBreakdown,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: summary[0].total_equipment
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching equipment status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch equipment status',
                error: error.message
            });
        }
    }

    // Get maintenance dashboard data
    async getMaintenanceDashboard(req, res) {
        try {
            const [dashboard] = await db.execute(`
                SELECT * FROM maintenance_dashboard_view
                ORDER BY 
                    CASE status
                        WHEN 'overdue' THEN 1
                        WHEN 'due_soon' THEN 2
                        WHEN 'high_risk' THEN 3
                        WHEN 'warranty_expiring' THEN 4
                    END
            `);

            // Get upcoming maintenance schedule
            const [upcomingMaintenance] = await db.execute(`
                SELECT 
                    esc.serial_number,
                    esc.product_name,
                    esc.equipment_type,
                    esc.location_name,
                    esc.next_maintenance_due,
                    esc.maintenance_status,
                    ems.maintenance_type,
                    ems.estimated_duration_hours,
                    ems.assigned_technician_id,
                    u.full_name as technician_name
                FROM equipment_status_comprehensive esc
                LEFT JOIN equipment_maintenance_schedules ems ON esc.serial_number_id = ems.serial_number_id AND ems.is_active = TRUE
                LEFT JOIN users u ON ems.assigned_technician_id = u.id
                WHERE esc.maintenance_status IN ('Overdue', 'Due Soon', 'Upcoming')
                ORDER BY esc.next_maintenance_due ASC
                LIMIT 20
            `);

            // Get recent faults
            const [recentFaults] = await db.execute(`
                SELECT 
                    efh.serial_number,
                    efh.fault_datetime,
                    efh.fault_category,
                    efh.fault_severity,
                    efh.fault_description,
                    efh.fault_resolved,
                    efh.downtime_minutes,
                    p.name as product_name,
                    l.name as location_name
                FROM equipment_fault_history efh
                LEFT JOIN inventory_serial_numbers isn ON efh.serial_number_id = isn.id
                LEFT JOIN products p ON isn.product_id = p.id
                LEFT JOIN locations l ON isn.commissioning_location_id = l.id
                WHERE efh.fault_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY efh.fault_datetime DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    dashboard,
                    upcomingMaintenance,
                    recentFaults
                }
            });

        } catch (error) {
            console.error('Error fetching maintenance dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch maintenance dashboard',
                error: error.message
            });
        }
    }

    // Record performance test
    async recordPerformanceTest(req, res) {
        try {
            const {
                serial_number_id,
                test_type,
                performance_score,
                response_time_ms,
                accuracy_percentage,
                precision_rating,
                ambient_temperature,
                humidity_percentage,
                supply_voltage,
                load_percentage,
                test_result,
                test_notes,
                recommendations
            } = req.body;

            const [result] = await db.execute(`
                INSERT INTO equipment_performance_history (
                    serial_number_id, serial_number, test_type,
                    performance_score, response_time_ms, accuracy_percentage, precision_rating,
                    ambient_temperature, humidity_percentage, supply_voltage, load_percentage,
                    test_result, test_notes, recommendations, test_performed_by
                ) VALUES (?, 
                    (SELECT serial_number FROM inventory_serial_numbers WHERE id = ?),
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `, [
                serial_number_id, serial_number_id, test_type,
                performance_score, response_time_ms, accuracy_percentage, precision_rating,
                ambient_temperature, humidity_percentage, supply_voltage, load_percentage,
                test_result, test_notes, recommendations, req.user?.id || 1
            ]);

            // Update the serial number's performance test result
            await db.execute(`
                UPDATE inventory_serial_numbers SET
                    last_performance_test_date = NOW(),
                    performance_test_result = ?,
                    technical_data_updated_at = NOW()
                WHERE id = ?
            `, [precision_rating, serial_number_id]);

            res.status(201).json({
                success: true,
                message: 'Performance test recorded successfully',
                data: { id: result.insertId }
            });

        } catch (error) {
            console.error('Error recording performance test:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record performance test',
                error: error.message
            });
        }
    }

    // Record equipment fault
    async recordEquipmentFault(req, res) {
        try {
            const {
                serial_number_id,
                fault_category,
                fault_severity,
                fault_code,
                fault_description,
                fault_detected_by,
                operating_hours_at_fault,
                load_at_fault_percentage,
                temperature_at_fault,
                voltage_at_fault,
                root_cause_analysis,
                probable_causes
            } = req.body;

            const [result] = await db.execute(`
                INSERT INTO equipment_fault_history (
                    serial_number_id, serial_number,
                    fault_category, fault_severity, fault_code, fault_description,
                    fault_detected_by, operating_hours_at_fault,
                    load_at_fault_percentage, temperature_at_fault, voltage_at_fault,
                    root_cause_analysis, probable_causes, reported_by
                ) VALUES (?, 
                    (SELECT serial_number FROM inventory_serial_numbers WHERE id = ?),
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `, [
                serial_number_id, serial_number_id,
                fault_category, fault_severity, fault_code, fault_description,
                fault_detected_by, operating_hours_at_fault,
                load_at_fault_percentage, temperature_at_fault, voltage_at_fault,
                root_cause_analysis, JSON.stringify(probable_causes), req.user?.id || 1
            ]);

            // Update fault count on serial number
            await db.execute(`
                UPDATE inventory_serial_numbers SET
                    total_fault_count = total_fault_count + 1,
                    last_fault_date = NOW(),
                    last_fault_code = ?,
                    technical_data_updated_at = NOW()
                WHERE id = ?
            `, [fault_code, serial_number_id]);

            res.status(201).json({
                success: true,
                message: 'Equipment fault recorded successfully',
                data: { id: result.insertId }
            });

        } catch (error) {
            console.error('Error recording equipment fault:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record equipment fault',
                error: error.message
            });
        }
    }

    // Resolve equipment fault
    async resolveEquipmentFault(req, res) {
        try {
            const { fault_id } = req.params;
            const {
                resolution_method,
                resolution_description,
                parts_replaced,
                downtime_minutes,
                repair_cost,
                production_impact_cost,
                preventive_actions
            } = req.body;

            const [result] = await db.execute(`
                UPDATE equipment_fault_history SET
                    fault_resolved = TRUE,
                    resolution_datetime = NOW(),
                    resolved_by = ?,
                    resolution_method = ?,
                    resolution_description = ?,
                    parts_replaced = ?,
                    downtime_minutes = ?,
                    repair_cost = ?,
                    production_impact_cost = ?,
                    preventive_actions = ?
                WHERE id = ?
            `, [
                req.user?.id || 1,
                resolution_method,
                resolution_description,
                JSON.stringify(parts_replaced),
                downtime_minutes,
                repair_cost,
                production_impact_cost,
                JSON.stringify(preventive_actions),
                fault_id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fault not found'
                });
            }

            res.json({
                success: true,
                message: 'Equipment fault resolved successfully'
            });

        } catch (error) {
            console.error('Error resolving equipment fault:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resolve equipment fault',
                error: error.message
            });
        }
    }

    // Update equipment operating hours
    async updateOperatingHours(req, res) {
        try {
            const { serial_number } = req.params;
            const { hours_to_add, power_cycles_to_add = 0 } = req.body;

            await db.execute(`CALL UpdateEquipmentOperatingHours(?, ?, ?)`, [
                serial_number,
                hours_to_add,
                power_cycles_to_add
            ]);

            res.json({
                success: true,
                message: 'Operating hours updated successfully'
            });

        } catch (error) {
            console.error('Error updating operating hours:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update operating hours',
                error: error.message
            });
        }
    }

    // Get equipment performance history
    async getPerformanceHistory(req, res) {
        try {
            const { serial_number_id } = req.params;
            const { limit = 20 } = req.query;

            const [history] = await db.execute(`
                SELECT 
                    test_date,
                    test_type,
                    performance_score,
                    response_time_ms,
                    accuracy_percentage,
                    precision_rating,
                    test_result,
                    test_notes,
                    recommendations,
                    ambient_temperature,
                    humidity_percentage,
                    supply_voltage,
                    degradation_factor,
                    estimated_remaining_life_hours
                FROM equipment_performance_history
                WHERE serial_number_id = ?
                ORDER BY test_date DESC
                LIMIT ?
            `, [serial_number_id, parseInt(limit)]);

            // Calculate performance trend
            const performanceScores = history
                .filter(h => h.performance_score != null)
                .map(h => h.performance_score);

            let trend = 'stable';
            if (performanceScores.length >= 3) {
                const recent = performanceScores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                const older = performanceScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
                
                if (recent > older + 5) trend = 'improving';
                else if (recent < older - 5) trend = 'declining';
            }

            res.json({
                success: true,
                data: {
                    history,
                    trend,
                    avgPerformanceScore: performanceScores.length > 0 ? 
                        performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length : null
                }
            });

        } catch (error) {
            console.error('Error fetching performance history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch performance history',
                error: error.message
            });
        }
    }

    // Get equipment fault history
    async getFaultHistory(req, res) {
        try {
            const { serial_number_id } = req.params;
            const { limit = 20 } = req.query;

            const [faultHistory] = await db.execute(`
                SELECT 
                    id,
                    fault_datetime,
                    fault_category,
                    fault_severity,
                    fault_code,
                    fault_description,
                    fault_resolved,
                    resolution_datetime,
                    resolution_method,
                    resolution_description,
                    downtime_minutes,
                    repair_cost,
                    production_impact_cost,
                    root_cause_analysis
                FROM equipment_fault_history
                WHERE serial_number_id = ?
                ORDER BY fault_datetime DESC
                LIMIT ?
            `, [serial_number_id, parseInt(limit)]);

            // Calculate fault statistics
            const totalFaults = faultHistory.length;
            const resolvedFaults = faultHistory.filter(f => f.fault_resolved).length;
            const totalDowntime = faultHistory.reduce((sum, f) => sum + (f.downtime_minutes || 0), 0);
            const totalRepairCost = faultHistory.reduce((sum, f) => sum + (f.repair_cost || 0), 0);

            // Fault category breakdown
            const categoryBreakdown = {};
            faultHistory.forEach(f => {
                categoryBreakdown[f.fault_category] = (categoryBreakdown[f.fault_category] || 0) + 1;
            });

            res.json({
                success: true,
                data: {
                    faultHistory,
                    statistics: {
                        totalFaults,
                        resolvedFaults,
                        resolutionRate: totalFaults > 0 ? (resolvedFaults / totalFaults * 100) : 0,
                        totalDowntimeMinutes: totalDowntime,
                        totalRepairCost,
                        categoryBreakdown
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching fault history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch fault history',
                error: error.message
            });
        }
    }

    // Create maintenance schedule
    async createMaintenanceSchedule(req, res) {
        try {
            const {
                serial_number_id,
                maintenance_type,
                schedule_name,
                description,
                frequency_type,
                frequency_value,
                runtime_trigger_hours,
                maintenance_checklist,
                required_tools,
                required_parts,
                estimated_duration_hours,
                assigned_technician_id,
                maintenance_priority
            } = req.body;

            // Calculate next maintenance due date
            let nextMaintenanceDue = new Date();
            switch (frequency_type) {
                case 'days':
                    nextMaintenanceDue.setDate(nextMaintenanceDue.getDate() + frequency_value);
                    break;
                case 'weeks':
                    nextMaintenanceDue.setDate(nextMaintenanceDue.getDate() + (frequency_value * 7));
                    break;
                case 'months':
                    nextMaintenanceDue.setMonth(nextMaintenanceDue.getMonth() + frequency_value);
                    break;
                case 'runtime_hours':
                    // Will be calculated based on current operating hours
                    nextMaintenanceDue = null;
                    break;
            }

            const [result] = await db.execute(`
                INSERT INTO equipment_maintenance_schedules (
                    serial_number_id, serial_number, equipment_type,
                    maintenance_type, schedule_name, description,
                    frequency_type, frequency_value, runtime_trigger_hours,
                    next_maintenance_due, maintenance_checklist,
                    required_tools, required_parts, estimated_duration_hours,
                    assigned_technician_id, maintenance_priority, created_by
                ) VALUES (?, 
                    (SELECT serial_number FROM inventory_serial_numbers WHERE id = ?),
                    (SELECT equipment_type FROM inventory_serial_numbers WHERE id = ?),
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `, [
                serial_number_id, serial_number_id, serial_number_id,
                maintenance_type, schedule_name, description,
                frequency_type, frequency_value, runtime_trigger_hours,
                nextMaintenanceDue, JSON.stringify(maintenance_checklist),
                JSON.stringify(required_tools), JSON.stringify(required_parts),
                estimated_duration_hours, assigned_technician_id, maintenance_priority,
                req.user?.id || 1
            ]);

            res.status(201).json({
                success: true,
                message: 'Maintenance schedule created successfully',
                data: { id: result.insertId }
            });

        } catch (error) {
            console.error('Error creating maintenance schedule:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create maintenance schedule',
                error: error.message
            });
        }
    }
}

module.exports = new IndustrialEquipmentController();