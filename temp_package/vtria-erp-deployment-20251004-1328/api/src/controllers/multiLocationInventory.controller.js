const moment = require('moment');

// Generate unique transfer number
async function generateTransferNumber(connection) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    try {
        // Get the next sequence number for this month
        const [rows] = await connection.execute(
            `SELECT COUNT(*) as count FROM inter_store_transfers 
             WHERE DATE_FORMAT(created_at, '%Y%m') = ?`,
            [`${year}${month}`]
        );
        
        const sequence = String((rows[0]?.count || 0) + 1).padStart(4, '0');
        return `TRF/${year}${month}/${sequence}`;
    } catch (error) {
        console.error('Error generating transfer number:', error);
        // Fallback to a simple timestamp-based number
        const timestamp = Date.now();
        return `TRF/${year}${month}/${String(timestamp).slice(-4)}`;
    }
}

class MultiLocationInventoryController {

    // Get stock levels across all locations
    async getStockByLocation(req, res) {
        try {
            const { productId } = req.params;
            
            const query = `
                SELECT 
                    s.*,
                    w.warehouse_name,
                    w.address as warehouse_address,
                    l.name as location_name,
                    l.city as location_city,
                    p.name as product_name,
                    p.product_code as product_sku
                FROM inventory_warehouse_stock s
                LEFT JOIN inventory_warehouses w ON s.warehouse_id = w.id
                LEFT JOIN locations l ON w.location_id = l.id
                LEFT JOIN products p ON s.item_id = p.id
                WHERE s.item_id = ?
                ORDER BY l.name, w.warehouse_name
            `;
            
            const [rows] = await req.db.execute(query, [productId]);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching stock by location:', error);
            res.status(500).json({ error: 'Failed to fetch stock data' });
        }
    }
    
    // Get all locations with their stock summary
    async getLocationStockSummary(req, res) {
        try {
            const query = `
                SELECT 
                    l.id,
                    l.name,
                    l.city,
                    l.state,
                    l.address,
                    COUNT(DISTINCT s.item_id) as total_products,
                    SUM(s.current_stock) as total_quantity,
                    SUM(s.reserved_stock) as reserved_quantity,
                    SUM(s.available_stock) as available_quantity,
                    COUNT(DISTINCT w.id) as total_warehouses
                FROM locations l
                LEFT JOIN inventory_warehouses w ON l.id = w.location_id AND w.is_active = 1
                LEFT JOIN inventory_warehouse_stock s ON w.id = s.warehouse_id
                WHERE l.status = 'active'
                GROUP BY l.id, l.name, l.city, l.state, l.address
                ORDER BY l.name
            `;
            
            const [rows] = await req.db.execute(query);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching location stock summary:', error);
            res.status(500).json({ error: 'Failed to fetch location summary' });
        }
    }
    
