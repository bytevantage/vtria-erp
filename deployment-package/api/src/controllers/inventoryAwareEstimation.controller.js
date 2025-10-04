const db = require('../config/database');

// Intelligent product search for estimation with inventory awareness
exports.searchProductsForEstimation = async (req, res) => {
    try {
        const { q, location_id, project_location, min_quantity = 1 } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.make,
                p.model,
                p.part_code,
                p.product_code,
                p.mrp,
                p.vendor_discount,
                p.last_price,
                p.last_purchase_price,
                p.last_purchase_date,
                p.unit,
                p.hsn_code,
                p.gst_rate,
                p.serial_number_required,
                p.warranty_period,
                p.warranty_period_type,
                p.warranty_upto,
                p.min_stock_level,
                p.reorder_level,
                c.name as category_name,
                sc.name as sub_category_name,
                
                -- Multi-location stock information
                COALESCE(SUM(iws.current_stock), 0) as total_stock_all_locations,
                COALESCE(SUM(CASE WHEN iws.location_id = ? THEN iws.current_stock ELSE 0 END), 0) as stock_at_location,
                
                -- Stock status calculation
                CASE 
                    WHEN COALESCE(SUM(iws.current_stock), 0) >= ? THEN 'Available'
                    WHEN COALESCE(SUM(iws.current_stock), 0) > 0 THEN 'Partial Stock'
                    WHEN COALESCE(SUM(iws.current_stock), 0) <= p.min_stock_level THEN 'Critical'
                    ELSE 'Out of Stock'
                END as stock_status,
                
                -- Availability score for sorting (higher is better)
                CASE 
                    WHEN COALESCE(SUM(CASE WHEN iws.location_id = ? THEN iws.current_stock ELSE 0 END), 0) >= ? THEN 100
                    WHEN COALESCE(SUM(iws.current_stock), 0) >= ? THEN 80
                    WHEN COALESCE(SUM(iws.current_stock), 0) > 0 THEN 60
                    WHEN p.last_purchase_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 40
                    ELSE 20
                END as availability_score,
                
                -- Lead time estimation
                CASE 
                    WHEN COALESCE(SUM(iws.current_stock), 0) >= ? THEN 0
                    WHEN p.last_purchase_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN 7
                    WHEN p.last_purchase_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) THEN 14
                    ELSE 21
                END as estimated_lead_time_days,
                
                -- Best vendor pricing
                vp.vendor_name as best_vendor,
                vp.vendor_price as best_vendor_price,
                vp.vendor_discount as best_vendor_discount,
                vp.final_price as best_final_price,
                vp.valid_until as price_valid_until,
                
                -- Warranty information
                CASE 
                    WHEN p.warranty_period_type = 'years' THEN p.warranty_period * 12
                    ELSE p.warranty_period
                END as warranty_months,
                
                -- Recent purchase history
                pb.purchase_date as last_batch_date,
                pb.purchase_price as last_batch_price,
                pb.vendor_name as last_vendor,
                pb.batch_warranty_period,
                pb.batch_warranty_type
                
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN inventory_warehouse_stock iws ON p.id = iws.item_id
            LEFT JOIN (
                SELECT 
                    product_id,
                    vendor_name,
                    vendor_price,
                    vendor_discount,
                    final_price,
                    valid_until,
                    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY final_price ASC) as rn
                FROM vendor_prices 
                WHERE is_active = TRUE 
                AND valid_from <= CURDATE()
                AND (valid_until IS NULL OR valid_until >= CURDATE())
            ) vp ON p.id = vp.product_id AND vp.rn = 1
            LEFT JOIN (
                SELECT 
                    item_id,
                    purchase_date,
                    purchase_price,
                    vendor_name,
                    warranty_period as batch_warranty_period,
                    warranty_type as batch_warranty_type,
                    ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY purchase_date DESC) as rn
                FROM inventory_batches
            ) pb ON p.id = pb.item_id AND pb.rn = 1
            
            WHERE p.is_active = TRUE 
            AND (p.name LIKE ? OR p.part_code LIKE ? OR p.product_code LIKE ? OR p.make LIKE ? OR p.model LIKE ?)
            
            GROUP BY p.id, p.name, p.make, p.model, p.part_code, p.product_code, 
                     p.mrp, p.vendor_discount, p.last_price, p.last_purchase_price, 
                     p.last_purchase_date, p.unit, p.hsn_code, p.gst_rate, 
                     p.serial_number_required, p.warranty_period, p.warranty_period_type, 
                     p.warranty_upto, p.min_stock_level, p.reorder_level, 
                     c.name, sc.name, vp.vendor_name, vp.vendor_price, vp.vendor_discount, 
                     vp.final_price, vp.valid_until, pb.purchase_date, pb.purchase_price, 
                     pb.vendor_name, pb.batch_warranty_period, pb.batch_warranty_type
            
            ORDER BY 
                availability_score DESC,
                CASE 
                    WHEN p.name LIKE ? THEN 1
                    WHEN p.product_code LIKE ? THEN 2
                    WHEN p.part_code LIKE ? THEN 3
                    WHEN p.make LIKE ? THEN 4
                    ELSE 5
                END,
                p.name
            LIMIT 50
        `, [
            location_id || 1, min_quantity, location_id || 1, min_quantity, min_quantity, min_quantity,
            `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`,
            `${q}%`, `${q}%`, `${q}%`, `${q}%`
        ]);
        
        // Enhance results with additional intelligence
        const enhancedResults = rows.map(product => ({
            ...product,
            // Cost optimization suggestions
            cost_optimization: {
                current_mrp: product.mrp,
                best_vendor_price: product.best_final_price || product.last_price,
                potential_savings: product.mrp && product.best_final_price ? 
                    ((product.mrp - product.best_final_price) / product.mrp * 100).toFixed(2) : 0,
                last_purchase_price: product.last_batch_price || product.last_purchase_price
            },
            
            // Stock intelligence
            stock_intelligence: {
                immediate_availability: product.stock_at_location >= min_quantity,
                total_system_stock: product.total_stock_all_locations,
                reorder_recommended: product.total_stock_all_locations <= product.reorder_level,
                critical_stock: product.total_stock_all_locations <= product.min_stock_level
            },
            
            // Delivery estimation
            delivery_estimation: {
                lead_time_days: product.estimated_lead_time_days,
                expected_delivery: new Date(Date.now() + product.estimated_lead_time_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                delivery_confidence: product.availability_score >= 80 ? 'High' : 
                                   product.availability_score >= 60 ? 'Medium' : 'Low'
            },
            
            // Warranty intelligence
            warranty_intelligence: {
                warranty_months: product.warranty_months,
                warranty_expires: product.warranty_upto,
                serial_tracking_required: product.serial_number_required,
                batch_warranty: product.batch_warranty_period ? 
                    `${product.batch_warranty_period} ${product.batch_warranty_type}` : null
            }
        }));
        
        res.json({
            success: true,
            data: enhancedResults,
            metadata: {
                search_query: q,
                location_filter: location_id,
                min_quantity: min_quantity,
                results_count: enhancedResults.length
            }
        });
        
    } catch (error) {
        console.error('Error in intelligent product search:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching products for estimation',
            error: error.message
        });
    }
};

// Get alternative products based on specifications and availability
exports.getAlternativeProducts = async (req, res) => {
    try {
        const { product_id, category_id, specifications, location_id } = req.query;
        
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.make,
                p.model,
                p.part_code,
                p.product_code,
                p.mrp,
                p.unit,
                p.warranty_period,
                p.warranty_period_type,
                c.name as category_name,
                
                -- Stock availability
                COALESCE(SUM(iws.current_stock), 0) as total_stock,
                COALESCE(SUM(CASE WHEN iws.location_id = ? THEN iws.current_stock ELSE 0 END), 0) as stock_at_location,
                
                -- Pricing information
                vp.vendor_name as best_vendor,
                vp.final_price as best_price,
                
                -- Similarity score (basic implementation)
                CASE 
                    WHEN p.category_id = ? THEN 50
                    ELSE 0
                END +
                CASE 
                    WHEN p.make = (SELECT make FROM products WHERE id = ?) THEN 30
                    ELSE 0
                END +
                CASE 
                    WHEN COALESCE(SUM(iws.current_stock), 0) > 0 THEN 20
                    ELSE 0
                END as similarity_score
                
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN inventory_warehouse_stock iws ON p.id = iws.item_id
            LEFT JOIN (
                SELECT 
                    product_id,
                    vendor_name,
                    final_price,
                    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY final_price ASC) as rn
                FROM vendor_prices 
                WHERE is_active = TRUE 
                AND valid_from <= CURDATE()
                AND (valid_until IS NULL OR valid_until >= CURDATE())
            ) vp ON p.id = vp.product_id AND vp.rn = 1
            
            WHERE p.is_active = TRUE 
            AND p.id != ?
            AND (p.category_id = ? OR p.category_id IN (
                SELECT id FROM categories WHERE parent_id = ?
            ))
            
            GROUP BY p.id, p.name, p.make, p.model, p.part_code, p.product_code, 
                     p.mrp, p.unit, p.warranty_period, p.warranty_period_type, 
                     c.name, vp.vendor_name, vp.final_price
            
            HAVING similarity_score > 20
            ORDER BY similarity_score DESC, total_stock DESC
            LIMIT 10
        `, [location_id || 1, category_id, product_id, product_id, category_id, category_id]);
        
        res.json({
            success: true,
            data: rows,
            metadata: {
                original_product_id: product_id,
                alternatives_found: rows.length
            }
        });
        
    } catch (error) {
        console.error('Error finding alternative products:', error);
        res.status(500).json({
            success: false,
            message: 'Error finding alternative products',
            error: error.message
        });
    }
};

