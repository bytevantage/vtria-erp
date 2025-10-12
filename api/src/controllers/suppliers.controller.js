const db = require('../config/database');

class SuppliersController {
    // Get all suppliers
    async getAllSuppliers(req, res) {
        try {
            const { is_active = true } = req.query;

            let whereClause = '';
            const params = [];

            if (is_active !== undefined) {
                whereClause = 'WHERE is_active = ?';
                params.push((is_active === 'true' || is_active === '1' || is_active === true) ? 1 : 0);
            }

            const query = `
                SELECT 
                    id,
                    company_name,
                    code,
                    contact_person,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    pincode,
                    gstin,
                    pan,
                    payment_terms,
                    credit_limit,
                    rating,
                    is_active,
                    created_at,
                    updated_at
                FROM suppliers 
                ${whereClause}
                ORDER BY company_name ASC
            `;

            const [rows] = await db.execute(query, params);

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {
            console.error('Error fetching suppliers:', error);
            res.status(500).json({ error: 'Failed to fetch suppliers' });
        }
    }

    // Get supplier by ID
    async getSupplierById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    id,
                    company_name as name,
                    code,
                    contact_person,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    pincode,
                    gstin,
                    pan,
                    payment_terms,
                    credit_limit,
                    rating,
                    is_active,
                    created_at,
                    updated_at
                FROM suppliers 
                WHERE id = ?
            `;

            const [rows] = await db.execute(query, [id]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Supplier not found' });
            }

            res.json({
                success: true,
                data: rows[0]
            });

        } catch (error) {
            console.error('Error fetching supplier:', error);
            res.status(500).json({ error: 'Failed to fetch supplier' });
        }
    }

    // Create new supplier
    async createSupplier(req, res) {
        try {
            const {
                name,
                code,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin,
                pan,
                payment_terms,
                credit_limit = 0,
                rating = 'good'
            } = req.body;

            const query = `
                INSERT INTO suppliers 
                (company_name, code, contact_person, email, phone, address, city, state, 
                 pincode, gstin, pan, payment_terms, credit_limit, rating, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            `;

            const [result] = await db.execute(query, [
                name,
                code,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin,
                pan,
                payment_terms,
                credit_limit,
                rating
            ]);

            res.json({
                success: true,
                message: 'Supplier created successfully',
                supplier_id: result.insertId
            });

        } catch (error) {
            console.error('Error creating supplier:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ error: 'Supplier code already exists' });
            } else {
                res.status(500).json({ error: 'Failed to create supplier' });
            }
        }
    }

    // Update supplier
    async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                code,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin,
                pan,
                payment_terms,
                credit_limit,
                rating,
                is_active
            } = req.body;

            const query = `
                UPDATE suppliers 
                SET company_name = ?, code = ?, contact_person = ?, email = ?, phone = ?,
                    address = ?, city = ?, state = ?, pincode = ?, gstin = ?,
                    pan = ?, payment_terms = ?, credit_limit = ?, rating = ?,
                    is_active = ?, updated_at = NOW()
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [
                name,
                code,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin,
                pan,
                payment_terms,
                credit_limit,
                rating,
                is_active,
                id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Supplier not found' });
            }

            res.json({
                success: true,
                message: 'Supplier updated successfully'
            });

        } catch (error) {
            console.error('Error updating supplier:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ error: 'Supplier code already exists' });
            } else {
                res.status(500).json({ error: 'Failed to update supplier' });
            }
        }
    }

    // Delete supplier (soft delete)
    async deleteSupplier(req, res) {
        try {
            const { id } = req.params;

            const query = `
                UPDATE suppliers 
                SET is_active = FALSE, updated_at = NOW()
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Supplier not found' });
            }

            res.json({
                success: true,
                message: 'Supplier deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting supplier:', error);
            res.status(500).json({ error: 'Failed to delete supplier' });
        }
    }
}

module.exports = new SuppliersController();