    // Create inter-store transfer request
    async createTransferRequest(req, res) {
        const connection = await req.db.getConnection();
        
        try {
            const {
                from_location_id,
                to_location_id,
                items,
                reason,
                notes,
                priority = 'normal'
            } = req.body;
            
            const user_id = req.user.id; // Get from auth middleware
            
            // Generate transfer number
            const transferNumber = await generateTransferNumber(connection);
            
            // Start transaction
            await connection.beginTransaction();
            
            try {
                // Create transfer request
                const transferQuery = `
                    INSERT INTO inter_store_transfers 
                    (transfer_number, from_location_id, to_location_id, status, 
                     reason, priority, requested_by, requested_at)
                    VALUES (?, ?, ?, 'pending', ?, ?, ?, NOW())
                `;
                
                const [transferResult] = await connection.execute(transferQuery, [
                    transferNumber,
                    from_location_id,
                    to_location_id,
                    reason || notes || 'Transfer request',
                    priority,
                    user_id
                ]);
                
                const transferId = transferResult.insertId;
                
                // Add transfer items
                for (const item of items) {
                    const itemQuery = `
                        INSERT INTO inter_store_transfer_items 
                        (transfer_id, product_id, requested_quantity, unit_cost)
                        VALUES (?, ?, ?, ?)
                    `;
                    
                    await connection.execute(itemQuery, [
                        transferId,
                        item.product_id,
                        item.quantity,
                        item.unit_cost || 0
                    ]);
                }
                
                await connection.commit();
                
                res.json({
                    success: true,
                    message: 'Transfer request created successfully',
                    transfer_id: transferId,
                    transfer_number: transferNumber
                });
                
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Error creating transfer request:', error);
            res.status(500).json({ error: 'Failed to create transfer request' });
        }
    }
    
    // Get transfer requests
    async getTransferRequests(req, res) {
        try {
            const { status, location_id } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (status) {
                whereClause += ' AND ist.status = ?';
                params.push(status);
            }
            
            if (location_id) {
                whereClause += ' AND (ist.from_location_id = ? OR ist.to_location_id = ?)';
                params.push(location_id, location_id);
            }
            
            const query = `
                SELECT 
                    ist.*,
                    fl.name as from_location_name,
                    tl.name as to_location_name,
                    u.full_name as requested_by_name,
                    COUNT(isti.id) as item_count
                FROM inter_store_transfers ist
                LEFT JOIN locations fl ON ist.from_location_id = fl.id
                LEFT JOIN locations tl ON ist.to_location_id = tl.id
                LEFT JOIN users u ON ist.requested_by = u.id
                LEFT JOIN inter_store_transfer_items isti ON ist.id = isti.transfer_id
                ${whereClause}
                GROUP BY ist.id
                ORDER BY ist.requested_at DESC
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching transfer requests:', error);
            res.status(500).json({ error: 'Failed to fetch transfer requests' });
        }
    }
    
    // Get transfer request details
    async getTransferRequestDetails(req, res) {
        try {
            const { transferId } = req.params;
            
            // Get transfer header
            const headerQuery = `
                SELECT 
                    ist.*,
                    fl.name as from_location_name,
                    fl.address as from_location_address,
                    tl.name as to_location_name,
                    tl.address as to_location_address,
                    u.name as requested_by_name
                FROM inter_store_transfers ist
                LEFT JOIN locations fl ON ist.from_location_id = fl.id
                LEFT JOIN locations tl ON ist.to_location_id = tl.id
                LEFT JOIN users u ON ist.requested_by = u.id
                WHERE ist.id = ?
            `;
            
            const [headerRows] = await req.db.execute(headerQuery, [transferId]);
            
            if (headerRows.length === 0) {
                return res.status(404).json({ error: 'Transfer request not found' });
            }
            
            // Get transfer items
            const itemsQuery = `
                SELECT 
                    isti.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    p.unit,
                    s.quantity as available_quantity
                FROM inter_store_transfer_items isti
                LEFT JOIN products p ON isti.product_id = p.id
                LEFT JOIN stock s ON (isti.product_id = s.product_id AND s.location_id = ?)
                WHERE isti.transfer_id = ?
                ORDER BY p.name
            `;
            
            const [itemRows] = await req.db.execute(itemsQuery, [
                headerRows[0].from_location_id,
                transferId
            ]);
            
            res.json({
                success: true,
                data: {
                    header: headerRows[0],
                    items: itemRows
                }
            });
            
        } catch (error) {
            console.error('Error fetching transfer request details:', error);
            res.status(500).json({ error: 'Failed to fetch transfer details' });
        }
    }
    
    // Approve transfer request
    async approveTransfer(req, res) {
        try {
            const { transferId } = req.params;
            const { approved_by_notes } = req.body;
            const user_id = req.user.id;
            
            const query = `
                UPDATE inter_store_transfers 
                SET status = 'approved', 
                    approved_by = ?, 
                    approved_at = NOW(),
                    approved_by_notes = ?
                WHERE id = ? AND status = 'pending'
            `;
            
            const [result] = await req.db.execute(query, [
                user_id,
                approved_by_notes || null,
                transferId
            ]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Transfer request not found or already processed' });
            }
            
            res.json({
                success: true,
                message: 'Transfer request approved successfully'
            });
            
        } catch (error) {
            console.error('Error approving transfer:', error);
            res.status(500).json({ error: 'Failed to approve transfer' });
        }
    }
    
    // Execute transfer (move stock)
    async executeTransfer(req, res) {
        try {
            const { transferId } = req.params;
            const { shipped_items } = req.body;
            const user_id = req.user.id;
            
            // Start transaction
            await req.db.beginTransaction();
            
            try {
                // Get transfer details
                const transferQuery = `
                    SELECT * FROM inter_store_transfers 
                    WHERE id = ? AND status = 'approved'
                `;
                
                const [transferRows] = await req.db.execute(transferQuery, [transferId]);
                
                if (transferRows.length === 0) {
                    throw new Error('Transfer request not found or not approved');
                }
                
                const transfer = transferRows[0];
                
                // Process each shipped item
                for (const shippedItem of shipped_items) {
                    const { product_id, shipped_quantity } = shippedItem;
                    
                    // Reduce stock from source location
                    const reduceStockQuery = `
                        UPDATE stock 
                        SET quantity = quantity - ?,
                            last_updated = NOW()
                        WHERE product_id = ? AND location_id = ? AND quantity >= ?
                    `;
                    
                    const [reduceResult] = await req.db.execute(reduceStockQuery, [
                        shipped_quantity,
                        product_id,
                        transfer.from_location_id,
                        shipped_quantity
                    ]);
                    
                    if (reduceResult.affectedRows === 0) {
                        throw new Error(`Insufficient stock for product ID ${product_id}`);
                    }
                    
                    // Add stock to destination location (or create if doesn't exist)
                    const addStockQuery = `
                        INSERT INTO stock (product_id, location_id, quantity, last_updated)
                        VALUES (?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE 
                        quantity = quantity + VALUES(quantity),
                        last_updated = NOW()
                    `;
                    
                    await req.db.execute(addStockQuery, [
                        product_id,
                        transfer.to_location_id,
                        shipped_quantity
                    ]);
                    
                    // Update transfer item with shipped quantity
                    const updateItemQuery = `
                        UPDATE inter_store_transfer_items 
                        SET shipped_quantity = ?
                        WHERE transfer_id = ? AND product_id = ?
                    `;
                    
                    await req.db.execute(updateItemQuery, [
                        shipped_quantity,
                        transferId,
                        product_id
                    ]);
                }
                
                // Update transfer status
                const updateTransferQuery = `
                    UPDATE inter_store_transfers 
                    SET status = 'shipped',
                        shipped_by = ?,
                        shipped_at = NOW()
                    WHERE id = ?
                `;
                
                await req.db.execute(updateTransferQuery, [user_id, transferId]);
                
                await req.db.commit();
                
                res.json({
                    success: true,
                    message: 'Transfer executed successfully'
                });
                
            } catch (error) {
                await req.db.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error executing transfer:', error);
            res.status(500).json({ error: error.message || 'Failed to execute transfer' });
        }
    }
    
    // Get stock movement history
    async getStockMovementHistory(req, res) {
        try {
            const { productId, locationId, startDate, endDate } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (productId) {
                whereClause += ' AND sm.product_id = ?';
                params.push(productId);
            }
            
            if (locationId) {
                whereClause += ' AND sm.location_id = ?';
                params.push(locationId);
            }
            
            if (startDate) {
                whereClause += ' AND sm.movement_date >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                whereClause += ' AND sm.movement_date <= ?';
                params.push(endDate);
            }
            
            const query = `
                SELECT 
                    sm.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    l.name as location_name,
                    u.name as user_name
                FROM stock_movements sm
                LEFT JOIN products p ON sm.product_id = p.id
                LEFT JOIN locations l ON sm.location_id = l.id
                LEFT JOIN users u ON sm.user_id = u.id
                ${whereClause}
                ORDER BY sm.movement_date DESC, sm.id DESC
                LIMIT 100
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching stock movement history:', error);
            res.status(500).json({ error: 'Failed to fetch movement history' });
        }
    }
}

module.exports = new MultiLocationInventoryController();
