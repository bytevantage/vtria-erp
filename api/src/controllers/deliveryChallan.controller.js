const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

class DeliveryChallanController {
    // Create delivery challan
    async createDeliveryChallan(req, res) {
        try {
            const { 
                sales_order_id, 
                invoice_id, 
                client_id, 
                delivery_address,
                transport_mode,
                vehicle_number,
                items 
            } = req.body;
            
            const prepared_by = req.user?.id || 1; // Default for development
            
            // Generate DC number
            const dc_number = await generateDocumentId(DOCUMENT_TYPES.DELIVERY_CHALLAN);
            
            // Calculate total items
            const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
            
            // Insert DC
            const [result] = await db.execute(`
                INSERT INTO delivery_challans 
                (dc_number, sales_order_id, invoice_id, client_id, dc_date, delivery_address, 
                 transport_mode, vehicle_number, total_items, prepared_by) 
                VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
            `, [dc_number, sales_order_id, invoice_id, client_id, delivery_address,
                transport_mode, vehicle_number, total_items, prepared_by]);
            
            const dc_id = result.insertId;
            
            // Insert DC items
            if (items && items.length > 0) {
                const itemsQuery = `
                    INSERT INTO delivery_challan_items 
                    (dc_id, product_id, quantity, serial_numbers, from_location_id, notes) 
                    VALUES ?
                `;
                
                const itemsData = items.map(item => [
                    dc_id,
                    item.product_id,
                    item.quantity,
                    item.serial_numbers || null,
                    item.from_location_id,
                    item.notes || null
                ]);
                
                await db.query(itemsQuery, [itemsData]);
                
                // Update stock (reduce from dispatch location)
                for (const item of items) {
                    await db.execute(`
                        UPDATE stock 
                        SET quantity = quantity - ? 
                        WHERE product_id = ? AND location_id = ? AND quantity >= ?
                    `, [item.quantity, item.product_id, item.from_location_id, item.quantity]);
                    
                    // Record stock movement
                    await db.execute(`
                        INSERT INTO stock_movements 
                        (product_id, from_location_id, quantity, movement_type, reference_type, reference_id) 
                        VALUES (?, ?, ?, 'out', 'DC', ?)
                    `, [item.product_id, item.from_location_id, item.quantity, dc_number]);
                }
            }
            
            res.json({
                success: true,
                message: 'Delivery challan created successfully',
                data: { id: dc_id, dc_number }
            });
        } catch (error) {
            console.error('Error creating delivery challan:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating delivery challan',
                error: error.message
            });
        }
    }

    // Get all delivery challans
    async getAllDeliveryChallans(req, res) {
        try {
            const query = `
                SELECT 
                    dc.*,
                    c.company_name as client_name,
                    so.so_number,
                    i.invoice_number,
                    u.full_name as prepared_by_name,
                    d.full_name as dispatched_by_name
                FROM delivery_challans dc
                LEFT JOIN clients c ON dc.client_id = c.id
                LEFT JOIN sales_orders so ON dc.sales_order_id = so.id
                LEFT JOIN invoices i ON dc.invoice_id = i.id
                LEFT JOIN users u ON dc.prepared_by = u.id
                LEFT JOIN users d ON dc.dispatched_by = d.id
                ORDER BY dc.created_at DESC
            `;
            
            const [challans] = await db.execute(query);
            
            res.json({
                success: true,
                data: challans,
                count: challans.length
            });
        } catch (error) {
            console.error('Error fetching delivery challans:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching delivery challans',
                error: error.message
            });
        }
    }

    // Get delivery challan by ID
    async getDeliveryChallanById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    dc.*,
                    c.company_name as client_name,
                    c.address as client_address,
                    c.city as client_city,
                    c.state as client_state,
                    so.so_number,
                    i.invoice_number,
                    u.full_name as prepared_by_name
                FROM delivery_challans dc
                LEFT JOIN clients c ON dc.client_id = c.id
                LEFT JOIN sales_orders so ON dc.sales_order_id = so.id
                LEFT JOIN invoices i ON dc.invoice_id = i.id
                LEFT JOIN users u ON dc.prepared_by = u.id
                WHERE dc.id = ?
            `;
            
            const [challans] = await db.execute(query, [id]);
            
            if (challans.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Delivery challan not found'
                });
            }
            
            // Get DC items
            const itemsQuery = `
                SELECT 
                    dci.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.unit,
                    l.name as location_name
                FROM delivery_challan_items dci
                LEFT JOIN products p ON dci.product_id = p.id
                LEFT JOIN locations l ON dci.from_location_id = l.id
                WHERE dci.dc_id = ?
                ORDER BY dci.id
            `;
            
            const [items] = await db.execute(itemsQuery, [id]);
            
            res.json({
                success: true,
                data: {
                    ...challans[0],
                    items
                }
            });
        } catch (error) {
            console.error('Error fetching delivery challan:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching delivery challan',
                error: error.message
            });
        }
    }

    // Update delivery challan status
    async updateDeliveryChallanStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, lr_number, delivered_date, received_by_client } = req.body;
            const dispatched_by = req.user?.id || 1;
            
            let updateQuery = 'UPDATE delivery_challans SET status = ?';
            let updateParams = [status];
            
            if (status === 'dispatched') {
                updateQuery += ', dispatched_by = ?, lr_number = ?';
                updateParams.push(dispatched_by, lr_number);
            }
            
            if (status === 'delivered') {
                updateQuery += ', delivered_date = ?, received_by_client = ?';
                updateParams.push(delivered_date, received_by_client);
            }
            
            updateQuery += ' WHERE id = ?';
            updateParams.push(id);
            
            await db.execute(updateQuery, updateParams);
            
            res.json({
                success: true,
                message: 'Delivery challan status updated successfully'
            });
        } catch (error) {
            console.error('Error updating delivery challan status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating delivery challan status',
                error: error.message
            });
        }
    }
}

module.exports = new DeliveryChallanController();
