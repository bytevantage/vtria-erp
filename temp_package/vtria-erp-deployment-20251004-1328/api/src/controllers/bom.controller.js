const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

class BOMController {
    // Create BOM from quotation
    async createBOM(req, res) {
        try {
            const { quotation_id, notes } = req.body;
            const created_by = req.user?.id || 1; // Default for development

            // Generate BOM number
            const bom_number = await generateDocumentId(DOCUMENT_TYPES.BILL_OF_MATERIALS);

            // Get quotation items to create BOM
            const quotationQuery = `
                SELECT 
                    qi.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    es.section_name,
                    ess.subsection_name
                FROM quotation_items qi
                LEFT JOIN products p ON qi.product_id = p.id
                LEFT JOIN estimation_sections es ON qi.section_id = es.id
                LEFT JOIN estimation_subsections ess ON qi.subsection_id = ess.id
                WHERE qi.quotation_id = ?
            `;

            const [quotationItems] = await db.execute(quotationQuery, [quotation_id]);

            if (quotationItems.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found or has no items'
                });
            }

            // Calculate total estimated cost
            const total_estimated_cost = quotationItems.reduce((sum, item) =>
                sum + (item.quantity * item.discounted_price), 0
            );

            // Insert BOM
            const [result] = await db.execute(`
                INSERT INTO bill_of_materials 
                (bom_number, quotation_id, bom_date, total_estimated_cost, notes, created_by) 
                VALUES (?, ?, CURDATE(), ?, ?, ?)
            `, [bom_number, quotation_id, total_estimated_cost, notes, created_by]);

            const bom_id = result.insertId;

            // Insert BOM items
            const itemsQuery = `
                INSERT INTO bom_items 
                (bom_id, product_id, quantity, estimated_cost, section_name, subsection_name, notes) 
                VALUES ?
            `;

            const itemsData = quotationItems.map(item => [
                bom_id,
                item.product_id,
                item.quantity,
                item.quantity * item.discounted_price,
                item.section_name || 'General',
                item.subsection_name || 'General',
                `${item.product_name} - ${item.make} ${item.model}`
            ]);

            await db.query(itemsQuery, [itemsData]);

            res.json({
                success: true,
                message: 'BOM created successfully',
                data: { id: bom_id, bom_number }
            });
        } catch (error) {
            console.error('Error creating BOM:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating BOM',
                error: error.message
            });
        }
    }

    // Get all BOMs
    async getAllBOMs(req, res) {
        try {
            const query = `
                SELECT 
                    bom.*,
                    u.full_name as created_by_name,
                    a.full_name as approved_by_name
                FROM bill_of_materials bom
                LEFT JOIN users u ON bom.created_by = u.id
                LEFT JOIN users a ON bom.approved_by = a.id
                ORDER BY bom.created_at DESC
            `;

            const [boms] = await db.execute(query);

            res.json({
                success: true,
                data: boms,
                count: boms.length
            });
        } catch (error) {
            console.error('Error fetching BOMs:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching BOMs',
                error: error.message
            });
        }
    }

    // Get BOM by ID
    async getBOMById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    bom.*,
                    q.quotation_number,
                    q.project_name,
                    c.company_name as client_name,
                    u.full_name as created_by_name
                FROM bill_of_materials bom
                LEFT JOIN quotations q ON bom.quotation_id = q.id
                LEFT JOIN clients c ON q.client_id = c.id
                LEFT JOIN users u ON bom.created_by = u.id
                WHERE bom.id = ?
            `;

            const [boms] = await db.execute(query, [id]);

            if (boms.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'BOM not found'
                });
            }

            // Get BOM items grouped by section
            const itemsQuery = `
                SELECT 
                    bi.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.unit,
                    s.quantity as stock_quantity
                FROM bom_items bi
                LEFT JOIN products p ON bi.product_id = p.id
                LEFT JOIN (
                    SELECT product_id, SUM(quantity) as quantity 
                    FROM inventory_warehouse_stock 
                    GROUP BY product_id
                ) s ON bi.product_id = s.product_id
                WHERE bi.bom_id = ?
                ORDER BY bi.section_name, bi.subsection_name, bi.id
            `;

            const [items] = await db.execute(itemsQuery, [id]);

            // Group items by section and subsection
            const groupedItems = {};
            items.forEach(item => {
                const section = item.section_name || 'General';
                const subsection = item.subsection_name || 'General';

                if (!groupedItems[section]) {
                    groupedItems[section] = {};
                }
                if (!groupedItems[section][subsection]) {
                    groupedItems[section][subsection] = [];
                }

                groupedItems[section][subsection].push({
                    ...item,
                    stock_available: (item.stock_quantity || 0) >= item.quantity
                });
            });

            res.json({
                success: true,
                data: {
                    ...boms[0],
                    items: groupedItems,
                    raw_items: items
                }
            });
        } catch (error) {
            console.error('Error fetching BOM:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching BOM',
                error: error.message
            });
        }
    }

    // Approve BOM
    async approveBOM(req, res) {
        try {
            const { id } = req.params;
            const approved_by = req.user?.id || 1;

            await db.execute(
                'UPDATE bill_of_materials SET status = "approved", approved_by = ? WHERE id = ?',
                [approved_by, id]
            );

            res.json({
                success: true,
                message: 'BOM approved successfully'
            });
        } catch (error) {
            console.error('Error approving BOM:', error);
            res.status(500).json({
                success: false,
                message: 'Error approving BOM',
                error: error.message
            });
        }
    }

    // Lock BOM (prevent further changes)
    async lockBOM(req, res) {
        try {
            const { id } = req.params;

            await db.execute(
                'UPDATE bill_of_materials SET status = "locked" WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'BOM locked successfully'
            });
        } catch (error) {
            console.error('Error locking BOM:', error);
            res.status(500).json({
                success: false,
                message: 'Error locking BOM',
                error: error.message
            });
        }
    }
}

module.exports = new BOMController();
