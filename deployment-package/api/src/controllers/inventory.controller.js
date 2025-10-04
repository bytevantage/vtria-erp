const db = require('../config/database');

// Generate inventory item code
const generateItemCode = async (itemType) => {
    const prefixes = {
        'raw_material': 'RM',
        'component': 'CP',
        'finished_product': 'FP',
        'consumable': 'CS',
        'tool': 'TL'
    };
    
    const prefix = prefixes[itemType] || 'IT';
    const year = new Date().getFullYear();
    
    // Get the next sequence number for this type and year
    const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM inventory_items 
         WHERE item_code LIKE ? AND YEAR(created_at) = ?`,
        [`VESPL/${prefix}/${year}/%`, year]
    );
    
    const sequence = (result[0].count + 1).toString().padStart(3, '0');
    return `VESPL/${prefix}/${year}/${sequence}`;
};

// Generate transaction code
const generateTransactionCode = async (transactionType) => {
    const prefixes = {
        'purchase_receipt': 'PR',
        'sales_issue': 'SI',
        'production_issue': 'PI',
        'production_receipt': 'PR',
        'stock_transfer': 'ST',
        'stock_adjustment': 'SA',
        'return_receipt': 'RR',
        'return_issue': 'RI',
        'opening_stock': 'OS',
        'physical_count': 'PC'
    };
    
    const prefix = prefixes[transactionType] || 'IT';
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM inventory_transactions 
         WHERE transaction_code LIKE ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
        [`VESPL/${prefix}/${year}${month}/%`, year, new Date().getMonth() + 1]
    );
    
    const sequence = (result[0].count + 1).toString().padStart(4, '0');
    return `VESPL/${prefix}/${year}${month}/${sequence}`;
};

class InventoryController {
    // Dashboard - Get inventory summary
    async getInventoryDashboard(req, res) {
        try {
            // Total items count
            const [totalItems] = await db.execute(
                'SELECT COUNT(*) as total FROM inventory_items WHERE is_active = TRUE'
            );

            // Low stock items
            const [lowStockItems] = await db.execute(
                `SELECT COUNT(*) as count FROM inventory_items 
                 WHERE current_stock <= minimum_stock AND is_active = TRUE`
            );

            // Reorder required items
            const [reorderItems] = await db.execute(
                `SELECT COUNT(*) as count FROM inventory_items 
                 WHERE current_stock <= reorder_point AND is_active = TRUE`
            );

            // Total stock value
            const [stockValue] = await db.execute(
                `SELECT SUM(current_stock * average_cost) as total_value 
                 FROM inventory_items WHERE is_active = TRUE`
            );

            // Recent transactions (last 10)
            const [recentTransactions] = await db.execute(
                `SELECT t.*, i.item_name, i.item_code 
                 FROM inventory_transactions t
                 JOIN inventory_items i ON t.item_id = i.id
                 ORDER BY t.created_at DESC LIMIT 10`
            );

            // Items by category
            const [categoryBreakdown] = await db.execute(
                `SELECT c.category_name, COUNT(i.id) as item_count,
                        SUM(i.current_stock * i.average_cost) as category_value
                 FROM inventory_categories c
                 LEFT JOIN inventory_items i ON c.id = i.category_id AND i.is_active = TRUE
                 GROUP BY c.id, c.category_name
                 ORDER BY category_value DESC`
            );

            res.json({
                success: true,
                data: {
                    summary: {
                        totalItems: totalItems[0].total,
                        lowStockItems: lowStockItems[0].count,
                        reorderItems: reorderItems[0].count,
                        totalStockValue: stockValue[0].total_value || 0
                    },
                    recentTransactions,
                    categoryBreakdown
                }
            });
        } catch (error) {
            console.error('Error fetching inventory dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory dashboard',
                error: error.message
            });
        }
    }

    // Get all inventory items with filters
    async getAllItems(req, res) {
        try {
            const { 
                category, 
                item_type, 
                stock_status, 
                search,
                page = 1, 
                limit = 20 
            } = req.query;

            const query = `
                SELECT 
                    i.id, i.item_code, i.item_name, i.description, i.item_type,
                    i.current_stock, i.reserved_stock, i.available_stock,
                    i.minimum_stock, i.reorder_point, i.reorder_quantity,
                    i.standard_cost, i.average_cost, i.last_purchase_cost,
                    COALESCE(c.category_name, c.name, 'Uncategorized') as category_name, 
                    COALESCE(u.unit_name, 'PCS') as unit_name,
                    CASE 
                        WHEN i.current_stock <= i.reorder_point THEN 'Reorder Required'
                        WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock'
                        ELSE 'Normal'
                    END as stock_status,
                    (i.current_stock * i.average_cost) as stock_value,
                    i.created_at, i.updated_at
                FROM inventory_items i
                LEFT JOIN inventory_categories c ON i.category_id = c.id
                LEFT JOIN inventory_units u ON i.unit_id = u.id
                WHERE i.is_active = TRUE
                ORDER BY i.created_at DESC
                LIMIT 50
            `;

            const [items] = await db.execute(query);

            res.json({
                success: true,
                data: items,
                count: items.length
            });
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory items',
                error: error.message
            });
        }
    }

    // Get single inventory item by ID
    async getItemById(req, res) {
        try {
            const { id } = req.params;

            const [items] = await db.execute(`
                SELECT 
                    i.*, c.category_name, u.unit_name,
                    CASE 
                        WHEN i.current_stock <= i.reorder_point THEN 'Reorder Required'
                        WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock'
                        ELSE 'Normal'
                    END as stock_status,
                    (i.current_stock * i.average_cost) as stock_value
                FROM inventory_items i
                LEFT JOIN inventory_categories c ON i.category_id = c.id
                LEFT JOIN inventory_units u ON i.unit_id = u.id
                WHERE i.id = ?
            `, [id]);

            if (items.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            // Get recent transactions for this item
            const [transactions] = await db.execute(`
                SELECT 
                    t.*, u.username as created_by_name
                FROM inventory_transactions t
                LEFT JOIN users u ON t.created_by = u.id
                WHERE t.item_id = ?
                ORDER BY t.created_at DESC
                LIMIT 20
            `, [id]);

            // Get vendor information
            const [vendors] = await db.execute(`
                SELECT 
                    iv.*, v.vendor_name, v.contact_person, v.email, v.phone
                FROM inventory_item_vendors iv
                JOIN inventory_vendors v ON iv.vendor_id = v.id
                WHERE iv.item_id = ? AND iv.is_active = TRUE
                ORDER BY iv.is_preferred DESC, iv.unit_cost ASC
            `, [id]);

            res.json({
                success: true,
                data: {
                    item: items[0],
                    transactions,
                    vendors
                }
            });
        } catch (error) {
            console.error('Error fetching inventory item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory item',
                error: error.message
            });
        }
    }

    // Create new inventory item
    async createItem(req, res) {
        try {
            const {
                item_name, description, category_id, unit_id, item_type,
                minimum_stock, maximum_stock, reorder_point, reorder_quantity,
                standard_cost, weight_per_unit, dimensions_length, dimensions_width, dimensions_height,
                track_serial_numbers, track_batch_numbers, track_expiry_dates,
                storage_location, storage_conditions, shelf_life_days
            } = req.body;

            // Generate item code
            const item_code = await generateItemCode(item_type);

            const [result] = await db.execute(`
                INSERT INTO inventory_items (
                    item_code, item_name, description, category_id, unit_id, item_type,
                    minimum_stock, maximum_stock, reorder_point, reorder_quantity,
                    standard_cost, weight_per_unit, dimensions_length, dimensions_width, dimensions_height,
                    track_serial_numbers, track_batch_numbers, track_expiry_dates,
                    storage_location, storage_conditions, shelf_life_days, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item_code, item_name, description, category_id, unit_id, item_type,
                minimum_stock || 0, maximum_stock, reorder_point || 0, reorder_quantity || 0,
                standard_cost || 0, weight_per_unit, dimensions_length, dimensions_width, dimensions_height,
                track_serial_numbers || false, track_batch_numbers || false, track_expiry_dates || false,
                storage_location, storage_conditions, shelf_life_days, req.user.id
            ]);

            res.status(201).json({
                success: true,
                message: 'Inventory item created successfully',
                data: {
                    id: result.insertId,
                    item_code
                }
            });
        } catch (error) {
            console.error('Error creating inventory item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create inventory item',
                error: error.message
            });
        }
    }

    // Update inventory item
    async updateItem(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Remove fields that shouldn't be updated directly
            delete updateData.id;
            delete updateData.item_code;
            delete updateData.current_stock;
            delete updateData.reserved_stock;
            delete updateData.created_at;
            delete updateData.created_by;

            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            
            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
            }

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            
            await db.execute(
                `UPDATE inventory_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [...values, id]
            );

            res.json({
                success: true,
                message: 'Inventory item updated successfully'
            });
        } catch (error) {
            console.error('Error updating inventory item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update inventory item',
                error: error.message
            });
        }
    }

    // Create stock transaction
    async createTransaction(req, res) {
        try {
            const {
                item_id, transaction_type, reference_type, reference_id, reference_number,
                quantity, unit_cost, batch_number, serial_number, expiry_date,
                from_location, to_location, warehouse_location, remarks
            } = req.body;

            // Get current stock
            const [currentItem] = await db.execute(
                'SELECT current_stock, average_cost FROM inventory_items WHERE id = ?',
                [item_id]
            );

            if (currentItem.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }

            const stock_before = parseFloat(currentItem[0].current_stock);
            const current_avg_cost = parseFloat(currentItem[0].average_cost);
            
            // Calculate new stock level
            let stock_after;
            const qty = parseFloat(quantity);
            
            if (['purchase_receipt', 'production_receipt', 'return_receipt', 'opening_stock', 'stock_adjustment'].includes(transaction_type)) {
                if (transaction_type === 'stock_adjustment') {
                    // For adjustments, quantity can be negative
                    stock_after = stock_before + qty;
                } else {
                    // Positive transactions (receipts)
                    stock_after = stock_before + Math.abs(qty);
                }
            } else {
                // Negative transactions (issues)
                stock_after = stock_before - Math.abs(qty);
            }

            if (stock_after < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock for this transaction'
                });
            }

            // Generate transaction code
            const transaction_code = await generateTransactionCode(transaction_type);

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Insert transaction record
                const [transResult] = await db.execute(`
                    INSERT INTO inventory_transactions (
                        transaction_code, item_id, transaction_type, reference_type, reference_id, reference_number,
                        quantity, unit_cost, stock_before, stock_after, batch_number, serial_number, expiry_date,
                        from_location, to_location, warehouse_location, remarks, created_by, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
                `, [
                    transaction_code, item_id, transaction_type, reference_type, reference_id, reference_number,
                    quantity, unit_cost || 0, stock_before, stock_after, batch_number, serial_number, expiry_date,
                    from_location, to_location, warehouse_location, remarks, req.user.id
                ]);

                // Calculate new average cost for receipts
                let new_average_cost = current_avg_cost;
                if (['purchase_receipt', 'production_receipt'].includes(transaction_type) && unit_cost > 0) {
                    const total_value_before = stock_before * current_avg_cost;
                    const transaction_value = Math.abs(qty) * unit_cost;
                    const total_value_after = total_value_before + transaction_value;
                    
                    if (stock_after > 0) {
                        new_average_cost = total_value_after / stock_after;
                    }
                }

                // Update item stock and average cost
                await db.execute(`
                    UPDATE inventory_items 
                    SET current_stock = ?, average_cost = ?, last_purchase_cost = CASE 
                        WHEN ? = 'purchase_receipt' THEN ? 
                        ELSE last_purchase_cost 
                    END
                    WHERE id = ?
                `, [stock_after, new_average_cost, transaction_type, unit_cost || 0, item_id]);

                await db.execute('COMMIT');

                res.status(201).json({
                    success: true,
                    message: 'Stock transaction created successfully',
                    data: {
                        id: transResult.insertId,
                        transaction_code,
                        stock_before,
                        stock_after
                    }
                });
            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error creating stock transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create stock transaction',
                error: error.message
            });
        }
    }

    // Get reorder report
    async getReorderReport(req, res) {
        try {
            const [items] = await db.execute(`
                SELECT 
                    i.id, i.item_code, i.item_name, c.category_name,
                    i.current_stock, i.reorder_point, i.reorder_quantity,
                    (i.reorder_point - i.current_stock) as shortage_quantity,
                    v.vendor_name as preferred_vendor,
                    iv.lead_time_days, iv.unit_cost as vendor_cost,
                    iv.minimum_order_quantity
                FROM inventory_items i
                LEFT JOIN inventory_categories c ON i.category_id = c.id
                LEFT JOIN inventory_item_vendors iv ON i.id = iv.item_id AND iv.is_preferred = TRUE
                LEFT JOIN inventory_vendors v ON iv.vendor_id = v.id
                WHERE i.current_stock <= i.reorder_point AND i.is_active = TRUE
                ORDER BY (i.reorder_point - i.current_stock) DESC
            `);

            res.json({
                success: true,
                data: items,
                count: items.length
            });
        } catch (error) {
            console.error('Error fetching reorder report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch reorder report',
                error: error.message
            });
        }
    }

    // Get categories
    async getCategories(req, res) {
        try {
            const [categories] = await db.execute(`
                SELECT * FROM inventory_categories 
                WHERE is_active = TRUE 
                ORDER BY category_name
            `);

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: error.message
            });
        }
    }

    // Get units
    async getUnits(req, res) {
        try {
            const [units] = await db.execute(`
                SELECT * FROM inventory_units 
                WHERE is_active = TRUE 
                ORDER BY unit_name
            `);

            res.json({
                success: true,
                data: units
            });
        } catch (error) {
            console.error('Error fetching units:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch units',
                error: error.message
            });
        }
    }

    // Get stock transactions
    async getTransactions(req, res) {
        try {
            const { item_id, transaction_type, page = 1, limit = 20 } = req.query;
            
            const whereConditions = [];
            const params = [];

            if (item_id) {
                whereConditions.push('t.item_id = ?');
                params.push(item_id);
            }

            if (transaction_type) {
                whereConditions.push('t.transaction_type = ?');
                params.push(transaction_type);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const offset = (page - 1) * limit;

            const [transactions] = await db.execute(`
                SELECT 
                    t.*, i.item_name, i.item_code, u.username as created_by_name
                FROM inventory_transactions t
                JOIN inventory_items i ON t.item_id = i.id
                LEFT JOIN users u ON t.created_by = u.id
                ${whereClause}
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM inventory_transactions t
                ${whereClause}
            `;
            const [totalResult] = await db.execute(countQuery, params);

            res.json({
                success: true,
                data: transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult[0].total,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions',
                error: error.message
            });
        }
    }

    // Get inventory batches with filters
    async getBatches(req, res) {
        try {
            const { location_id, product_id, status = 'active', sort_by = 'purchase_date' } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (location_id && location_id !== '0') {
                whereClause += ' AND b.location_id = ?';
                params.push(location_id);
            }
            
            if (product_id && product_id !== '0') {
                whereClause += ' AND b.product_id = ?';
                params.push(product_id);
            }
            
            if (status && status !== 'all') {
                whereClause += ' AND b.status = ?';
                params.push(status);
            }
            
            // Validate sort_by to prevent SQL injection
            const validSortColumns = ['purchase_date', 'expiry_date', 'batch_value', 'available_quantity'];
            const orderBy = validSortColumns.includes(sort_by) ? sort_by : 'purchase_date';
            
            const [batches] = await db.execute(`
                SELECT 
                    b.id,
                    b.batch_number,
                    b.product_id,
                    p.name as product_name,
                    p.product_code,
                    b.location_id,
                    l.name as location_name,
                    s.company_name as supplier_name,
                    b.purchase_date,
                    b.purchase_price,
                    b.received_quantity,
                    b.consumed_quantity,
                    b.available_quantity,
                    (b.available_quantity * b.purchase_price) as batch_value,
                    b.expiry_date,
                    b.status,
                    DATEDIFF(b.expiry_date, CURDATE()) as days_to_expiry
                FROM inventory_batches b
                LEFT JOIN products p ON b.product_id = p.id
                LEFT JOIN locations l ON b.location_id = l.id
                LEFT JOIN suppliers s ON b.supplier_id = s.id
                ${whereClause}
                ORDER BY b.${orderBy} ASC
            `, params);

            res.json({
                success: true,
                data: batches
            });
        } catch (error) {
            console.error('Error fetching inventory batches:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch inventory batches',
                error: error.message
            });
        }
    }

    // Get costing summary for different methods
    async getCostingSummary(req, res) {
        try {
            const { location_id, product_id } = req.query;
            
            let whereClause = 'WHERE p.is_active = TRUE';
            const params = [];
            
            if (location_id && location_id !== '0') {
                whereClause += ' AND l.id = ?';
                params.push(location_id);
            }
            
            if (product_id && product_id !== '0') {
                whereClause += ' AND p.id = ?';
                params.push(product_id);
            }
            
            const [costingSummary] = await db.execute(`
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    p.product_code,
                    l.id as location_id,
                    l.name as location_name,
                    
                    -- FIFO Cost (oldest batch first)
                    COALESCE((
                        SELECT purchase_price 
                        FROM inventory_batches ib 
                        WHERE ib.product_id = p.id AND ib.location_id = l.id 
                        AND ib.available_quantity > 0 AND ib.status = 'active'
                        ORDER BY ib.purchase_date ASC, ib.id ASC 
                        LIMIT 1
                    ), 0) as fifo_cost,
                    
                    -- LIFO Cost (newest batch first)
                    COALESCE((
                        SELECT purchase_price 
                        FROM inventory_batches ib 
                        WHERE ib.product_id = p.id AND ib.location_id = l.id 
                        AND ib.available_quantity > 0 AND ib.status = 'active'
                        ORDER BY ib.purchase_date DESC, ib.id DESC 
                        LIMIT 1
                    ), 0) as lifo_cost,
                    
                    -- Average Cost (weighted average)
                    COALESCE((
                        SELECT SUM(ib.available_quantity * ib.purchase_price) / SUM(ib.available_quantity)
                        FROM inventory_batches ib 
                        WHERE ib.product_id = p.id AND ib.location_id = l.id 
                        AND ib.available_quantity > 0 AND ib.status = 'active'
                    ), 0) as average_cost,
                    
                    -- Last Cost (most recent purchase)
                    COALESCE((
                        SELECT purchase_price 
                        FROM inventory_batches ib 
                        WHERE ib.product_id = p.id AND ib.location_id = l.id
                        ORDER BY ib.purchase_date DESC, ib.id DESC 
                        LIMIT 1
                    ), 0) as last_cost,
                    
                    -- Total quantity and value
                    COALESCE(SUM(ib.available_quantity), 0) as total_quantity,
                    COALESCE(SUM(ib.available_quantity * ib.purchase_price), 0) as total_value
                    
                FROM products p
                CROSS JOIN locations l
                LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND l.id = ib.location_id AND ib.status = 'active'
                ${whereClause}
                GROUP BY p.id, l.id
                HAVING total_quantity > 0
                ORDER BY p.name, l.name
            `, params);

            res.json({
                success: true,
                data: costingSummary
            });
        } catch (error) {
            console.error('Error fetching costing summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch costing summary',
                error: error.message
            });
        }
    }

    // Get available serial numbers for a product
    async getAvailableSerialNumbers(req, res) {
        try {
            const { product_id, location_id } = req.query;
            
            if (!product_id || !location_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID and Location ID are required'
                });
            }
            
            const [serialNumbers] = await db.execute(`
                SELECT 
                    sn.id,
                    sn.serial_number,
                    sn.warranty_end_date,
                    sn.warranty_status,
                    sn.condition_status,
                    sn.status,
                    
                    -- Batch and Cost Information
                    ib.purchase_price as unit_cost,
                    ib.batch_number,
                    ib.purchase_date,
                    
                    -- Performance Data
                    COALESCE(snp.performance_rating, 'unrated') as performance_rating,
                    COALESCE(snp.failure_count, 0) as failure_count,
                    snp.customer_satisfaction,
                    
                    -- Availability Status
                    CASE 
                        WHEN sn.status != 'available' THEN 'NOT_AVAILABLE'
                        WHEN sn.warranty_status = 'expired' THEN 'WARRANTY_EXPIRED'
                        WHEN DATEDIFF(sn.warranty_end_date, CURDATE()) < 30 THEN 'WARRANTY_EXPIRING'
                        ELSE 'AVAILABLE'
                    END as availability_status,
                    
                    -- Compatibility Score (simple scoring based on performance and failures)
                    CASE 
                        WHEN snp.performance_rating = 'excellent' AND snp.failure_count = 0 THEN 100
                        WHEN snp.performance_rating = 'excellent' THEN 90
                        WHEN snp.performance_rating = 'good' AND snp.failure_count = 0 THEN 80
                        WHEN snp.performance_rating = 'good' THEN 70
                        WHEN snp.performance_rating = 'average' THEN 60
                        WHEN snp.performance_rating = 'poor' THEN 30
                        ELSE 50
                    END as compatibility_score
                    
                FROM inventory_serial_numbers sn
                LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
                    AND DATE(sn.purchase_date) = DATE(ib.purchase_date)
                    AND sn.location_id = ib.location_id
                LEFT JOIN serial_number_performance snp ON sn.id = snp.serial_number_id
                
                WHERE sn.product_id = ? 
                AND sn.location_id = ?
                AND sn.status IN ('available', 'reserved')
                
                ORDER BY 
                    sn.status DESC, -- Available first, then reserved
                    compatibility_score DESC,
                    sn.warranty_end_date DESC
            `, [product_id, location_id]);

            res.json({
                success: true,
                data: serialNumbers
            });
        } catch (error) {
            console.error('Error fetching available serial numbers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch available serial numbers',
                error: error.message
            });
        }
    }

    // Allocate serial numbers to estimation
    async allocateSerialNumbers(req, res) {
        try {
            const { 
                estimation_id, 
                estimation_item_id, 
                serial_allocations,
                allocated_by 
            } = req.body;
            
            if (!estimation_id || !estimation_item_id || !serial_allocations || !Array.isArray(serial_allocations)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request data'
                });
            }
            
            // Start transaction
            await db.execute('START TRANSACTION');
            
            try {
                // Get estimation details
                const [estimationDetails] = await db.execute(`
                    SELECT e.location_id, ei.product_id 
                    FROM estimations e 
                    JOIN estimation_items ei ON e.id = ei.estimation_id 
                    WHERE ei.id = ?
                `, [estimation_item_id]);
                
                if (estimationDetails.length === 0) {
                    throw new Error('Estimation item not found');
                }
                
                const { location_id, product_id } = estimationDetails[0];
                
                // Process each serial allocation
                for (const allocation of serial_allocations) {
                    const { 
                        serial_number_id, 
                        unit_cost, 
                        allocation_reason = 'technical_compatibility',
                        technical_specification = ''
                    } = allocation;
                    
                    // Get serial number details
                    const [serialDetails] = await db.execute(`
                        SELECT serial_number, warranty_start_date, warranty_end_date
                        FROM inventory_serial_numbers 
                        WHERE id = ? AND status = 'available'
                    `, [serial_number_id]);
                    
                    if (serialDetails.length === 0) {
                        throw new Error(`Serial number ID ${serial_number_id} not available`);
                    }
                    
                    const serialData = serialDetails[0];
                    
                    // Create allocation record
                    await db.execute(`
                        INSERT INTO estimation_serial_allocations (
                            estimation_id, estimation_item_id, product_id, location_id,
                            serial_number_id, serial_number, unit_cost,
                            allocation_reason, technical_specification,
                            warranty_start_date, warranty_end_date,
                            allocated_by, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tentative')
                    `, [
                        estimation_id, estimation_item_id, product_id, location_id,
                        serial_number_id, serialData.serial_number, unit_cost,
                        allocation_reason, technical_specification,
                        serialData.warranty_start_date, serialData.warranty_end_date,
                        allocated_by || req.user?.id
                    ]);
                    
                    // Update serial number status to reserved
                    await db.execute(`
                        UPDATE inventory_serial_numbers 
                        SET status = 'reserved', reserved_for = 'estimation', reserved_for_id = ?
                        WHERE id = ?
                    `, [estimation_id, serial_number_id]);
                }
                
                // Update estimation item allocation type
                await db.execute(`
                    UPDATE estimation_items 
                    SET allocation_type = 'specific_serial'
                    WHERE id = ?
                `, [estimation_item_id]);
                
                await db.execute('COMMIT');
                
                res.json({
                    success: true,
                    message: 'Serial numbers allocated successfully',
                    data: {
                        estimation_id,
                        estimation_item_id,
                        allocated_count: serial_allocations.length
                    }
                });
                
            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }
            
        } catch (error) {
            console.error('Error allocating serial numbers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to allocate serial numbers',
                error: error.message
            });
        }
    }

    // Reserve inventory for quotation
    async reserveInventory(req, res) {
        try {
            const {
                reservation_type = 'estimation',
                reference_id,
                reference_line_id,
                product_id,
                location_id,
                reserved_quantity,
                pricing_method = 'fifo',
                reserved_by
            } = req.body;
            
            if (!reference_id || !product_id || !location_id || !reserved_quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }
            
            // Calculate estimated unit cost based on pricing method
            let estimatedCostQuery;
            switch (pricing_method) {
                case 'fifo':
                    estimatedCostQuery = `
                        SELECT purchase_price as cost
                        FROM inventory_batches
                        WHERE product_id = ? AND location_id = ? 
                        AND available_quantity > 0 AND status = 'active'
                        ORDER BY purchase_date ASC, id ASC
                        LIMIT 1
                    `;
                    break;
                case 'lifo':
                    estimatedCostQuery = `
                        SELECT purchase_price as cost
                        FROM inventory_batches
                        WHERE product_id = ? AND location_id = ?
                        AND available_quantity > 0 AND status = 'active'
                        ORDER BY purchase_date DESC, id DESC
                        LIMIT 1
                    `;
                    break;
                case 'average':
                    estimatedCostQuery = `
                        SELECT 
                            SUM(available_quantity * purchase_price) / SUM(available_quantity) as cost
                        FROM inventory_batches
                        WHERE product_id = ? AND location_id = ?
                        AND available_quantity > 0 AND status = 'active'
                    `;
                    break;
                default:
                    estimatedCostQuery = `
                        SELECT purchase_price as cost
                        FROM inventory_batches
                        WHERE product_id = ? AND location_id = ?
                        ORDER BY purchase_date ASC, id ASC
                        LIMIT 1
                    `;
            }
            
            const [costResult] = await db.execute(estimatedCostQuery, [product_id, location_id]);
            const estimated_unit_cost = costResult.length > 0 ? costResult[0].cost : 0;
            
            // Set expiry time (default 72 hours)
            const expires_at = new Date();
            expires_at.setHours(expires_at.getHours() + 72);
            
            // Create reservation
            const [result] = await db.execute(`
                INSERT INTO inventory_reservations (
                    reservation_type, reference_id, reference_line_id,
                    product_id, location_id, reserved_quantity,
                    pricing_method, estimated_unit_cost, expires_at,
                    reserved_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `, [
                reservation_type, reference_id, reference_line_id,
                product_id, location_id, reserved_quantity,
                pricing_method, estimated_unit_cost, expires_at,
                reserved_by || req.user?.id
            ]);
            
            res.json({
                success: true,
                message: 'Inventory reserved successfully',
                data: {
                    reservation_id: result.insertId,
                    estimated_unit_cost,
                    expires_at
                }
            });
            
        } catch (error) {
            console.error('Error reserving inventory:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reserve inventory',
                error: error.message
            });
        }
    }
}

module.exports = new InventoryController();