// Get vendor price comparison for estimation
exports.getVendorPriceComparison = async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.query;
        
        const [rows] = await db.execute(`
            SELECT 
                vp.id,
                vp.vendor_name,
                vp.vendor_price,
                vp.vendor_discount,
                vp.final_price,
                vp.valid_from,
                vp.valid_until,
                vp.minimum_order_quantity,
                vp.bulk_discount_quantity,
                vp.bulk_discount_percentage,
                
                -- Calculate quantity-based pricing
                CASE 
                    WHEN ? >= vp.bulk_discount_quantity AND vp.bulk_discount_percentage > 0 THEN
                        vp.final_price * (1 - vp.bulk_discount_percentage / 100)
                    ELSE vp.final_price
                END as quantity_based_price,
                
                -- Vendor performance metrics
                vs.delivery_rating,
                vs.quality_rating,
                vs.overall_rating,
                vs.total_orders,
                vs.on_time_deliveries,
                
                -- Recent purchase history
                pb.purchase_date as last_purchase_date,
                pb.purchase_price as last_purchase_price,
                pb.delivery_days as last_delivery_days
                
            FROM vendor_prices vp
            LEFT JOIN vendor_statistics vs ON vp.vendor_name = vs.vendor_name
            LEFT JOIN (
                SELECT 
                    vendor_name,
                    purchase_date,
                    purchase_price,
                    delivery_days,
                    ROW_NUMBER() OVER (PARTITION BY vendor_name ORDER BY purchase_date DESC) as rn
                FROM inventory_batches
                WHERE item_id = ?
            ) pb ON vp.vendor_name = pb.vendor_name AND pb.rn = 1
            
            WHERE vp.product_id = ?
            AND vp.is_active = TRUE
            AND vp.valid_from <= CURDATE()
            AND (vp.valid_until IS NULL OR vp.valid_until >= CURDATE())
            AND (vp.minimum_order_quantity IS NULL OR vp.minimum_order_quantity <= ?)
            
            ORDER BY 
                CASE 
                    WHEN ? >= vp.bulk_discount_quantity AND vp.bulk_discount_percentage > 0 THEN
                        vp.final_price * (1 - vp.bulk_discount_percentage / 100)
                    ELSE vp.final_price
                END ASC,
                vs.overall_rating DESC
        `, [quantity, product_id, product_id, quantity, quantity]);
        
        // Calculate savings and recommendations
        const enhancedComparison = rows.map((vendor, index) => ({
            ...vendor,
            rank: index + 1,
            is_recommended: index === 0 || (vendor.overall_rating >= 4.0 && vendor.quantity_based_price <= rows[0].quantity_based_price * 1.1),
            total_cost: (vendor.quantity_based_price * quantity).toFixed(2),
            savings_vs_highest: rows.length > 1 ? 
                ((rows[rows.length - 1].quantity_based_price - vendor.quantity_based_price) * quantity).toFixed(2) : 0,
            delivery_confidence: vendor.on_time_deliveries && vendor.total_orders ? 
                ((vendor.on_time_deliveries / vendor.total_orders) * 100).toFixed(1) : null
        }));
        
        res.json({
            success: true,
            data: enhancedComparison,
            metadata: {
                product_id: product_id,
                quantity: quantity,
                vendors_compared: enhancedComparison.length,
                best_price: enhancedComparison[0]?.quantity_based_price,
                potential_savings: enhancedComparison.length > 1 ? 
                    enhancedComparison[0].savings_vs_highest : 0
            }
        });
        
    } catch (error) {
        console.error('Error in vendor price comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Error comparing vendor prices',
            error: error.message
        });
    }
};

