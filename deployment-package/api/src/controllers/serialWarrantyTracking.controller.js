const moment = require('moment');

class SerialWarrantyTrackingController {
    // Generate serial numbers for products
    async generateSerialNumbers(req, res) {
        try {
            const {
                product_id,
                quantity,
                batch_number,
                manufacturing_date,
                warranty_months = 12,
                location_id = 1
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            // Start transaction
            await req.db.beginTransaction();
            
            try {
                const serialNumbers = [];
                
                // Get product details for serial number generation
                const [productRows] = await req.db.execute(
                    'SELECT name, sku FROM products WHERE id = ?',
                    [product_id]
                );
                
                if (productRows.length === 0) {
                    throw new Error('Product not found');
                }
                
                const product = productRows[0];
                
                // Generate serial numbers
                for (let i = 0; i < quantity; i++) {
                    const serialNumber = await this.generateSerialNumber(req.db, product.sku);
                    const warrantyExpiry = moment(manufacturing_date)
                        .add(warranty_months, 'months')
                        .format('YYYY-MM-DD');
                    
                    const serialQuery = `
                        INSERT INTO product_serial_numbers 
                        (product_id, serial_number, batch_number, manufacturing_date, 
                         warranty_expiry_date, warranty_months, location_id, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'in_stock', ?)
                    `;
                    
                    const [result] = await req.db.execute(serialQuery, [
                        product_id,
                        serialNumber,
                        batch_number,
                        manufacturing_date,
                        warrantyExpiry,
                        warranty_months,
                        location_id,
                        user_id
                    ]);
                    
                    serialNumbers.push({
                        id: result.insertId,
                        serial_number: serialNumber,
                        warranty_expiry_date: warrantyExpiry
                    });
                }
                
                await req.db.commit();
                
                res.json({
                    success: true,
                    message: `Generated ${quantity} serial numbers`,
                    serial_numbers: serialNumbers
                });
                
            } catch (error) {
                await req.db.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error generating serial numbers:', error);
            res.status(500).json({ error: error.message || 'Failed to generate serial numbers' });
        }
    }
    
    // Get serial numbers for a product
    async getProductSerialNumbers(req, res) {
        try {
            const { productId } = req.params;
            const { status, location_id, batch_number } = req.query;
            
            let whereClause = 'WHERE psn.product_id = ?';
            const params = [productId];
            
            if (status) {
                whereClause += ' AND psn.status = ?';
                params.push(status);
            }
            
            if (location_id) {
                whereClause += ' AND psn.location_id = ?';
                params.push(location_id);
            }
            
            if (batch_number) {
                whereClause += ' AND psn.batch_number = ?';
                params.push(batch_number);
            }
            
            const query = `
                SELECT 
                    psn.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    l.name as location_name,
                    c.name as customer_name,
                    so.order_number,
                    CASE 
                        WHEN psn.warranty_expiry_date < CURDATE() THEN 'expired'
                        WHEN psn.warranty_expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
                        ELSE 'active'
                    END as warranty_status
                FROM product_serial_numbers psn
                LEFT JOIN products p ON psn.product_id = p.id
                LEFT JOIN locations l ON psn.location_id = l.id
                LEFT JOIN sales_orders so ON psn.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                ${whereClause}
                ORDER BY psn.created_at DESC
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching serial numbers:', error);
            res.status(500).json({ error: 'Failed to fetch serial numbers' });
        }
    }
    
    // Update serial number status (sold, returned, etc.)
    async updateSerialNumberStatus(req, res) {
        try {
            const { serialId } = req.params;
            const {
                status,
                sales_order_id,
                customer_id,
                sold_date,
                notes,
                location_id
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            const query = `
                UPDATE product_serial_numbers 
                SET status = ?,
                    sales_order_id = ?,
                    customer_id = ?,
                    sold_date = ?,
                    location_id = COALESCE(?, location_id),
                    notes = ?,
                    updated_by = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await req.db.execute(query, [
                status,
                sales_order_id || null,
                customer_id || null,
                sold_date || null,
                location_id,
                notes || null,
                user_id,
                serialId
            ]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Serial number not found' });
            }
            
            // Log status change
            await this.logSerialNumberHistory(req.db, serialId, status, user_id, notes);
            
            res.json({
                success: true,
                message: 'Serial number status updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating serial number status:', error);
            res.status(500).json({ error: 'Failed to update serial number status' });
        }
    }
    
    // Get warranty information
    async getWarrantyInfo(req, res) {
        try {
            const { serialNumber } = req.params;
            
            const query = `
                SELECT 
                    psn.*,
                    p.name as product_name,
                    p.sku as product_sku,
                    p.description as product_description,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    so.order_number,
                    so.order_date,
                    CASE 
                        WHEN psn.warranty_expiry_date < CURDATE() THEN 'expired'
                        WHEN psn.warranty_expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
                        ELSE 'active'
                    END as warranty_status,
                    DATEDIFF(psn.warranty_expiry_date, CURDATE()) as days_remaining
                FROM product_serial_numbers psn
                LEFT JOIN products p ON psn.product_id = p.id
                LEFT JOIN sales_orders so ON psn.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                WHERE psn.serial_number = ?
            `;
            
            const [rows] = await req.db.execute(query, [serialNumber]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Serial number not found' });
            }
            
            // Get warranty claims history
            const claimsQuery = `
                SELECT 
                    wc.*,
                    u.name as handled_by_name
                FROM warranty_claims wc
                LEFT JOIN users u ON wc.handled_by = u.id
                WHERE wc.serial_number_id = ?
                ORDER BY wc.claim_date DESC
            `;
            
            const [claimsRows] = await req.db.execute(claimsQuery, [rows[0].id]);
            
            res.json({
                success: true,
                data: {
                    product_info: rows[0],
                    warranty_claims: claimsRows
                }
            });
            
        } catch (error) {
            console.error('Error fetching warranty info:', error);
            res.status(500).json({ error: 'Failed to fetch warranty information' });
        }
    }
    
    // Create warranty claim
    async createWarrantyClaim(req, res) {
        try {
            const {
                serial_number,
                customer_name,
                customer_phone,
                customer_email,
                issue_description,
                claim_type = 'repair',
                priority = 'normal'
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            // Get serial number info
            const [serialRows] = await req.db.execute(
                'SELECT id, warranty_expiry_date FROM product_serial_numbers WHERE serial_number = ?',
                [serial_number]
            );
            
            if (serialRows.length === 0) {
                return res.status(404).json({ error: 'Serial number not found' });
            }
            
            const serialInfo = serialRows[0];
            
            // Check if warranty is still valid
            const isWarrantyValid = moment(serialInfo.warranty_expiry_date).isAfter(moment());
            
            // Generate claim number
            const claimNumber = await this.generateClaimNumber(req.db);
            
            const claimQuery = `
                INSERT INTO warranty_claims 
                (claim_number, serial_number_id, customer_name, customer_phone, 
                 customer_email, issue_description, claim_type, priority, 
                 warranty_valid, status, claim_date, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW(), ?)
            `;
            
            const [result] = await req.db.execute(claimQuery, [
                claimNumber,
                serialInfo.id,
                customer_name,
                customer_phone,
                customer_email,
                issue_description,
                claim_type,
                priority,
                isWarrantyValid,
                user_id
            ]);
            
            res.json({
                success: true,
                message: 'Warranty claim created successfully',
                claim_id: result.insertId,
                claim_number: claimNumber,
                warranty_valid: isWarrantyValid
            });
            
        } catch (error) {
            console.error('Error creating warranty claim:', error);
            res.status(500).json({ error: 'Failed to create warranty claim' });
        }
    }
    
    // Get warranty claims
    async getWarrantyClaims(req, res) {
        try {
            const { status, priority, warranty_valid } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (status) {
                whereClause += ' AND wc.status = ?';
                params.push(status);
            }
            
            if (priority) {
                whereClause += ' AND wc.priority = ?';
                params.push(priority);
            }
            
            if (warranty_valid !== undefined) {
                whereClause += ' AND wc.warranty_valid = ?';
                params.push(warranty_valid === 'true');
            }
            
            const query = `
                SELECT 
                    wc.*,
                    psn.serial_number,
                    p.name as product_name,
                    p.sku as product_sku,
                    u.name as created_by_name,
                    h.name as handled_by_name
                FROM warranty_claims wc
                LEFT JOIN product_serial_numbers psn ON wc.serial_number_id = psn.id
                LEFT JOIN products p ON psn.product_id = p.id
                LEFT JOIN users u ON wc.created_by = u.id
                LEFT JOIN users h ON wc.handled_by = h.id
                ${whereClause}
                ORDER BY wc.claim_date DESC
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching warranty claims:', error);
            res.status(500).json({ error: 'Failed to fetch warranty claims' });
        }
    }
    
    // Update warranty claim status
    async updateWarrantyClaim(req, res) {
        try {
            const { claimId } = req.params;
            const {
                status,
                resolution_notes,
                replacement_serial_number,
                repair_cost,
                handled_by
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            const query = `
                UPDATE warranty_claims 
                SET status = ?,
                    resolution_notes = ?,
                    replacement_serial_number = ?,
                    repair_cost = ?,
                    handled_by = ?,
                    resolved_date = CASE WHEN ? IN ('resolved', 'closed') THEN NOW() ELSE resolved_date END,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await req.db.execute(query, [
                status,
                resolution_notes || null,
                replacement_serial_number || null,
                repair_cost || null,
                handled_by || user_id,
                status,
                claimId
            ]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Warranty claim not found' });
            }
            
            res.json({
                success: true,
                message: 'Warranty claim updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating warranty claim:', error);
            res.status(500).json({ error: 'Failed to update warranty claim' });
        }
    }
    
    // Get warranty expiry report
    async getWarrantyExpiryReport(req, res) {
        try {
            const { days_ahead = 30 } = req.query;
            
            const query = `
                SELECT 
                    psn.serial_number,
                    p.name as product_name,
                    p.sku as product_sku,
                    psn.warranty_expiry_date,
                    DATEDIFF(psn.warranty_expiry_date, CURDATE()) as days_remaining,
                    c.name as customer_name,
                    c.phone as customer_phone,
                    c.email as customer_email,
                    so.order_number,
                    CASE 
                        WHEN psn.warranty_expiry_date < CURDATE() THEN 'expired'
                        WHEN psn.warranty_expiry_date < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'expiring_this_week'
                        WHEN psn.warranty_expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_this_month'
                        ELSE 'active'
                    END as warranty_status
                FROM product_serial_numbers psn
                LEFT JOIN products p ON psn.product_id = p.id
                LEFT JOIN sales_orders so ON psn.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                WHERE psn.status = 'sold'
                AND psn.warranty_expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
                ORDER BY psn.warranty_expiry_date ASC
            `;
            
            const [rows] = await req.db.execute(query, [days_ahead]);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching warranty expiry report:', error);
            res.status(500).json({ error: 'Failed to fetch warranty expiry report' });
        }
    }
    
    // Helper methods
    async generateSerialNumber(db, productSku) {
        const year = moment().format('YY');
        const month = moment().format('MM');
        
        const query = `
            SELECT COUNT(*) as count 
            FROM product_serial_numbers 
            WHERE serial_number LIKE '${productSku}-${year}${month}%'
        `;
        
        const [rows] = await db.execute(query);
        const sequence = (rows[0].count + 1).toString().padStart(4, '0');
        
        return `${productSku}-${year}${month}${sequence}`;
    }
    
    async generateClaimNumber(db) {
        const year = moment().format('YY');
        const query = `
            SELECT COUNT(*) as count 
            FROM warranty_claims 
            WHERE claim_number LIKE 'VESPL/WC/${year}%'
        `;
        
        const [rows] = await db.execute(query);
        const sequence = (rows[0].count + 1).toString().padStart(3, '0');
        
        return `VESPL/WC/${year}/${sequence}`;
    }
    
    async logSerialNumberHistory(db, serialId, status, userId, notes) {
        const query = `
            INSERT INTO serial_number_history 
            (serial_number_id, status, changed_by, change_date, notes)
            VALUES (?, ?, ?, NOW(), ?)
        `;
        
        await db.execute(query, [serialId, status, userId, notes]);
    }
}

module.exports = new SerialWarrantyTrackingController();
