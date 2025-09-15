const db = require('../config/database');

class StockAvailabilityController {
    // Check stock availability for a single product
    async checkStockAvailability(req, res) {
        try {
            const { productId, requiredQuantity, locationId } = req.query;
            
            if (!productId || !requiredQuantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID and required quantity are required'
                });
            }

            // Get product information
            const [productRows] = await db.execute(
                'SELECT name, unit FROM products WHERE id = ?',
                [productId]
            );

            if (productRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const product = productRows[0];

            // Get stock information by location
            let stockQuery = `
                SELECT 
                    l.id as location_id,
                    l.name as location_name,
                    COALESCE(s.quantity, 0) as current_stock,
                    COALESCE(reserved.reserved_qty, 0) as reserved_stock,
                    (COALESCE(s.quantity, 0) - COALESCE(reserved.reserved_qty, 0)) as available_stock
                FROM locations l
                LEFT JOIN stock s ON l.id = s.location_id AND s.product_id = ?
                LEFT JOIN (
                    SELECT 
                        location_id,
                        SUM(quantity) as reserved_qty
                    FROM stock_movements 
                    WHERE product_id = ? 
                    AND movement_type = 'reserved'
                    AND movement_date >= CURDATE()
                    GROUP BY location_id
                ) reserved ON l.id = reserved.location_id
                WHERE l.status = 'active'
            `;

            let stockParams = [productId, productId];

            if (locationId) {
                stockQuery += ' AND l.id = ?';
                stockParams.push(locationId);
            }

            const [stockRows] = await db.execute(stockQuery, stockParams);

            // Calculate totals
            const totalStock = stockRows.reduce((sum, row) => sum + row.current_stock, 0);
            const totalReserved = stockRows.reduce((sum, row) => sum + row.reserved_stock, 0);
            const totalAvailable = stockRows.reduce((sum, row) => sum + row.available_stock, 0);

            const isAvailable = totalAvailable >= parseInt(requiredQuantity);
            const shortfall = Math.max(0, parseInt(requiredQuantity) - totalAvailable);

            // Get reorder information
            const [reorderRows] = await db.execute(`
                SELECT 
                    p.minimum_stock,
                    p.reorder_point,
                    p.reorder_quantity,
                    iv.vendor_name as preferred_supplier,
                    iv.lead_time_days,
                    iv.unit_cost
                FROM products p
                LEFT JOIN inventory_item_vendors iiv ON p.id = iiv.item_id AND iiv.is_preferred = TRUE
                LEFT JOIN inventory_vendors iv ON iiv.vendor_id = iv.id
                WHERE p.id = ?
            `, [productId]);

            const reorderInfo = reorderRows.length > 0 ? {
                minimumStock: reorderRows[0].minimum_stock,
                reorderPoint: reorderRows[0].reorder_point,
                reorderQuantity: reorderRows[0].reorder_quantity,
                preferredSupplier: reorderRows[0].preferred_supplier,
                leadTimeDays: reorderRows[0].lead_time_days,
                unitCost: reorderRows[0].unit_cost
            } : null;

            // Format location breakdown
            const locationBreakdown = stockRows.map(row => ({
                locationId: row.location_id,
                locationName: row.location_name,
                currentStock: row.current_stock,
                reservedStock: row.reserved_stock,
                availableStock: row.available_stock
            }));

            res.json({
                success: true,
                stockInfo: {
                    productId: parseInt(productId),
                    productName: product.name,
                    unit: product.unit,
                    requiredQuantity: parseInt(requiredQuantity),
                    totalStock,
                    totalReserved,
                    totalAvailable,
                    isAvailable,
                    shortfall,
                    locationBreakdown,
                    reorderInfo
                }
            });

        } catch (error) {
            console.error('Error checking stock availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking stock availability',
                error: error.message
            });
        }
    }

    // Check stock availability for multiple products (bulk check)
    async bulkStockCheck(req, res) {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Items array is required'
                });
            }

            const stockResults = {};

            for (const item of items) {
                const { productId, requiredQuantity, locationId } = item;

                if (!productId || !requiredQuantity) {
                    continue;
                }

                try {
                    // Get stock for this product
                    let stockQuery = `
                        SELECT 
                            COALESCE(SUM(s.quantity), 0) as total_stock,
                            COALESCE(SUM(reserved.reserved_qty), 0) as total_reserved
                        FROM inventory_warehouse_stock s
                        LEFT JOIN (
                            SELECT 
                                location_id,
                                SUM(quantity) as reserved_qty
                            FROM stock_movements 
                            WHERE product_id = ? 
                            AND movement_type = 'reserved'
                            AND movement_date >= CURDATE()
                            GROUP BY location_id
                        ) reserved ON s.location_id = reserved.location_id
                        WHERE s.product_id = ?
                    `;

                    let params = [productId, productId];

                    if (locationId) {
                        stockQuery += ' AND s.location_id = ?';
                        params.push(locationId);
                    }

                    const [stockRows] = await db.execute(stockQuery, params);
                    
                    const totalStock = stockRows[0]?.total_stock || 0;
                    const totalReserved = stockRows[0]?.total_reserved || 0;
                    const availableStock = totalStock - totalReserved;
                    const isAvailable = availableStock >= requiredQuantity;
                    const shortfall = Math.max(0, requiredQuantity - availableStock);

                    stockResults[productId] = {
                        productId,
                        requiredQuantity,
                        totalStock,
                        availableStock,
                        isAvailable,
                        shortfall
                    };

                } catch (itemError) {
                    console.error(`Error checking stock for product ${productId}:`, itemError);
                    stockResults[productId] = {
                        productId,
                        requiredQuantity,
                        error: 'Failed to check stock'
                    };
                }
            }

            res.json({
                success: true,
                stockResults
            });

        } catch (error) {
            console.error('Error in bulk stock check:', error);
            res.status(500).json({
                success: false,
                message: 'Error in bulk stock check',
                error: error.message
            });
        }
    }

    // Get low stock items (below reorder point)
    async getLowStockItems(req, res) {
        try {
            const { locationId } = req.query;

            let query = `
                SELECT 
                    p.id,
                    p.name,
                    p.part_code,
                    p.unit,
                    p.reorder_point,
                    p.reorder_quantity,
                    p.minimum_stock,
                    c.name as category_name,
                    COALESCE(stock_summary.total_stock, 0) as current_stock,
                    COALESCE(stock_summary.available_stock, 0) as available_stock,
                    (p.reorder_point - COALESCE(stock_summary.available_stock, 0)) as shortage_qty,
                    iv.vendor_name as preferred_supplier,
                    iiv.lead_time_days,
                    iiv.unit_cost
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN (
                    SELECT 
                        s.product_id,
                        SUM(s.quantity) as total_stock,
                        SUM(s.quantity - COALESCE(reserved.reserved_qty, 0)) as available_stock
                    FROM inventory_warehouse_stock s
                    LEFT JOIN (
                        SELECT 
                            product_id,
                            location_id,
                            SUM(quantity) as reserved_qty
                        FROM stock_movements 
                        WHERE movement_type = 'reserved'
                        AND movement_date >= CURDATE()
                        GROUP BY product_id, location_id
                    ) reserved ON s.product_id = reserved.product_id AND s.location_id = reserved.location_id
                    ${locationId ? 'WHERE s.location_id = ?' : ''}
                    GROUP BY s.product_id
                ) stock_summary ON p.id = stock_summary.product_id
                LEFT JOIN inventory_item_vendors iiv ON p.id = iiv.item_id AND iiv.is_preferred = TRUE
                LEFT JOIN inventory_vendors iv ON iiv.vendor_id = iv.id
                WHERE p.reorder_point > 0 
                AND COALESCE(stock_summary.available_stock, 0) <= p.reorder_point
                ORDER BY (p.reorder_point - COALESCE(stock_summary.available_stock, 0)) DESC
            `;

            const params = locationId ? [locationId] : [];
            const [rows] = await db.execute(query, params);

            res.json({
                success: true,
                lowStockItems: rows
            });

        } catch (error) {
            console.error('Error getting low stock items:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting low stock items',
                error: error.message
            });
        }
    }

    // Reserve stock for estimation/quotation
    async reserveStock(req, res) {
        try {
            const { items, referenceType, referenceId, userId } = req.body;

            if (!items || !Array.isArray(items) || !referenceType || !referenceId || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Items, reference type, reference ID, and user ID are required'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                const reservationResults = [];

                for (const item of items) {
                    const { productId, quantity, locationId } = item;

                    // Check if enough stock is available
                    const [stockCheck] = await db.execute(`
                        SELECT 
                            COALESCE(s.quantity, 0) as current_stock,
                            COALESCE(reserved.reserved_qty, 0) as reserved_stock
                        FROM inventory_warehouse_stock s
                        LEFT JOIN (
                            SELECT 
                                SUM(quantity) as reserved_qty
                            FROM stock_movements 
                            WHERE product_id = ? AND location_id = ?
                            AND movement_type = 'reserved'
                            AND movement_date >= CURDATE()
                        ) reserved ON 1=1
                        WHERE s.product_id = ? AND s.location_id = ?
                    `, [productId, locationId, productId, locationId]);

                    const availableStock = (stockCheck[0]?.current_stock || 0) - (stockCheck[0]?.reserved_stock || 0);

                    if (availableStock >= quantity) {
                        // Create reservation entry
                        await db.execute(`
                            INSERT INTO stock_movements 
                            (product_id, to_location_id, quantity, movement_type, reference_type, reference_id, movement_date, created_by)
                            VALUES (?, ?, ?, 'reserved', ?, ?, NOW(), ?)
                        `, [productId, locationId, quantity, referenceType, referenceId, userId]);

                        reservationResults.push({
                            productId,
                            quantity,
                            locationId,
                            status: 'reserved'
                        });
                    } else {
                        reservationResults.push({
                            productId,
                            quantity,
                            locationId,
                            status: 'insufficient_stock',
                            availableStock
                        });
                    }
                }

                await db.execute('COMMIT');

                res.json({
                    success: true,
                    message: 'Stock reservation completed',
                    reservationResults
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Error reserving stock:', error);
            res.status(500).json({
                success: false,
                message: 'Error reserving stock',
                error: error.message
            });
        }
    }

    // Release reserved stock
    async releaseReservedStock(req, res) {
        try {
            const { referenceType, referenceId } = req.body;

            if (!referenceType || !referenceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Reference type and reference ID are required'
                });
            }

            const [result] = await db.execute(`
                DELETE FROM stock_movements 
                WHERE movement_type = 'reserved' 
                AND reference_type = ? 
                AND reference_id = ?
            `, [referenceType, referenceId]);

            res.json({
                success: true,
                message: 'Reserved stock released successfully',
                releasedCount: result.affectedRows
            });

        } catch (error) {
            console.error('Error releasing reserved stock:', error);
            res.status(500).json({
                success: false,
                message: 'Error releasing reserved stock',
                error: error.message
            });
        }
    }
}

module.exports = new StockAvailabilityController();