// Get stock availability across all locations for estimation
exports.getMultiLocationStock = async (req, res) => {
    try {
        const { product_ids, project_location } = req.query;
        
        if (!product_ids) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs are required'
            });
        }
        
        const productIdArray = product_ids.split(',').map(id => parseInt(id));
        const placeholders = productIdArray.map(() => '?').join(',');
        
        const [rows] = await db.execute(`
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.part_code,
                l.id as location_id,
                l.name as location_name,
                l.city,
                l.state,
                COALESCE(iws.current_stock, 0) as current_stock,
                COALESCE(iws.reserved_stock, 0) as reserved_stock,
                COALESCE(iws.available_stock, 0) as available_stock,
                
                -- Distance calculation (simplified - in real implementation use geolocation)
                CASE 
                    WHEN l.city = ? THEN 0
                    WHEN l.state = (SELECT state FROM inventory_locations WHERE city = ?) THEN 1
                    ELSE 2
                END as distance_priority,
                
                -- Transfer feasibility
                CASE 
                    WHEN COALESCE(iws.available_stock, 0) > 0 THEN 'Available'
                    WHEN COALESCE(iws.current_stock, 0) > COALESCE(iws.reserved_stock, 0) THEN 'Partial'
                    ELSE 'Not Available'
                END as transfer_status
                
            FROM products p
            CROSS JOIN inventory_locations l
            LEFT JOIN inventory_warehouse_stock iws ON p.id = iws.item_id AND l.id = iws.location_id
            
            WHERE p.id IN (${placeholders})
            AND p.is_active = TRUE
            AND l.is_active = TRUE
            
            ORDER BY p.id, distance_priority ASC, current_stock DESC
        `, [...productIdArray, project_location || '', project_location || '']);
        
        // Group by product for easier consumption
        const stockByProduct = {};
        rows.forEach(row => {
            if (!stockByProduct[row.product_id]) {
                stockByProduct[row.product_id] = {
                    product_id: row.product_id,
                    product_name: row.product_name,
                    part_code: row.part_code,
                    total_stock: 0,
                    total_available: 0,
                    locations: []
                };
            }
            
            stockByProduct[row.product_id].total_stock += row.current_stock;
            stockByProduct[row.product_id].total_available += row.available_stock;
            stockByProduct[row.product_id].locations.push({
                location_id: row.location_id,
                location_name: row.location_name,
                city: row.city,
                state: row.state,
                current_stock: row.current_stock,
                reserved_stock: row.reserved_stock,
                available_stock: row.available_stock,
                distance_priority: row.distance_priority,
                transfer_status: row.transfer_status
            });
        });
        
        res.json({
            success: true,
            data: Object.values(stockByProduct),
            metadata: {
                products_queried: productIdArray.length,
                project_location: project_location
            }
        });
        
    } catch (error) {
        console.error('Error fetching multi-location stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching multi-location stock information',
            error: error.message
        });
    }
};

