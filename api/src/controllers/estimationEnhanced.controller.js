const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

class EstimationController {
    // Create new estimation with dynamic sections
    async createEstimation(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { enquiry_id, sections, notes } = req.body;
            const created_by = req.user?.id || 1; // Default for development
            
            // Generate estimation ID
            const estimation_number = await generateDocumentId(DOCUMENT_TYPES.ESTIMATION);
            
            // Calculate totals
            let total_mrp = 0;
            let total_discounted = 0;
            let total_discount_amount = 0;
            
            sections.forEach(section => {
                section.subsections.forEach(subsection => {
                    subsection.items.forEach(item => {
                        const itemMRP = item.quantity * item.mrp;
                        const itemDiscounted = item.quantity * item.discounted_price;
                        total_mrp += itemMRP;
                        total_discounted += itemDiscounted;
                        total_discount_amount += (itemMRP - itemDiscounted);
                    });
                });
            });
            
            // Insert estimation
            const [result] = await connection.execute(`
                INSERT INTO estimations 
                (estimation_number, enquiry_id, estimation_date, total_mrp, total_discounted_price, 
                 total_discount_amount, notes, created_by, status) 
                VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 'draft')
            `, [estimation_number, enquiry_id, total_mrp, total_discounted, total_discount_amount, notes, created_by]);
            
            const estimation_id = result.insertId;
            
            // Insert sections, subsections and items
            for (const section of sections) {
                // Insert section
                const [sectionResult] = await connection.execute(`
                    INSERT INTO estimation_sections 
                    (estimation_id, section_name, section_order, is_editable) 
                    VALUES (?, ?, ?, true)
                `, [estimation_id, section.section_name, section.section_order || 1]);
                
                const section_id = sectionResult.insertId;
                
                for (const subsection of section.subsections) {
                    // Insert subsection
                    const [subsectionResult] = await connection.execute(`
                        INSERT INTO estimation_subsections 
                        (section_id, subsection_name, subsection_order, is_editable) 
                        VALUES (?, ?, ?, true)
                    `, [section_id, subsection.subsection_name, subsection.subsection_order || 1]);
                    
                    const subsection_id = subsectionResult.insertId;
                    
                    // Insert items
                    for (const item of subsection.items) {
                        // Get current stock quantity
                        const [stockResult] = await connection.execute(`
                            SELECT SUM(quantity) as total_stock 
                            FROM inventory_warehouse_stock 
                            WHERE product_id = ?
                        `, [item.product_id]);
                        
                        const stock_available = stockResult[0]?.total_stock || 0;
                        const is_stock_available = stock_available >= item.quantity;
                        
                        await connection.execute(`
                            INSERT INTO estimation_items 
                            (subsection_id, product_id, quantity, mrp, discount_percentage, 
                             discounted_price, final_price, stock_available, is_stock_available, notes) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            subsection_id,
                            item.product_id,
                            item.quantity,
                            item.mrp,
                            item.discount_percentage || 0,
                            item.discounted_price,
                            item.quantity * item.discounted_price,
                            stock_available,
                            is_stock_available,
                            item.notes || null
                        ]);
                    }
                }
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Estimation created successfully',
                data: { id: estimation_id, estimation_number }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating estimation:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating estimation',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Get all estimations
    async getAllEstimations(req, res) {
        try {
            const query = `
                SELECT 
                    e.*,
                    se.enquiry_id as enquiry_number,
                    se.project_name,
                    c.company_name as client_name,
                    c.city,
                    c.state,
                    u.full_name as created_by_name,
                    au.full_name as approved_by_name
                FROM estimations e
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN users au ON e.approved_by = au.id
                ORDER BY e.created_at DESC
            `;
            
            const [estimations] = await db.execute(query);
            
            res.json({
                success: true,
                data: estimations,
                count: estimations.length
            });
        } catch (error) {
            console.error('Error fetching estimations:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching estimations',
                error: error.message
            });
        }
    }

    // Get estimation by ID with full structure
    async getEstimationById(req, res) {
        try {
            const { id } = req.params;
            
            // Get estimation details
            const query = `
                SELECT 
                    e.*,
                    se.enquiry_id as enquiry_number,
                    se.project_name,
                    se.description as project_description,
                    c.company_name as client_name,
                    c.contact_person,
                    c.city,
                    c.state,
                    u.full_name as created_by_name
                FROM estimations e
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON e.created_by = u.id
                WHERE e.id = ?
            `;
            
            const [estimations] = await db.execute(query, [id]);
            
            if (estimations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Estimation not found'
                });
            }
            
            // Get sections with subsections and items
            const sectionsQuery = `
                SELECT 
                    es.*,
                    ess.id as subsection_id,
                    ess.subsection_name,
                    ess.subsection_order,
                    ess.is_editable as subsection_editable,
                    ei.id as item_id,
                    ei.product_id,
                    ei.quantity,
                    ei.mrp,
                    ei.discount_percentage,
                    ei.discounted_price,
                    ei.final_price,
                    ei.stock_available,
                    ei.is_stock_available,
                    ei.notes as item_notes,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.unit,
                    cat.name as category_name,
                    subcat.name as subcategory_name
                FROM estimation_sections es
                LEFT JOIN estimation_subsections ess ON es.id = ess.section_id
                LEFT JOIN estimation_items ei ON ess.id = ei.subsection_id
                LEFT JOIN products p ON ei.product_id = p.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                LEFT JOIN categories subcat ON p.sub_category_id = subcat.id
                WHERE es.estimation_id = ?
                ORDER BY es.section_order, ess.subsection_order, ei.id
            `;
            
            const [sectionData] = await db.execute(sectionsQuery, [id]);
            
            // Structure the data
            const sections = {};
            sectionData.forEach(row => {
                if (!sections[row.id]) {
                    sections[row.id] = {
                        id: row.id,
                        section_name: row.section_name,
                        section_order: row.section_order,
                        is_editable: row.is_editable,
                        subsections: {}
                    };
                }
                
                if (row.subsection_id && !sections[row.id].subsections[row.subsection_id]) {
                    sections[row.id].subsections[row.subsection_id] = {
                        id: row.subsection_id,
                        subsection_name: row.subsection_name,
                        subsection_order: row.subsection_order,
                        is_editable: row.subsection_editable,
                        items: []
                    };
                }
                
                if (row.item_id) {
                    sections[row.id].subsections[row.subsection_id].items.push({
                        id: row.item_id,
                        product_id: row.product_id,
                        product_name: row.product_name,
                        make: row.make,
                        model: row.model,
                        part_code: row.part_code,
                        unit: row.unit,
                        category_name: row.category_name,
                        subcategory_name: row.subcategory_name,
                        quantity: row.quantity,
                        mrp: row.mrp,
                        discount_percentage: row.discount_percentage,
                        discounted_price: row.discounted_price,
                        final_price: row.final_price,
                        stock_available: row.stock_available,
                        is_stock_available: row.is_stock_available,
                        notes: row.item_notes
                    });
                }
            });
            
            // Convert to arrays
            const structuredSections = Object.values(sections).map(section => ({
                ...section,
                subsections: Object.values(section.subsections)
            }));
            
            res.json({
                success: true,
                data: {
                    ...estimations[0],
                    sections: structuredSections
                }
            });
        } catch (error) {
            console.error('Error fetching estimation:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching estimation',
                error: error.message
            });
        }
    }

    // Update section name
    async updateSectionName(req, res) {
        try {
            const { id } = req.params;
            const { section_name } = req.body;
            
            await db.execute(
                'UPDATE estimation_sections SET section_name = ? WHERE id = ?',
                [section_name, id]
            );
            
            res.json({
                success: true,
                message: 'Section name updated successfully'
            });
        } catch (error) {
            console.error('Error updating section name:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating section name',
                error: error.message
            });
        }
    }

    // Update subsection name
    async updateSubsectionName(req, res) {
        try {
            const { id } = req.params;
            const { subsection_name } = req.body;
            
            await db.execute(
                'UPDATE estimation_subsections SET subsection_name = ? WHERE id = ?',
                [subsection_name, id]
            );
            
            res.json({
                success: true,
                message: 'Subsection name updated successfully'
            });
        } catch (error) {
            console.error('Error updating subsection name:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating subsection name',
                error: error.message
            });
        }
    }

    // Update item discount
    async updateItemDiscount(req, res) {
        try {
            const { id } = req.params;
            const { discount_percentage } = req.body;
            
            // Get current item details
            const [items] = await db.execute(
                'SELECT mrp, quantity FROM estimation_items WHERE id = ?',
                [id]
            );
            
            if (items.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }
            
            const item = items[0];
            const discounted_price = item.mrp * (1 - discount_percentage / 100);
            const final_price = item.quantity * discounted_price;
            
            await db.execute(`
                UPDATE estimation_items 
                SET discount_percentage = ?, discounted_price = ?, final_price = ? 
                WHERE id = ?
            `, [discount_percentage, discounted_price, final_price, id]);
            
            res.json({
                success: true,
                message: 'Item discount updated successfully'
            });
        } catch (error) {
            console.error('Error updating item discount:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating item discount',
                error: error.message
            });
        }
    }

    // Submit estimation for approval
    async submitForApproval(req, res) {
        try {
            const { id } = req.params;
            
            await db.execute(
                'UPDATE estimations SET status = "pending_approval" WHERE id = ?',
                [id]
            );
            
            res.json({
                success: true,
                message: 'Estimation submitted for approval'
            });
        } catch (error) {
            console.error('Error submitting estimation:', error);
            res.status(500).json({
                success: false,
                message: 'Error submitting estimation',
                error: error.message
            });
        }
    }

    // Approve estimation
    async approveEstimation(req, res) {
        try {
            const { id } = req.params;
            const approved_by = req.user?.id || 1;
            
            await db.execute(
                'UPDATE estimations SET status = "approved", approved_by = ? WHERE id = ?',
                [approved_by, id]
            );
            
            res.json({
                success: true,
                message: 'Estimation approved successfully'
            });
        } catch (error) {
            console.error('Error approving estimation:', error);
            res.status(500).json({
                success: false,
                message: 'Error approving estimation',
                error: error.message
            });
        }
    }
}

module.exports = new EstimationController();
