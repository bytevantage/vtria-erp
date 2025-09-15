const db = require('../config/database');

exports.addStock = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { product_id, location_id, quantity, reference_type, reference_id } = req.body;
        
        // Add to stock
        const [stockResult] = await connection.execute(
            `INSERT INTO stock (product_id, location_id, quantity) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [product_id, location_id, quantity, quantity]
        );
        
        // Record movement
        await connection.execute(
            `INSERT INTO stock_movements 
            (product_id, to_location_id, quantity, movement_type, 
             reference_type, reference_id, movement_date, created_by) 
            VALUES (?, ?, ?, 'in', ?, ?, CURRENT_TIMESTAMP, ?)`,
            [product_id, location_id, quantity, reference_type, reference_id, req.user.id]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Stock added successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error adding stock',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.transferStock = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            product_id, 
            from_location_id, 
            to_location_id, 
            quantity,
            notes
        } = req.body;
        
        // Check if source has enough stock
        const [currentStock] = await connection.execute(
            'SELECT quantity FROM inventory_warehouse_stock WHERE product_id = ? AND location_id = ?',
            [product_id, from_location_id]
        );
        
        if (!currentStock[0] || currentStock[0].quantity < quantity) {
            throw new Error('Insufficient stock at source location');
        }
        
        // Reduce stock at source
        await connection.execute(
            'UPDATE inventory_warehouse_stock SET quantity = quantity - ? WHERE product_id = ? AND location_id = ?',
            [quantity, product_id, from_location_id]
        );
        
        // Add stock at destination
        await connection.execute(
            `INSERT INTO inventory_warehouse_stock (product_id, location_id, quantity) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [product_id, to_location_id, quantity, quantity]
        );
        
        // Record movement
        await connection.execute(
            `INSERT INTO stock_movements 
            (product_id, from_location_id, to_location_id, quantity, 
             movement_type, movement_date, created_by, notes) 
            VALUES (?, ?, ?, ?, 'transfer', CURRENT_TIMESTAMP, ?, ?)`,
            [product_id, from_location_id, to_location_id, quantity, req.user.id, notes]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Stock transferred successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error transferring stock',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getStockLevels = async (req, res) => {
    try {
        const { location_id, category_id } = req.query;
        
        let query = `
            SELECT 
                s.product_id,
                s.location_id,
                s.quantity,
                p.name as product_name,
                p.make,
                p.model,
                p.part_code,
                p.mrp,
                p.last_price,
                l.name as location_name,
                c.name as category_name
            FROM inventory_warehouse_stock s
            JOIN products p ON s.product_id = p.id
            JOIN locations l ON s.location_id = l.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (location_id) {
            query += ' AND s.location_id = ?';
            params.push(location_id);
        }
        
        if (category_id) {
            query += ' AND (p.category_id = ? OR p.sub_category_id = ?)';
            params.push(category_id, category_id);
        }
        
        const [stocks] = await db.execute(query, params);
        
        res.json({
            success: true,
            data: stocks
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching stock levels',
            error: error.message
        });
    }
};

exports.getStockMovements = async (req, res) => {
    try {
        const { 
            product_id, 
            location_id, 
            movement_type,
            start_date,
            end_date,
            page = 1,
            limit = 10
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                sm.*,
                p.name as product_name,
                p.part_code,
                fl.name as from_location,
                tl.name as to_location,
                u.full_name as created_by_name
            FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            LEFT JOIN locations fl ON sm.from_location_id = fl.id
            LEFT JOIN locations tl ON sm.to_location_id = tl.id
            JOIN users u ON sm.created_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (product_id) {
            query += ' AND sm.product_id = ?';
            params.push(product_id);
        }
        
        if (location_id) {
            query += ' AND (sm.from_location_id = ? OR sm.to_location_id = ?)';
            params.push(location_id, location_id);
        }
        
        if (movement_type) {
            query += ' AND sm.movement_type = ?';
            params.push(movement_type);
        }
        
        if (start_date) {
            query += ' AND DATE(sm.movement_date) >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND DATE(sm.movement_date) <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY sm.movement_date DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        
        const [movements] = await db.execute(query, params);
        
        // Get total count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM stock_movements WHERE 1=1' +
            (product_id ? ' AND product_id = ?' : '') +
            (location_id ? ' AND (from_location_id = ? OR to_location_id = ?)' : '') +
            (movement_type ? ' AND movement_type = ?' : '') +
            (start_date ? ' AND DATE(movement_date) >= ?' : '') +
            (end_date ? ' AND DATE(movement_date) <= ?' : ''),
            params.slice(0, -2)
        );
        
        res.json({
            success: true,
            data: {
                movements,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: countResult[0].total
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching stock movements',
            error: error.message
        });
    }
};