// Get warranty and serial number information for estimation
exports.getWarrantyInformation = async (req, res) => {
    try {
        const { product_id } = req.params;
        
        const [productInfo] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.serial_number_required,
                p.warranty_period,
                p.warranty_period_type,
                p.warranty_upto,
                
                -- Available serial numbers
                COUNT(ps.id) as available_serials,
                
                -- Warranty template information
                wt.template_name,
                wt.warranty_terms,
                wt.service_locations,
                wt.coverage_details
                
            FROM products p
            LEFT JOIN product_serials ps ON p.id = ps.product_id AND ps.status = 'available'
            LEFT JOIN warranty_templates wt ON p.id = wt.product_id AND wt.is_active = TRUE
            
            WHERE p.id = ?
            GROUP BY p.id, wt.template_name, wt.warranty_terms, wt.service_locations, wt.coverage_details
        `, [product_id]);
        
        if (productInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Get recent warranty claims for this product
        const [warrantyClaims] = await db.execute(`
            SELECT 
                wc.claim_number,
                wc.claim_date,
                wc.issue_description,
                wc.resolution_status,
                wc.resolution_date,
                wc.cost_incurred,
                ps.serial_number
            FROM warranty_claims wc
            JOIN product_serials ps ON wc.serial_id = ps.id
            WHERE ps.product_id = ?
            ORDER BY wc.claim_date DESC
            LIMIT 10
        `, [product_id]);
        
        // Calculate warranty statistics
        const totalClaims = warrantyClaims.length;
        const resolvedClaims = warrantyClaims.filter(claim => claim.resolution_status === 'resolved').length;
        const totalCost = warrantyClaims.reduce((sum, claim) => sum + (claim.cost_incurred || 0), 0);
        
        const result = {
            ...productInfo[0],
            warranty_statistics: {
                total_claims: totalClaims,
                resolved_claims: resolvedClaims,
                resolution_rate: totalClaims > 0 ? ((resolvedClaims / totalClaims) * 100).toFixed(1) : 0,
                total_warranty_cost: totalCost,
                average_claim_cost: totalClaims > 0 ? (totalCost / totalClaims).toFixed(2) : 0
            },
            recent_claims: warrantyClaims,
            warranty_risk_assessment: {
                risk_level: totalClaims > 5 ? 'High' : totalClaims > 2 ? 'Medium' : 'Low',
                recommendation: totalClaims > 5 ? 
                    'Consider alternative products or extended warranty' :
                    totalClaims > 2 ? 
                    'Monitor warranty performance' : 
                    'Good warranty track record'
            }
        };
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Error fetching warranty information:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching warranty information',
            error: error.message
        });
    }
};

// Get estimation cost optimization suggestions
exports.getCostOptimizationSuggestions = async (req, res) => {
    try {
        const { estimation_id } = req.params;
        
        // Get all items in the estimation
        const [estimationItems] = await db.execute(`
            SELECT 
                ei.id,
                ei.product_id,
                ei.quantity,
                ei.mrp,
                ei.final_price,
                p.name as product_name,
                p.part_code,
                p.category_id,
                
                -- Current total cost
                (ei.quantity * ei.final_price) as current_total_cost
                
            FROM estimation_items ei
            JOIN products p ON ei.product_id = p.id
            WHERE ei.estimation_id = ?
        `, [estimation_id]);
        
        const suggestions = [];
        
        for (const item of estimationItems) {
            // Get best vendor price for this item
            const [bestVendor] = await db.execute(`
                SELECT 
                    vendor_name,
                    final_price,
                    bulk_discount_quantity,
                    bulk_discount_percentage
                FROM vendor_prices 
                WHERE product_id = ?
                AND is_active = TRUE 
                AND valid_from <= CURDATE()
                AND (valid_until IS NULL OR valid_until >= CURDATE())
                ORDER BY final_price ASC
                LIMIT 1
            `, [item.product_id]);
            
            if (bestVendor.length > 0) {
                const bestPrice = bestVendor[0];
                let optimizedPrice = bestPrice.final_price;
                
                // Apply bulk discount if applicable
                if (item.quantity >= bestPrice.bulk_discount_quantity && bestPrice.bulk_discount_percentage > 0) {
                    optimizedPrice = bestPrice.final_price * (1 - bestPrice.bulk_discount_percentage / 100);
                }
                
                const potentialSavings = (item.final_price - optimizedPrice) * item.quantity;
                
                if (potentialSavings > 0) {
                    suggestions.push({
                        item_id: item.id,
                        product_name: item.product_name,
                        part_code: item.part_code,
                        current_price: item.final_price,
                        optimized_price: optimizedPrice,
                        quantity: item.quantity,
                        current_total: item.current_total_cost,
                        optimized_total: (optimizedPrice * item.quantity).toFixed(2),
                        potential_savings: potentialSavings.toFixed(2),
                        savings_percentage: ((potentialSavings / item.current_total_cost) * 100).toFixed(2),
                        recommended_vendor: bestPrice.vendor_name,
                        suggestion_type: 'vendor_optimization'
                    });
                }
            }
            
            // Get alternative products with better pricing
            const [alternatives] = await db.execute(`
                SELECT 
                    p.id,
                    p.name,
                    p.part_code,
                    vp.final_price,
                    vp.vendor_name
                FROM products p
                JOIN vendor_prices vp ON p.id = vp.product_id
                WHERE p.category_id = ?
                AND p.id != ?
                AND p.is_active = TRUE
                AND vp.is_active = TRUE
                AND vp.valid_from <= CURDATE()
                AND (vp.valid_until IS NULL OR vp.valid_until >= CURDATE())
                AND vp.final_price < ?
                ORDER BY vp.final_price ASC
                LIMIT 3
            `, [item.category_id, item.product_id, item.final_price]);
            
            alternatives.forEach(alt => {
                const potentialSavings = (item.final_price - alt.final_price) * item.quantity;
                suggestions.push({
                    item_id: item.id,
                    product_name: item.product_name,
                    alternative_product_id: alt.id,
                    alternative_name: alt.name,
                    alternative_part_code: alt.part_code,
                    current_price: item.final_price,
                    alternative_price: alt.final_price,
                    quantity: item.quantity,
                    potential_savings: potentialSavings.toFixed(2),
                    savings_percentage: ((potentialSavings / item.current_total_cost) * 100).toFixed(2),
                    recommended_vendor: alt.vendor_name,
                    suggestion_type: 'product_alternative'
                });
            });
        }
        
        // Sort suggestions by potential savings
        suggestions.sort((a, b) => parseFloat(b.potential_savings) - parseFloat(a.potential_savings));
        
        const totalPotentialSavings = suggestions.reduce((sum, s) => sum + parseFloat(s.potential_savings), 0);
        const currentTotal = estimationItems.reduce((sum, item) => sum + item.current_total_cost, 0);
        
        res.json({
            success: true,
            data: {
                suggestions: suggestions.slice(0, 20), // Top 20 suggestions
                summary: {
                    total_items: estimationItems.length,
                    suggestions_count: suggestions.length,
                    total_potential_savings: totalPotentialSavings.toFixed(2),
                    current_estimation_total: currentTotal.toFixed(2),
                    potential_savings_percentage: currentTotal > 0 ? 
                        ((totalPotentialSavings / currentTotal) * 100).toFixed(2) : 0
                }
            }
        });
        
    } catch (error) {
        console.error('Error generating cost optimization suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating cost optimization suggestions',
            error: error.message
        });
    }
};
