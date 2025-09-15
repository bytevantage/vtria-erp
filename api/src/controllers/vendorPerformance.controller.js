const db = require('../config/database');

class VendorPerformanceController {
    // Get vendor comparison for procurement decisions
    async getVendorComparison(req, res) {
        try {
            const { product_id, sort_by = 'composite_score', order = 'desc', limit = 10 } = req.query;
            
            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID is required'
                });
            }
            
            const validSortColumns = ['composite_score', 'quoted_price', 'total_landed_cost', 'overall_rating', 'delivery_lead_time_days'];
            const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'composite_score';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            
            const [vendors] = await db.execute(`
                SELECT 
                    supplier_id,
                    company_name,
                    overall_rating,
                    quality_rating,
                    delivery_rating,
                    price_competitiveness,
                    partnership_level,
                    
                    -- Pricing information
                    quoted_price,
                    total_landed_cost,
                    delivery_lead_time_days,
                    minimum_order_quantity,
                    quote_valid_until,
                    market_price_position,
                    
                    -- Performance metrics
                    on_time_delivery_percentage,
                    defect_rate_percentage,
                    average_delivery_days,
                    average_discount_percentage,
                    
                    -- Rankings
                    cost_rank,
                    quality_rank,
                    speed_rank,
                    composite_score,
                    
                    -- Risk assessment
                    supply_chain_risk_level,
                    financial_stability_rating,
                    quote_validity_status,
                    
                    -- Cost savings calculation
                    (SELECT MIN(total_landed_cost) FROM vendor_comparison_view WHERE product_id = ?) as min_cost,
                    (total_landed_cost - (SELECT MIN(total_landed_cost) FROM vendor_comparison_view WHERE product_id = ?)) as cost_difference,
                    
                    -- Market position analysis
                    (SELECT AVG(total_landed_cost) FROM vendor_comparison_view WHERE product_id = ?) as market_avg_cost
                    
                FROM vendor_comparison_view
                WHERE product_id = ?
                ORDER BY ${sortColumn} ${sortOrder}
                LIMIT ?
            `, [product_id, product_id, product_id, product_id, parseInt(limit)]);
            
            // Get product information
            const [productInfo] = await db.execute(`
                SELECT id, name, product_code, category_id, last_purchase_price
                FROM products WHERE id = ?
            `, [product_id]);
            
            if (productInfo.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            // Calculate recommendation scores
            const vendorsWithRecommendations = vendors.map((vendor, index) => ({
                ...vendor,
                recommendation_score: this.calculateRecommendationScore(vendor, index),
                cost_savings_potential: vendor.cost_difference < 0 ? Math.abs(vendor.cost_difference) : 0,
                market_position_analysis: {
                    vs_market_avg: vendor.total_landed_cost - vendor.market_avg_cost,
                    is_below_market: vendor.total_landed_cost < vendor.market_avg_cost,
                    market_position_percentage: ((vendor.total_landed_cost / vendor.market_avg_cost) - 1) * 100
                }
            }));
            
            res.json({
                success: true,
                data: {
                    product: productInfo[0],
                    vendors: vendorsWithRecommendations,
                    summary: {
                        total_vendors: vendors.length,
                        price_range: {
                            min: Math.min(...vendors.map(v => v.total_landed_cost)),
                            max: Math.max(...vendors.map(v => v.total_landed_cost)),
                            avg: vendors.reduce((sum, v) => sum + v.total_landed_cost, 0) / vendors.length
                        },
                        best_value: vendorsWithRecommendations[0],
                        lowest_cost: vendorsWithRecommendations.find(v => v.cost_rank === 1),
                        highest_quality: vendorsWithRecommendations.find(v => v.quality_rank === 1),
                        fastest_delivery: vendorsWithRecommendations.find(v => v.speed_rank === 1)
                    }
                }
            });
            
        } catch (error) {
            console.error('Error fetching vendor comparison:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vendor comparison',
                error: error.message
            });
        }
    }
    
    // Helper method to calculate recommendation score
    calculateRecommendationScore(vendor, rank) {
        let score = 0;
        
        // Quality weight (30%)
        score += vendor.overall_rating * 0.3 * 20;
        
        // Cost competitiveness (25%)
        const costScore = vendor.cost_rank <= 3 ? (4 - vendor.cost_rank) * 25 : 0;
        score += costScore * 0.25;
        
        // Delivery performance (25%)
        score += (vendor.on_time_delivery_percentage / 100) * 25 * 0.25;
        
        // Speed (10%)
        const speedScore = vendor.speed_rank <= 3 ? (4 - vendor.speed_rank) * 25 : 0;
        score += speedScore * 0.10;
        
        // Risk factor (10%)
        const riskMultiplier = vendor.supply_chain_risk_level === 'low' ? 1.0 : 
                              vendor.supply_chain_risk_level === 'medium' ? 0.8 : 0.6;
        score *= riskMultiplier;
        
        return Math.round(score);
    }
    
    // Get supplier performance dashboard
    async getSupplierDashboard(req, res) {
        try {
            const { 
                performance_category, 
                partnership_level, 
                risk_level,
                page = 1, 
                limit = 20 
            } = req.query;
            
            let whereConditions = [];
            const params = [];
            
            if (performance_category && performance_category !== 'all') {
                whereConditions.push(`
                    CASE 
                        WHEN overall_rating >= 4.5 THEN 'EXCELLENT'
                        WHEN overall_rating >= 4.0 THEN 'GOOD'
                        WHEN overall_rating >= 3.0 THEN 'ACCEPTABLE'
                        ELSE 'NEEDS_IMPROVEMENT'
                    END = ?
                `);
                params.push(performance_category);
            }
            
            if (partnership_level && partnership_level !== 'all') {
                whereConditions.push('partnership_level = ?');
                params.push(partnership_level);
            }
            
            if (risk_level && risk_level !== 'all') {
                whereConditions.push('supply_chain_risk_level = ?');
                params.push(risk_level);
            }
            
            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';
            
            const offset = (page - 1) * limit;
            
            const [suppliers] = await db.execute(`
                SELECT * FROM supplier_performance_dashboard
                ${whereClause}
                ORDER BY overall_rating DESC, total_purchases_ytd DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);
            
            // Get summary statistics
            const [summary] = await db.execute(`
                SELECT 
                    COUNT(*) as total_suppliers,
                    AVG(overall_rating) as avg_rating,
                    COUNT(CASE WHEN performance_category = 'EXCELLENT' THEN 1 END) as excellent_suppliers,
                    COUNT(CASE WHEN performance_category = 'NEEDS_IMPROVEMENT' THEN 1 END) as improvement_needed,
                    COUNT(CASE WHEN review_status = 'OVERDUE' THEN 1 END) as overdue_reviews,
                    COUNT(CASE WHEN supply_chain_risk_level = 'high' THEN 1 END) as high_risk_suppliers,
                    SUM(total_purchases_ytd) as total_ytd_purchases
                FROM supplier_performance_dashboard
                ${whereClause}
            `, params);
            
            // Get partnership level breakdown
            const [partnershipBreakdown] = await db.execute(`
                SELECT 
                    partnership_level,
                    COUNT(*) as supplier_count,
                    AVG(overall_rating) as avg_rating,
                    SUM(total_purchases_ytd) as total_purchases
                FROM supplier_performance_dashboard
                ${whereClause}
                GROUP BY partnership_level
                ORDER BY 
                    CASE partnership_level
                        WHEN 'exclusive' THEN 1
                        WHEN 'strategic' THEN 2
                        WHEN 'preferred' THEN 3
                        WHEN 'transactional' THEN 4
                    END
            `, params);
            
            res.json({
                success: true,
                data: {
                    suppliers,
                    summary: summary[0],
                    partnershipBreakdown,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: summary[0].total_suppliers
                    }
                }
            });
            
        } catch (error) {
            console.error('Error fetching supplier dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch supplier dashboard',
                error: error.message
            });
        }
    }
    
    // Record vendor price quote
    async recordPriceQuote(req, res) {
        try {
            const {
                product_id,
                supplier_id,
                quoted_price,
                currency = 'INR',
                minimum_order_quantity = 1,
                maximum_order_quantity,
                delivery_lead_time_days,
                payment_terms,
                delivery_terms,
                validity_period_days = 30,
                shipping_cost = 0,
                handling_charges = 0,
                packaging_cost = 0,
                insurance_cost = 0,
                customs_charges = 0,
                market_price_position = 'at_market',
                price_change_reason,
                negotiated_discount_percentage = 0,
                quote_reference,
                notes
            } = req.body;
            
            if (!product_id || !supplier_id || !quoted_price) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID, Supplier ID, and Quoted Price are required'
                });
            }
            
            const quote_valid_until = new Date();
            quote_valid_until.setDate(quote_valid_until.getDate() + validity_period_days);
            
            // Determine price trend by comparing with previous quotes
            const [prevQuotes] = await db.execute(`
                SELECT quoted_price, quote_received_date
                FROM vendor_price_history
                WHERE product_id = ? AND supplier_id = ?
                ORDER BY quote_received_date DESC
                LIMIT 3
            `, [product_id, supplier_id]);
            
            let price_trend_indicator = 'stable';
            if (prevQuotes.length > 0) {
                const prevPrice = prevQuotes[0].quoted_price;
                const priceDiff = ((quoted_price - prevPrice) / prevPrice) * 100;
                
                if (priceDiff > 5) price_trend_indicator = 'rising';
                else if (priceDiff < -5) price_trend_indicator = 'falling';
            }
            
            const [result] = await db.execute(`
                INSERT INTO vendor_price_history (
                    product_id, supplier_id, quoted_price, currency, price_per_unit,
                    minimum_order_quantity, maximum_order_quantity, delivery_lead_time_days,
                    payment_terms, delivery_terms, validity_period_days, quote_valid_until,
                    shipping_cost, handling_charges, packaging_cost, insurance_cost, customs_charges,
                    market_price_position, price_change_reason, negotiated_discount_percentage,
                    quote_reference, price_trend_indicator, requested_by, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                product_id, supplier_id, quoted_price, currency, quoted_price,
                minimum_order_quantity, maximum_order_quantity, delivery_lead_time_days,
                payment_terms, delivery_terms, validity_period_days, quote_valid_until,
                shipping_cost, handling_charges, packaging_cost, insurance_cost, customs_charges,
                market_price_position, price_change_reason, negotiated_discount_percentage,
                quote_reference, price_trend_indicator, req.user?.id || 1, notes
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Price quote recorded successfully',
                data: {
                    id: result.insertId,
                    quote_valid_until,
                    price_trend_indicator,
                    total_landed_cost: quoted_price + shipping_cost + handling_charges + 
                                     packaging_cost + insurance_cost + customs_charges
                }
            });
            
        } catch (error) {
            console.error('Error recording price quote:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record price quote',
                error: error.message
            });
        }
    }
    
    // Record delivery performance
    async recordDeliveryPerformance(req, res) {
        try {
            const {
                purchase_order_id,
                purchase_order_number,
                supplier_id,
                product_id,
                order_date,
                promised_delivery_date,
                actual_delivery_date,
                requested_quantity,
                delivered_quantity,
                quality_on_receipt = 'good',
                defects_found = 0,
                documentation_complete = true,
                certifications_provided = true,
                packaging_condition = 'good',
                communication_quality = 'good',
                inspection_notes,
                issues_reported
            } = req.body;
            
            if (!purchase_order_number || !supplier_id || !product_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase order number, supplier ID, and product ID are required'
                });
            }
            
            // Calculate delivery performance metrics
            let delivery_status = 'pending';
            let days_early = 0;
            let days_late = 0;
            let delivery_accuracy_percentage = 100;
            
            if (actual_delivery_date) {
                const promised = new Date(promised_delivery_date);
                const actual = new Date(actual_delivery_date);
                const diffDays = Math.floor((actual - promised) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    days_early = Math.abs(diffDays);
                } else if (diffDays > 0) {
                    days_late = diffDays;
                }
                
                if (delivered_quantity && requested_quantity) {
                    delivery_accuracy_percentage = (delivered_quantity / requested_quantity) * 100;
                    delivery_status = delivery_accuracy_percentage >= 100 ? 'complete' : 'partial';
                }
            }
            
            const [result] = await db.execute(`
                INSERT INTO vendor_delivery_performance (
                    purchase_order_id, purchase_order_number, supplier_id, product_id,
                    order_date, promised_delivery_date, actual_delivery_date,
                    requested_quantity, delivered_quantity, delivery_status,
                    days_early, days_late, delivery_accuracy_percentage,
                    quality_on_receipt, defects_found, inspection_notes,
                    documentation_complete, certifications_provided, packaging_condition,
                    communication_quality, issues_reported, recorded_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                purchase_order_id, purchase_order_number, supplier_id, product_id,
                order_date, promised_delivery_date, actual_delivery_date,
                requested_quantity, delivered_quantity, delivery_status,
                days_early, days_late, delivery_accuracy_percentage,
                quality_on_receipt, defects_found, inspection_notes,
                documentation_complete, certifications_provided, packaging_condition,
                communication_quality, issues_reported, req.user?.id || 1
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Delivery performance recorded successfully',
                data: {
                    id: result.insertId,
                    delivery_status,
                    days_early,
                    days_late,
                    delivery_accuracy_percentage
                }
            });
            
        } catch (error) {
            console.error('Error recording delivery performance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record delivery performance',
                error: error.message
            });
        }
    }
    
    // Conduct supplier performance evaluation
    async conductPerformanceEvaluation(req, res) {
        try {
            const { supplier_id } = req.params;
            const {
                evaluation_period_start,
                evaluation_period_end,
                evaluation_type = 'quarterly',
                quality_score,
                delivery_score,
                communication_score,
                pricing_score,
                service_score,
                innovation_score,
                improvements_noted,
                areas_for_improvement,
                critical_issues,
                recommended_actions = 'continue_partnership',
                partnership_level_recommendation
            } = req.body;
            
            if (!supplier_id || !quality_score || !delivery_score) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier ID and performance scores are required'
                });
            }
            
            // Get performance metrics for the evaluation period
            const [performanceMetrics] = await db.execute(`
                SELECT 
                    COUNT(*) as orders_placed,
                    COUNT(CASE WHEN delivery_status IN ('complete', 'partial') THEN 1 END) as orders_delivered,
                    COUNT(CASE WHEN days_early > 0 THEN 1 END) as orders_delivered_early,
                    COUNT(CASE WHEN days_late > 0 THEN 1 END) as orders_delivered_late,
                    SUM(requested_quantity * (SELECT AVG(quoted_price) FROM vendor_price_history WHERE supplier_id = ?)) as total_order_value,
                    SUM(defects_found) as defective_items_received,
                    SUM(delivered_quantity) as total_items_received,
                    AVG(CASE WHEN communication_quality = 'excellent' THEN 5
                             WHEN communication_quality = 'good' THEN 4
                             WHEN communication_quality = 'fair' THEN 3
                             WHEN communication_quality = 'poor' THEN 2
                             ELSE 3 END) as avg_communication_score
                FROM vendor_delivery_performance
                WHERE supplier_id = ?
                AND order_date BETWEEN ? AND ?
            `, [supplier_id, supplier_id, evaluation_period_start, evaluation_period_end]);
            
            const metrics = performanceMetrics[0];
            const orders_delivered_on_time = metrics.orders_delivered - metrics.orders_delivered_early - metrics.orders_delivered_late;
            
            const [result] = await db.execute(`
                INSERT INTO vendor_performance_evaluations (
                    supplier_id, evaluation_period_start, evaluation_period_end,
                    evaluation_type, evaluated_by, quality_score, delivery_score,
                    communication_score, pricing_score, service_score, innovation_score,
                    orders_placed, orders_delivered_on_time, orders_delivered_early,
                    orders_delivered_late, total_order_value, defective_items_received,
                    total_items_received, improvements_noted, areas_for_improvement,
                    critical_issues, recommended_actions, partnership_level_recommendation
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                supplier_id, evaluation_period_start, evaluation_period_end,
                evaluation_type, req.user?.id || 1, quality_score, delivery_score,
                communication_score, pricing_score, service_score, innovation_score,
                metrics.orders_placed, orders_delivered_on_time, metrics.orders_delivered_early,
                metrics.orders_delivered_late, metrics.total_order_value || 0, 
                metrics.defective_items_received, metrics.total_items_received,
                improvements_noted, areas_for_improvement, critical_issues,
                recommended_actions, partnership_level_recommendation
            ]);
            
            // Update supplier ratings based on evaluation
            await db.execute(`
                UPDATE suppliers SET
                    quality_rating = ?,
                    delivery_rating = ?,
                    communication_rating = ?,
                    price_competitiveness = ?,
                    overall_rating = (? * 0.25 + ? * 0.20 + ? * 0.15 + ? * 0.20 + ? * 0.15 + ? * 0.05),
                    last_evaluation_date = CURDATE(),
                    next_review_due = DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
                WHERE id = ?
            `, [
                quality_score, delivery_score, communication_score, pricing_score,
                quality_score, delivery_score, communication_score, pricing_score, service_score, innovation_score,
                supplier_id
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Performance evaluation completed successfully',
                data: {
                    evaluation_id: result.insertId,
                    overall_score: (quality_score * 0.25 + delivery_score * 0.20 + communication_score * 0.15 + 
                                   pricing_score * 0.20 + service_score * 0.15 + innovation_score * 0.05).toFixed(2)
                }
            });
            
        } catch (error) {
            console.error('Error conducting performance evaluation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to conduct performance evaluation',
                error: error.message
            });
        }
    }
    
    // Update supplier performance metrics
    async updateSupplierMetrics(req, res) {
        try {
            const { supplier_id } = req.params;
            const { evaluation_period_days = 90 } = req.body;
            
            await db.execute(`CALL UpdateSupplierPerformanceMetrics(?, ?)`, [
                supplier_id, evaluation_period_days
            ]);
            
            res.json({
                success: true,
                message: 'Supplier performance metrics updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating supplier metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update supplier metrics',
                error: error.message
            });
        }
    }
    
    // Get price history and trends
    async getPriceHistory(req, res) {
        try {
            const { product_id, supplier_id, months = 12 } = req.query;
            
            let whereConditions = [];
            const params = [];
            
            if (product_id) {
                whereConditions.push('product_id = ?');
                params.push(product_id);
            }
            
            if (supplier_id) {
                whereConditions.push('supplier_id = ?');
                params.push(supplier_id);
            }
            
            whereConditions.push('quote_received_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)');
            params.push(parseInt(months));
            
            const whereClause = whereConditions.join(' AND ');
            
            const [priceHistory] = await db.execute(`
                SELECT 
                    vph.id,
                    vph.product_id,
                    p.name as product_name,
                    p.product_code,
                    vph.supplier_id,
                    s.company_name,
                    vph.quoted_price,
                    vph.total_landed_cost,
                    vph.delivery_lead_time_days,
                    vph.market_price_position,
                    vph.price_trend_indicator,
                    vph.quote_received_date,
                    vph.quote_valid_until,
                    vph.quote_status,
                    
                    -- Price change calculation
                    LAG(vph.quoted_price) OVER (PARTITION BY vph.product_id, vph.supplier_id ORDER BY vph.quote_received_date) as previous_price,
                    CASE 
                        WHEN LAG(vph.quoted_price) OVER (PARTITION BY vph.product_id, vph.supplier_id ORDER BY vph.quote_received_date) IS NOT NULL THEN
                            ((vph.quoted_price - LAG(vph.quoted_price) OVER (PARTITION BY vph.product_id, vph.supplier_id ORDER BY vph.quote_received_date)) / 
                             LAG(vph.quoted_price) OVER (PARTITION BY vph.product_id, vph.supplier_id ORDER BY vph.quote_received_date) * 100)
                        ELSE NULL
                    END as price_change_percentage
                    
                FROM vendor_price_history vph
                JOIN products p ON vph.product_id = p.id
                JOIN suppliers s ON vph.supplier_id = s.id
                WHERE ${whereClause}
                ORDER BY vph.quote_received_date DESC, vph.product_id, vph.supplier_id
            `, params);
            
            res.json({
                success: true,
                data: priceHistory
            });
            
        } catch (error) {
            console.error('Error fetching price history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch price history',
                error: error.message
            });
        }
    }
}

module.exports = new VendorPerformanceController();