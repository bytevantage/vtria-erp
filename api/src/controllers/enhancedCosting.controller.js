const db = require('../config/database');

class EnhancedCostingController {
    // Get comprehensive batch costing information
    async getBatchCostingDetails(req, res) {
        try {
            const { batch_id } = req.params;
            
            const [batchDetails] = await db.execute(`
                SELECT * FROM enhanced_batch_costing_view 
                WHERE id = ?
            `, [batch_id]);
            
            if (batchDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }
            
            // Get cost breakdown
            const [costBreakdown] = await db.execute(`
                SELECT 
                    purchase_price,
                    freight_cost,
                    insurance_cost,
                    customs_duty,
                    handling_charges,
                    other_charges,
                    total_additional_costs,
                    additional_cost_per_unit,
                    landed_cost_per_unit,
                    freight_percentage,
                    duty_percentage,
                    cost_overhead_percentage
                FROM inventory_batches
                WHERE id = ?
            `, [batch_id]);
            
            res.json({
                success: true,
                data: {
                    batchInfo: batchDetails[0],
                    costBreakdown: costBreakdown[0]
                }
            });
            
        } catch (error) {
            console.error('Error fetching batch costing details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch batch costing details',
                error: error.message
            });
        }
    }
    
    // Get optimal allocation recommendations with enhanced costing
    async getOptimalAllocation(req, res) {
        try {
            const { product_id, location_id, quantity = 1, strategy = 'balanced' } = req.query;
            
            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }
            
            // Set max cost variable for scoring
            await db.execute(`
                SET @max_cost = (
                    SELECT MAX(landed_cost_per_unit) 
                    FROM inventory_batches 
                    WHERE product_id = ? AND status = 'active'
                )
            `, [product_id]);
            
            let whereClause = 'WHERE product_id = ?';
            const params = [product_id];
            
            if (location_id && location_id !== '0') {
                whereClause += ' AND location_id = ?';
                params.push(location_id);
            }
            
            // Adjust scoring weights based on strategy
            let costWeight = 0.4;
            let fifoWeight = 0.4;
            let expiryWeight = 0.2;
            
            switch (strategy) {
                case 'cost_optimization':
                    costWeight = 0.6;
                    fifoWeight = 0.2;
                    expiryWeight = 0.2;
                    break;
                case 'fifo_strict':
                    costWeight = 0.1;
                    fifoWeight = 0.7;
                    expiryWeight = 0.2;
                    break;
                case 'expiry_management':
                    costWeight = 0.2;
                    fifoWeight = 0.3;
                    expiryWeight = 0.5;
                    break;
            }
            
            const [allocations] = await db.execute(`
                SELECT 
                    batch_id,
                    product_id,
                    product_name,
                    location_id,
                    location_name,
                    available_quantity,
                    purchase_price,
                    landed_cost_per_unit,
                    total_inventory_value,
                    days_to_expiry,
                    
                    -- Custom weighted scoring
                    (
                        fifo_score * ${fifoWeight} +
                        cost_efficiency_score * ${costWeight} +
                        expiry_score * ${expiryWeight}
                    ) as weighted_allocation_score,
                    
                    -- Cost savings information
                    (@max_cost - landed_cost_per_unit) as cost_savings_per_unit,
                    ((@max_cost - landed_cost_per_unit) * LEAST(available_quantity, ?)) as potential_savings,
                    
                    -- Allocation recommendation
                    CASE 
                        WHEN available_quantity >= ? THEN ?
                        ELSE available_quantity
                    END as recommended_quantity,
                    
                    -- Risk assessment
                    CASE 
                        WHEN days_to_expiry IS NOT NULL AND days_to_expiry < 30 THEN 'HIGH_EXPIRY_RISK'
                        WHEN days_to_expiry IS NOT NULL AND days_to_expiry < 90 THEN 'MEDIUM_EXPIRY_RISK'
                        WHEN landed_cost_per_unit > (@max_cost * 0.9) THEN 'HIGH_COST'
                        ELSE 'LOW_RISK'
                    END as risk_level
                    
                FROM optimal_allocation_enhanced
                ${whereClause}
                AND available_quantity > 0
                ORDER BY weighted_allocation_score DESC, landed_cost_per_unit ASC
                LIMIT 10
            `, [...params, quantity, quantity, quantity]);
            
            // Calculate allocation plan
            let remainingQuantity = parseFloat(quantity);
            const allocationPlan = [];
            let totalCost = 0;
            let totalSavings = 0;
            
            for (const allocation of allocations) {
                if (remainingQuantity <= 0) break;
                
                const allocateQty = Math.min(remainingQuantity, allocation.available_quantity);
                const allocationCost = allocateQty * allocation.landed_cost_per_unit;
                const savings = allocateQty * (allocation.cost_savings_per_unit || 0);
                
                allocationPlan.push({
                    ...allocation,
                    allocated_quantity: allocateQty,
                    allocation_cost: allocationCost,
                    cost_savings: savings
                });
                
                remainingQuantity -= allocateQty;
                totalCost += allocationCost;
                totalSavings += savings;
            }
            
            res.json({
                success: true,
                data: {
                    strategy: strategy,
                    requestedQuantity: parseFloat(quantity),
                    allocatedQuantity: parseFloat(quantity) - remainingQuantity,
                    remainingQuantity: remainingQuantity,
                    totalCost: totalCost,
                    totalSavings: totalSavings,
                    averageCost: totalCost / (parseFloat(quantity) - remainingQuantity),
                    allocationPlan: allocationPlan,
                    availableOptions: allocations
                }
            });
            
        } catch (error) {
            console.error('Error getting optimal allocation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get optimal allocation',
                error: error.message
            });
        }
    }
    
    // Create or update purchase order costs
    async createPurchaseOrderCosts(req, res) {
        try {
            const {
                purchase_order_id,
                purchase_order_number,
                total_freight_cost = 0,
                total_insurance_cost = 0,
                total_customs_duty = 0,
                total_handling_charges = 0,
                total_other_charges = 0,
                allocation_method = 'by_value',
                total_po_value,
                total_po_weight = 0,
                total_po_quantity = 0,
                po_currency = 'INR',
                exchange_rate = 1.0000,
                exchange_rate_date
            } = req.body;
            
            const [result] = await db.execute(`
                INSERT INTO purchase_order_costs (
                    purchase_order_id, purchase_order_number,
                    total_freight_cost, total_insurance_cost, total_customs_duty,
                    total_handling_charges, total_other_charges,
                    allocation_method, total_po_value, total_po_weight, total_po_quantity,
                    po_currency, exchange_rate, exchange_rate_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_freight_cost = VALUES(total_freight_cost),
                    total_insurance_cost = VALUES(total_insurance_cost),
                    total_customs_duty = VALUES(total_customs_duty),
                    total_handling_charges = VALUES(total_handling_charges),
                    total_other_charges = VALUES(total_other_charges),
                    allocation_method = VALUES(allocation_method),
                    total_po_value = VALUES(total_po_value),
                    total_po_weight = VALUES(total_po_weight),
                    total_po_quantity = VALUES(total_po_quantity),
                    po_currency = VALUES(po_currency),
                    exchange_rate = VALUES(exchange_rate),
                    exchange_rate_date = VALUES(exchange_rate_date),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                purchase_order_id, purchase_order_number,
                total_freight_cost, total_insurance_cost, total_customs_duty,
                total_handling_charges, total_other_charges,
                allocation_method, total_po_value, total_po_weight, total_po_quantity,
                po_currency, exchange_rate, exchange_rate_date
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Purchase order costs created/updated successfully',
                data: { id: result.insertId }
            });
            
        } catch (error) {
            console.error('Error creating purchase order costs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create purchase order costs',
                error: error.message
            });
        }
    }
    
    // Allocate purchase order costs to batches
    async allocatePurchaseOrderCosts(req, res) {
        try {
            const { purchase_order_id } = req.params;
            const { allocation_method = 'by_value' } = req.body;
            
            // Call stored procedure for cost allocation
            await db.execute(`CALL AllocatePurchaseOrderCosts(?, ?)`, [
                purchase_order_id,
                allocation_method
            ]);
            
            // Get updated batch information
            const [updatedBatches] = await db.execute(`
                SELECT 
                    id, batch_number, product_id,
                    purchase_price, landed_cost_per_unit,
                    freight_cost, insurance_cost, customs_duty,
                    cost_allocation_status, cost_allocated_date
                FROM inventory_batches
                WHERE purchase_order_id = ?
                ORDER BY id
            `, [purchase_order_id]);
            
            res.json({
                success: true,
                message: 'Costs allocated successfully',
                data: {
                    allocatedBatches: updatedBatches
                }
            });
            
        } catch (error) {
            console.error('Error allocating purchase order costs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to allocate purchase order costs',
                error: error.message
            });
        }
    }
    
    // Get cost analysis report
    async getCostAnalysisReport(req, res) {
        try {
            const { 
                product_id, 
                location_id, 
                date_from, 
                date_to,
                group_by = 'product' 
            } = req.query;
            
            let whereConditions = ['ib.status = "active"'];
            const params = [];
            
            if (product_id && product_id !== '0') {
                whereConditions.push('ib.product_id = ?');
                params.push(product_id);
            }
            
            if (location_id && location_id !== '0') {
                whereConditions.push('ib.location_id = ?');
                params.push(location_id);
            }
            
            if (date_from) {
                whereConditions.push('ib.purchase_date >= ?');
                params.push(date_from);
            }
            
            if (date_to) {
                whereConditions.push('ib.purchase_date <= ?');
                params.push(date_to);
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            let groupByClause = '';
            let selectClause = '';
            
            switch (group_by) {
                case 'product':
                    groupByClause = 'GROUP BY ib.product_id, p.name';
                    selectClause = 'ib.product_id, p.name as group_name';
                    break;
                case 'location':
                    groupByClause = 'GROUP BY ib.location_id, l.name';
                    selectClause = 'ib.location_id as id, l.name as group_name';
                    break;
                case 'supplier':
                    groupByClause = 'GROUP BY ib.supplier_id, s.company_name';
                    selectClause = 'ib.supplier_id as id, s.company_name as group_name';
                    break;
                case 'month':
                    groupByClause = 'GROUP BY YEAR(ib.purchase_date), MONTH(ib.purchase_date)';
                    selectClause = 'CONCAT(YEAR(ib.purchase_date), "-", LPAD(MONTH(ib.purchase_date), 2, "0")) as group_name';
                    break;
                default:
                    groupByClause = 'GROUP BY ib.product_id, p.name';
                    selectClause = 'ib.product_id, p.name as group_name';
            }
            
            const [costAnalysis] = await db.execute(`
                SELECT 
                    ${selectClause},
                    
                    -- Quantity metrics
                    COUNT(DISTINCT ib.id) as batch_count,
                    SUM(ib.received_quantity) as total_received_quantity,
                    SUM(ib.available_quantity) as total_available_quantity,
                    
                    -- Basic cost metrics
                    AVG(ib.purchase_price) as avg_purchase_price,
                    MIN(ib.purchase_price) as min_purchase_price,
                    MAX(ib.purchase_price) as max_purchase_price,
                    
                    -- Landed cost metrics
                    AVG(ib.landed_cost_per_unit) as avg_landed_cost,
                    MIN(ib.landed_cost_per_unit) as min_landed_cost,
                    MAX(ib.landed_cost_per_unit) as max_landed_cost,
                    
                    -- Additional cost components
                    SUM(ib.freight_cost) as total_freight_cost,
                    SUM(ib.insurance_cost) as total_insurance_cost,
                    SUM(ib.customs_duty) as total_customs_duty,
                    SUM(ib.handling_charges) as total_handling_charges,
                    SUM(ib.other_charges) as total_other_charges,
                    SUM(ib.total_additional_costs) as total_additional_costs,
                    
                    -- Cost percentages
                    AVG(ib.freight_percentage) as avg_freight_percentage,
                    AVG(ib.duty_percentage) as avg_duty_percentage,
                    AVG(ib.cost_overhead_percentage) as avg_overhead_percentage,
                    
                    -- Inventory values
                    SUM(ib.available_quantity * ib.purchase_price) as basic_inventory_value,
                    SUM(ib.available_quantity * ib.landed_cost_per_unit) as total_inventory_value,
                    SUM(ib.available_quantity * (ib.landed_cost_per_unit - ib.purchase_price)) as total_cost_overhead,
                    
                    -- Cost efficiency
                    (SUM(ib.available_quantity * (ib.landed_cost_per_unit - ib.purchase_price)) / 
                     SUM(ib.available_quantity * ib.purchase_price) * 100) as overhead_percentage
                    
                FROM inventory_batches ib
                LEFT JOIN products p ON ib.product_id = p.id
                LEFT JOIN locations l ON ib.location_id = l.id
                LEFT JOIN suppliers s ON ib.supplier_id = s.id
                WHERE ${whereClause}
                ${groupByClause}
                ORDER BY total_inventory_value DESC
            `, params);
            
            // Get summary statistics
            const [summary] = await db.execute(`
                SELECT 
                    COUNT(DISTINCT ib.id) as total_batches,
                    COUNT(DISTINCT ib.product_id) as unique_products,
                    COUNT(DISTINCT ib.location_id) as unique_locations,
                    COUNT(DISTINCT ib.supplier_id) as unique_suppliers,
                    SUM(ib.available_quantity) as total_available_quantity,
                    SUM(ib.available_quantity * ib.landed_cost_per_unit) as total_inventory_value,
                    AVG(ib.landed_cost_per_unit) as avg_landed_cost,
                    AVG(ib.cost_overhead_percentage) as avg_cost_overhead
                FROM inventory_batches ib
                WHERE ${whereClause}
            `, params);
            
            res.json({
                success: true,
                data: {
                    summary: summary[0],
                    analysis: costAnalysis,
                    groupBy: group_by,
                    filters: {
                        product_id,
                        location_id,
                        date_from,
                        date_to
                    }
                }
            });
            
        } catch (error) {
            console.error('Error generating cost analysis report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate cost analysis report',
                error: error.message
            });
        }
    }
}

module.exports = new EnhancedCostingController();