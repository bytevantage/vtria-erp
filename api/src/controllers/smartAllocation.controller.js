const db = require('../config/database');

class SmartAllocationController {
    // Execute smart allocation based on context
    async executeAllocation(req, res) {
        try {
            const {
                allocation_reference,
                allocation_type,
                product_id,
                location_id,
                requested_quantity,
                customer_tier = 'standard',
                project_priority = 'normal',
                order_value,
                margin_requirement,
                dry_run = false // If true, don't actually reserve inventory
            } = req.body;

            if (!allocation_reference || !allocation_type || !product_id || !location_id || !requested_quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters for allocation'
                });
            }

            // For dry run, get allocation preview without executing
            if (dry_run) {
                const allocationPreview = await this.getAllocationPreview(
                    allocation_type, product_id, location_id, requested_quantity, 
                    customer_tier, project_priority
                );
                
                return res.json({
                    success: true,
                    data: allocationPreview,
                    dry_run: true
                });
            }

            // Execute the allocation
            const [result] = await db.execute(`
                CALL ExecuteSmartAllocation(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                allocation_reference,
                allocation_type, 
                product_id,
                location_id,
                requested_quantity,
                customer_tier,
                project_priority,
                order_value || null,
                margin_requirement || null,
                req.user?.id || 1
            ]);

            if (result.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Allocation failed - no suitable inventory found'
                });
            }

            const allocationResult = result[0];
            
            // Get detailed batch breakdown
            const [batchDetails] = await db.execute(`
                SELECT 
                    abd.batch_id,
                    abd.allocated_quantity,
                    abd.batch_cost_per_unit,
                    abd.allocation_score,
                    abd.sequence_order,
                    ib.batch_number,
                    ib.purchase_date,
                    ib.expiry_date,
                    ib.supplier_id,
                    s.company_name as supplier_name
                FROM allocation_batch_details abd
                JOIN inventory_batches ib ON abd.batch_id = ib.id
                LEFT JOIN suppliers s ON ib.supplier_id = s.id
                WHERE abd.allocation_execution_id = ?
                ORDER BY abd.sequence_order
            `, [allocationResult.allocation_id]);

            res.status(201).json({
                success: true,
                message: 'Smart allocation executed successfully',
                data: {
                    allocation_id: allocationResult.allocation_id,
                    allocated_quantity: allocationResult.allocated_quantity,
                    average_cost: allocationResult.average_cost,
                    total_value: allocationResult.total_value,
                    strategy_used: allocationResult.strategy_used,
                    fulfillment_percentage: allocationResult.fulfillment_percentage,
                    batch_details: batchDetails,
                    business_context: {
                        allocation_type,
                        customer_tier,
                        project_priority,
                        order_value,
                        margin_requirement
                    }
                }
            });

        } catch (error) {
            console.error('Error executing smart allocation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to execute smart allocation',
                error: error.message
            });
        }
    }

    // Get allocation preview without executing
    async getAllocationPreview(allocation_type, product_id, location_id, requested_quantity, customer_tier = 'standard', project_priority = 'normal') {
        try {
            // Get the scoring based on allocation type
            const scoreColumn = allocation_type === 'estimation' ? 'estimation_score' :
                              allocation_type === 'manufacturing' ? 'manufacturing_score' : 
                              'sales_score';

            const [batches] = await db.execute(`
                SELECT 
                    batch_id,
                    product_name,
                    location_name,
                    available_quantity,
                    landed_cost_per_unit,
                    purchase_date,
                    expiry_date,
                    inventory_age_days,
                    warranty_days_remaining,
                    days_to_expiry,
                    cost_position_ratio,
                    batch_performance_score,
                    ${scoreColumn} as allocation_score
                FROM smart_allocation_view
                WHERE product_id = ? AND location_id = ?
                AND available_quantity > 0
                ORDER BY ${scoreColumn} DESC
                LIMIT 10
            `, [product_id, location_id]);

            // Calculate allocation plan
            let remainingQuantity = parseFloat(requested_quantity);
            const allocationPlan = [];
            let totalCost = 0;
            let batchesUsed = 0;

            for (const batch of batches) {
                if (remainingQuantity <= 0) break;

                const allocateQty = Math.min(remainingQuantity, batch.available_quantity);
                const cost = allocateQty * batch.landed_cost_per_unit;

                allocationPlan.push({
                    ...batch,
                    allocated_quantity: allocateQty,
                    allocation_cost: cost,
                    sequence_order: batchesUsed + 1
                });

                remainingQuantity -= allocateQty;
                totalCost += cost;
                batchesUsed++;
            }

            const allocatedQuantity = parseFloat(requested_quantity) - remainingQuantity;
            
            return {
                allocation_type,
                requested_quantity: parseFloat(requested_quantity),
                allocated_quantity: allocatedQuantity,
                remaining_quantity: remainingQuantity,
                fulfillment_percentage: (allocatedQuantity / parseFloat(requested_quantity)) * 100,
                average_cost: allocatedQuantity > 0 ? totalCost / allocatedQuantity : 0,
                total_cost: totalCost,
                batches_used: batchesUsed,
                allocation_plan: allocationPlan,
                business_context: {
                    customer_tier,
                    project_priority,
                    optimization_focus: this.getOptimizationFocus(allocation_type)
                }
            };

        } catch (error) {
            console.error('Error getting allocation preview:', error);
            throw error;
        }
    }

    // Helper method to describe optimization focus
    getOptimizationFocus(allocation_type) {
        switch (allocation_type) {
            case 'estimation':
                return 'Margin Protection - Using higher cost items to protect profit margins';
            case 'manufacturing':
                return 'Cost Optimization - Using lowest cost items to maximize profitability';
            case 'sales':
                return 'Balanced Approach - Considering cost, age, warranty, and performance';
            default:
                return 'Standard allocation based on FIFO principles';
        }
    }

    // Get allocation preview for specific context
    async getContextualAllocationPreview(req, res) {
        try {
            const {
                allocation_type,
                product_id,
                location_id,
                requested_quantity,
                customer_tier = 'standard',
                project_priority = 'normal'
            } = req.query;

            if (!allocation_type || !product_id || !location_id || !requested_quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters'
                });
            }

            const preview = await this.getAllocationPreview(
                allocation_type, product_id, location_id, parseFloat(requested_quantity),
                customer_tier, project_priority
            );

            // Add comparison with other allocation types for analysis
            const comparisons = {};
            const allocationTypes = ['estimation', 'manufacturing', 'sales'];
            
            for (const type of allocationTypes) {
                if (type !== allocation_type) {
                    const comparison = await this.getAllocationPreview(
                        type, product_id, location_id, parseFloat(requested_quantity),
                        customer_tier, project_priority
                    );
                    comparisons[type] = {
                        average_cost: comparison.average_cost,
                        total_cost: comparison.total_cost,
                        batches_used: comparison.batches_used,
                        cost_difference: comparison.total_cost - preview.total_cost,
                        cost_savings_percentage: preview.total_cost > 0 ? 
                            ((comparison.total_cost - preview.total_cost) / preview.total_cost * 100) : 0
                    };
                }
            }

            res.json({
                success: true,
                data: {
                    preview,
                    comparisons,
                    recommendation: this.generateAllocationRecommendation(preview, comparisons, allocation_type)
                }
            });

        } catch (error) {
            console.error('Error getting contextual allocation preview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get allocation preview',
                error: error.message
            });
        }
    }

    // Generate allocation recommendation
    generateAllocationRecommendation(preview, comparisons, requestedType) {
        let recommendation = {
            recommended_strategy: requestedType,
            confidence_score: 75,
            reasoning: [],
            warnings: [],
            alternatives: []
        };

        // Analyze cost implications
        const avgCost = preview.average_cost;
        const fulfillmentRate = preview.fulfillment_percentage;

        // Check fulfillment rate
        if (fulfillmentRate < 100) {
            recommendation.warnings.push(
                `Only ${fulfillmentRate.toFixed(1)}% fulfillment possible with current inventory`
            );
            recommendation.confidence_score -= 20;
        }

        // Analyze cost position
        if (requestedType === 'estimation') {
            recommendation.reasoning.push(
                'Using higher cost items for estimation protects profit margins'
            );
            
            if (comparisons.manufacturing) {
                const savings = comparisons.manufacturing.cost_difference;
                if (savings < 0) {
                    recommendation.reasoning.push(
                        `Estimation cost ₹${Math.abs(savings).toFixed(2)} higher than manufacturing cost - good margin protection`
                    );
                } else {
                    recommendation.warnings.push(
                        'Estimation cost lower than manufacturing cost - may risk margins'
                    );
                }
            }
        } else if (requestedType === 'manufacturing') {
            recommendation.reasoning.push(
                'Using lowest cost items for manufacturing maximizes profitability'
            );
            
            if (comparisons.estimation) {
                const savings = Math.abs(comparisons.estimation.cost_difference);
                recommendation.reasoning.push(
                    `Manufacturing saves ₹${savings.toFixed(2)} compared to estimation pricing`
                );
            }
        }

        // Check batch efficiency
        if (preview.batches_used > 5) {
            recommendation.warnings.push(
                `Requires ${preview.batches_used} different batches - may complicate logistics`
            );
        }

        // Add alternatives if significant cost differences exist
        Object.entries(comparisons).forEach(([type, comparison]) => {
            if (Math.abs(comparison.cost_difference) > (preview.total_cost * 0.1)) {
                recommendation.alternatives.push({
                    strategy: type,
                    cost_difference: comparison.cost_difference,
                    description: comparison.cost_difference < 0 ? 
                        `${type} strategy would save ₹${Math.abs(comparison.cost_difference).toFixed(2)}` :
                        `${type} strategy would cost ₹${comparison.cost_difference.toFixed(2)} more`
                });
            }
        });

        return recommendation;
    }

    // Get allocation strategies
    async getAllocationStrategies(req, res) {
        try {
            const { strategy_type, is_active = true } = req.query;

            let whereConditions = [];
            const params = [];

            if (strategy_type) {
                whereConditions.push('strategy_type = ?');
                params.push(strategy_type);
            }

            if (is_active !== undefined) {
                whereConditions.push('is_active = ?');
                params.push(is_active === 'true' || is_active === true);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            const [strategies] = await db.execute(`
                SELECT 
                    id, strategy_name, strategy_code, strategy_type, description,
                    primary_method, consider_warranty_expiry, consider_cost_optimization,
                    consider_margin_protection, cost_weight, age_weight, warranty_weight,
                    performance_weight, expiry_weight, prevent_negative_margin,
                    minimum_margin_percentage, is_default, is_active
                FROM allocation_strategies
                ${whereClause}
                ORDER BY strategy_type, is_default DESC, strategy_name
            `, params);

            res.json({
                success: true,
                data: strategies
            });

        } catch (error) {
            console.error('Error fetching allocation strategies:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch allocation strategies',
                error: error.message
            });
        }
    }

    // Get allocation history and analytics
    async getAllocationAnalytics(req, res) {
        try {
            const {
                allocation_type,
                product_id,
                location_id,
                customer_tier,
                date_from,
                date_to,
                limit = 50
            } = req.query;

            let whereConditions = [];
            const params = [];

            if (allocation_type) {
                whereConditions.push('allocation_type = ?');
                params.push(allocation_type);
            }

            if (product_id) {
                whereConditions.push('product_id = ?');
                params.push(product_id);
            }

            if (location_id) {
                whereConditions.push('location_id = ?');
                params.push(location_id);
            }

            if (customer_tier) {
                whereConditions.push('customer_tier = ?');
                params.push(customer_tier);
            }

            if (date_from) {
                whereConditions.push('allocated_at >= ?');
                params.push(date_from);
            }

            if (date_to) {
                whereConditions.push('allocated_at <= ?');
                params.push(date_to);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get allocation history
            const [allocations] = await db.execute(`
                SELECT 
                    ae.id,
                    ae.allocation_reference,
                    ae.allocation_type,
                    p.name as product_name,
                    l.name as location_name,
                    ae.requested_quantity,
                    ae.allocated_quantity,
                    ae.average_allocated_cost,
                    ae.total_allocated_value,
                    ae.margin_achieved_percentage,
                    ae.allocation_efficiency_score,
                    ae.strategy_name,
                    ae.customer_tier,
                    ae.project_priority,
                    ae.allocated_at,
                    COUNT(abd.id) as batches_used
                FROM allocation_executions ae
                LEFT JOIN products p ON ae.product_id = p.id
                LEFT JOIN locations l ON ae.location_id = l.id
                LEFT JOIN allocation_batch_details abd ON ae.id = abd.allocation_execution_id
                ${whereClause}
                GROUP BY ae.id
                ORDER BY ae.allocated_at DESC
                LIMIT ?
            `, [...params, parseInt(limit)]);

            // Get summary analytics
            const [summary] = await db.execute(`
                SELECT 
                    COUNT(*) as total_allocations,
                    SUM(requested_quantity) as total_requested,
                    SUM(allocated_quantity) as total_allocated,
                    AVG(allocation_efficiency_score) as avg_fulfillment_rate,
                    SUM(total_allocated_value) as total_value_allocated,
                    AVG(average_allocated_cost) as avg_allocation_cost,
                    COUNT(DISTINCT product_id) as unique_products,
                    COUNT(DISTINCT location_id) as unique_locations
                FROM allocation_executions ae
                ${whereClause}
            `, params);

            // Get allocation type breakdown
            const [typeBreakdown] = await db.execute(`
                SELECT 
                    allocation_type,
                    COUNT(*) as allocation_count,
                    AVG(allocation_efficiency_score) as avg_efficiency,
                    AVG(average_allocated_cost) as avg_cost,
                    SUM(total_allocated_value) as total_value
                FROM allocation_executions ae
                ${whereClause}
                GROUP BY allocation_type
                ORDER BY allocation_count DESC
            `, params);

            // Get strategy performance
            const [strategyPerformance] = await db.execute(`
                SELECT 
                    strategy_name,
                    COUNT(*) as usage_count,
                    AVG(allocation_efficiency_score) as avg_efficiency,
                    AVG(average_allocated_cost) as avg_cost,
                    AVG(margin_achieved_percentage) as avg_margin
                FROM allocation_executions ae
                ${whereClause}
                AND strategy_name IS NOT NULL
                GROUP BY strategy_name
                ORDER BY usage_count DESC
            `, params);

            res.json({
                success: true,
                data: {
                    allocations,
                    summary: summary[0],
                    typeBreakdown,
                    strategyPerformance,
                    filters: {
                        allocation_type,
                        product_id,
                        location_id,
                        customer_tier,
                        date_from,
                        date_to
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching allocation analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch allocation analytics',
                error: error.message
            });
        }
    }

    // Create or update allocation strategy
    async createAllocationStrategy(req, res) {
        try {
            const {
                strategy_name,
                strategy_code,
                strategy_type,
                description,
                primary_method,
                consider_warranty_expiry = true,
                consider_cost_optimization = true,
                consider_margin_protection = false,
                cost_weight,
                age_weight,
                warranty_weight,
                performance_weight,
                expiry_weight,
                prevent_negative_margin = false,
                minimum_margin_percentage = 0
            } = req.body;

            // Validate weights sum to 100
            const totalWeight = (cost_weight || 0) + (age_weight || 0) + (warranty_weight || 0) + 
                              (performance_weight || 0) + (expiry_weight || 0);
            
            if (Math.abs(totalWeight - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: 'Allocation weights must sum to 100'
                });
            }

            const [result] = await db.execute(`
                INSERT INTO allocation_strategies (
                    strategy_name, strategy_code, strategy_type, description,
                    primary_method, consider_warranty_expiry, consider_cost_optimization,
                    consider_margin_protection, cost_weight, age_weight, warranty_weight,
                    performance_weight, expiry_weight, prevent_negative_margin,
                    minimum_margin_percentage, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                strategy_name, strategy_code, strategy_type, description,
                primary_method, consider_warranty_expiry, consider_cost_optimization,
                consider_margin_protection, cost_weight, age_weight, warranty_weight,
                performance_weight, expiry_weight, prevent_negative_margin,
                minimum_margin_percentage, req.user?.id || 1
            ]);

            res.status(201).json({
                success: true,
                message: 'Allocation strategy created successfully',
                data: { id: result.insertId }
            });

        } catch (error) {
            console.error('Error creating allocation strategy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create allocation strategy',
                error: error.message
            });
        }
    }
}

module.exports = new SmartAllocationController();