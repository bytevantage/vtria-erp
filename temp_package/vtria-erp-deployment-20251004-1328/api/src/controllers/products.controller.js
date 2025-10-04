const db = require('../config/database');

// Get best vendor price for a product
exports.getBestVendorPrice = async (productId) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                vendor_name,
                vendor_price,
                vendor_discount,
                final_price,
                valid_from,
                valid_until
            FROM vendor_prices 
            WHERE product_id = ? 
            AND is_active = TRUE 
            AND valid_from <= CURDATE()
            AND (valid_until IS NULL OR valid_until >= CURDATE())
            ORDER BY final_price ASC
            LIMIT 1
        `, [productId]);

        return rows[0] || null;
    } catch (error) {
        console.error('Error getting best vendor price:', error);
        return null;
    }
};

// Get all vendor prices for a product
exports.getVendorPrices = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const [rows] = await db.execute(`
            SELECT 
                id,
                vendor_name,
                vendor_price,
                vendor_discount,
                final_price,
                valid_from,
                valid_until,
                is_active
            FROM vendor_prices 
            WHERE product_id = ?
            ORDER BY final_price ASC
        `, [productId]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error fetching vendor prices:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching vendor prices',
            error: error.message
        });
    }
};

// Get all products with categories for dropdown
exports.getAllProducts = async (req, res) => {
    try {
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
                p.max_stock_level,
                p.reorder_level,
                p.is_active,
                c.name as category_name,
                sc.name as sub_category_name,
                COALESCE(SUM(iws.current_stock), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(iws.current_stock), 0) <= p.reorder_level THEN 'Low Stock'
                    WHEN COALESCE(SUM(iws.current_stock), 0) <= p.min_stock_level THEN 'Critical'
                    ELSE 'In Stock'
                END as stock_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN inventory_warehouse_stock iws ON p.id = iws.item_id
            WHERE p.is_active = TRUE
            GROUP BY p.id, p.name, p.make, p.model, p.part_code, p.product_code, 
                     p.mrp, p.vendor_discount, p.last_price, p.last_purchase_price, 
                     p.last_purchase_date, p.unit, p.hsn_code, p.gst_rate, 
                     p.serial_number_required, p.warranty_period, p.warranty_period_type, 
                     p.warranty_upto, p.min_stock_level, p.max_stock_level, p.reorder_level, 
                     p.is_active, c.name, sc.name
            ORDER BY p.name
        `);
        
        // Enhance products with best vendor pricing
        for (const product of rows) {
            const bestPrice = await this.getBestVendorPrice(product.id);
            if (bestPrice) {
                product.best_vendor = bestPrice.vendor_name;
                product.best_vendor_price = bestPrice.vendor_price;
                product.best_vendor_discount = bestPrice.vendor_discount;
                product.best_final_price = bestPrice.final_price;
            }
        }
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// Get product by ID with stock info
exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(`
            SELECT 
                p.*,
                c.name as category_name,
                sc.name as sub_category_name,
                COALESCE(SUM(s.quantity), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.reorder_level THEN 'Low Stock'
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.min_stock_level THEN 'Critical'
                    ELSE 'In Stock'
                END as stock_status,
                CASE 
                    WHEN p.warranty_period_type = 'years' THEN p.warranty_period * 12
                    ELSE p.warranty_period
                END as warranty_months
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN stock s ON p.id = s.product_id
            WHERE p.id = ? AND p.is_active = TRUE
            GROUP BY p.id
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
};

// Search products by name/part code for autocomplete
exports.searchProducts = async (req, res) => {
    try {
        const { q } = req.query;
        
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
                p.unit,
                p.hsn_code,
                p.gst_rate,
                p.serial_number_required,
                p.warranty_period,
                p.warranty_period_type,
                c.name as category_name,
                sc.name as sub_category_name,
                COALESCE(SUM(s.quantity), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.reorder_level THEN 'Low Stock'
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.min_stock_level THEN 'Critical'
                    ELSE 'In Stock'
                END as stock_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN categories sc ON p.sub_category_id = sc.id
            LEFT JOIN stock s ON p.id = s.product_id
            WHERE p.is_active = TRUE AND (p.name LIKE ? OR p.part_code LIKE ? OR p.product_code LIKE ? OR p.make LIKE ? OR p.model LIKE ?)
            GROUP BY p.id
            ORDER BY 
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
            `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`,
            `${q}%`, `${q}%`, `${q}%`, `${q}%`
        ]);
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching products',
            error: error.message
        });
    }
};

// Get all categories in hierarchical structure
exports.getAllCategories = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                id,
                name,
                parent_id,
                description
            FROM categories
            ORDER BY parent_id ASC, name ASC
        `);
        
        // Convert flat array to hierarchical structure
        const categories = [];
        const categoryMap = {};
        
        // First pass: create all categories
        rows.forEach(cat => {
            categoryMap[cat.id] = {
                ...cat,
                children: []
            };
        });
        
        // Second pass: build hierarchy
        rows.forEach(cat => {
            if (cat.parent_id) {
                if (categoryMap[cat.parent_id]) {
                    categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
                }
            } else {
                categories.push(categoryMap[cat.id]);
            }
        });
        
        res.json({
            success: true,
            data: categories
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};

// Get flat list of categories for dropdowns
exports.getFlatCategories = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                c.parent_id,
                CASE 
                    WHEN c.parent_id IS NOT NULL THEN CONCAT(p.name, ' > ', c.name)
                    ELSE c.name
                END as display_name
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            ORDER BY display_name
        `);
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('Error fetching flat categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching flat categories',
            error: error.message
        });
    }
};

// Create new product
exports.createProduct = async (req, res) => {
    try {
        const {
            name,
            make,
            model,
            part_code,
            product_code,
            category_id,
            sub_category_id,
            description,
            mrp,
            vendor_discount,
            last_price,
            last_purchase_price,
            unit,
            hsn_code,
            gst_rate,
            serial_number_required,
            warranty_period,
            warranty_period_type,
            min_stock_level,
            max_stock_level,
            reorder_level
        } = req.body;

        const [result] = await db.execute(`
            INSERT INTO products (
                name, make, model, part_code, product_code, category_id, sub_category_id,
                description, mrp, vendor_discount, last_price, last_purchase_price,
                unit, hsn_code, gst_rate, serial_number_required, warranty_period,
                warranty_period_type, min_stock_level, max_stock_level, reorder_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, make, model, part_code, product_code, category_id, sub_category_id,
            description, mrp, vendor_discount || 0, last_price, last_purchase_price,
            unit, hsn_code, gst_rate || 18.00, serial_number_required || false,
            warranty_period || 0, warranty_period_type || 'months',
            min_stock_level || 0, max_stock_level || 0, reorder_level || 0
        ]);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        
        // Remove id from update fields if present
        delete updateFields.id;
        
        // Build dynamic update query
        const fields = Object.keys(updateFields);
        const values = Object.values(updateFields);
        
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        values.push(id);
        
        await db.execute(`UPDATE products SET ${setClause} WHERE id = ?`, values);
        
        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
};

