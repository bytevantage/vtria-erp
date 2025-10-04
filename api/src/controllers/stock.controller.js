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
            FROM stock s
            JOIN products p ON s.product_id = p.id
            LEFT JOIN locations l ON s.location_id = l.id
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
        // Simple query to start with
        const query = `
            SELECT 
                sm.*,
                p.name as product_name,
                p.product_code
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            ORDER BY sm.movement_date DESC
            LIMIT 50
        `;

        const [movements] = await db.execute(query);

        res.json({
            success: true,
            data: movements,
            message: `Found ${movements.length} stock movements`
        });

    } catch (error) {
        console.error('Stock movements error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stock movements',
            error: error.message
        });
    }
};