// Get products with low stock
exports.getLowStockProducts = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.product_code,
                p.part_code,
                p.make,
                p.model,
                p.unit,
                p.min_stock_level,
                p.reorder_level,
                c.name as category_name,
                COALESCE(SUM(s.quantity), 0) as total_stock,
                CASE 
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.min_stock_level THEN 'Critical'
                    WHEN COALESCE(SUM(s.quantity), 0) <= p.reorder_level THEN 'Low Stock'
                    ELSE 'Normal'
                END as stock_status,
                (p.reorder_level + p.max_stock_level - COALESCE(SUM(s.quantity), 0)) as suggested_order_qty
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN stock s ON p.id = s.product_id
            WHERE p.is_active = TRUE
            GROUP BY p.id
            HAVING total_stock <= p.reorder_level
            ORDER BY 
                CASE stock_status
                    WHEN 'Critical' THEN 1
                    WHEN 'Low Stock' THEN 2
                    ELSE 3
                END,
                total_stock ASC
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching low stock products',
            error: error.message
        });
    }
};

// Get products requiring serial numbers
exports.getSerialRequiredProducts = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.name,
                p.product_code,
                p.make,
                p.model,
                p.warranty_period,
                p.warranty_period_type,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.serial_number_required = TRUE AND p.is_active = TRUE
            ORDER BY p.name
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error fetching serial required products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching serial required products',
            error: error.message
        });
    }
};

// Get serial numbers for a product
exports.getProductSerials = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(`
            SELECT 
                serial_number,
                status,
                location,
                created_at as last_updated
            FROM product_serials 
            WHERE product_id = ? AND is_active = TRUE
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Error fetching product serials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product serials',
            error: error.message
        });
    }
};

// Add serial number for a product
exports.addProductSerial = async (req, res) => {
    try {
        const { id } = req.params;
        const { serial_number, location, status = 'available' } = req.body;

        // Check if serial number already exists
        const [existing] = await db.execute(
            'SELECT id FROM product_serials WHERE serial_number = ? AND is_active = TRUE',
            [serial_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Serial number already exists'
            });
        }

        const [result] = await db.execute(`
            INSERT INTO product_serials (product_id, serial_number, status, location)
            VALUES (?, ?, ?, ?)
        `, [id, serial_number, status, location]);

        res.json({
            success: true,
            message: 'Serial number added successfully',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Error adding product serial:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product serial',
            error: error.message
        });
    }
};
