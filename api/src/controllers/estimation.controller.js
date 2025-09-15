const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

// Get all estimations with related information
exports.getAllEstimations = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                se.enquiry_id,
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
};

exports.createEstimation = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { enquiry_id, created_by = 1 } = req.body;
        
        // Get enquiry details and check if case exists
        const [enquiryResult] = await db.execute(
            `SELECT se.*, c.id as case_id FROM sales_enquiries se
             LEFT JOIN cases c ON se.id = c.enquiry_id
             WHERE se.id = ?`,
            [enquiry_id]
        );
        
        if (enquiryResult.length === 0) {
            throw new Error('Enquiry not found');
        }
        
        let case_id = enquiryResult[0].case_id;
        
        // Create case if it doesn't exist (outside transaction)
        if (!case_id) {
            // Generate case number
            const caseId = await generateDocumentId(DOCUMENT_TYPES.CASE);
            
            // Create case
            const [caseResult] = await connection.execute(
                `INSERT INTO cases
                (case_number, enquiry_id, current_state, client_id, project_name, requirements,
                 created_by, status)
                VALUES (?, ?, 'estimation', ?, ?, ?, ?, ?)`,
                [caseId, enquiry_id, enquiryResult[0].client_id, enquiryResult[0].project_name,
                 enquiryResult[0].description || null, enquiryResult[0].enquiry_by, enquiryResult[0].enquiry_by, 'active']
            );
            
            case_id = caseResult.insertId;
            
            // Update enquiry with case_id
            await connection.execute(
                `UPDATE sales_enquiries SET case_id = ? WHERE id = ?`,
                [case_id, enquiry_id]
            );
        }
        
        // Generate estimation ID (VESPL/ES/2526/XXX)
        const estimationId = await generateDocumentId(DOCUMENT_TYPES.ESTIMATION);
        
        // Create estimation with case_id
        const [estimationResult] = await connection.execute(
            `INSERT INTO estimations 
            (estimation_id, enquiry_id, case_id, date, created_by, status) 
            VALUES (?, ?, ?, CURDATE(), ?, ?)`,
            [estimationId, enquiry_id, case_id, created_by, 'draft']
        );

        const newEstimationId = estimationResult.insertId;

        // Create predefined sections for engineering solutions
        const predefinedSections = [
            { name: 'Main Panel', order: 1 },
            { name: 'Generator', order: 2 },
            { name: 'UPS', order: 3 },
            { name: 'Incoming', order: 4 },
            { name: 'Outgoing', order: 5 }
        ];

        for (const section of predefinedSections) {
            await connection.execute(
                `INSERT INTO estimation_sections 
                (estimation_id, section_name, section_order, is_editable) 
                VALUES (?, ?, ?, ?)`,
                [newEstimationId, section.name, section.order, 1]
            );
        }
        
        // Update sales enquiry status
        await connection.execute(
            `UPDATE sales_enquiries SET status = 'for_estimation' WHERE id = ?`,
            [enquiry_id]
        );
        
        // Transition case to estimation state
        // await connection.execute(
        //     `CALL TransitionCaseToEstimation(?, ?, ?, ?)`,
        //     [case_id, newEstimationId, created_by, 'Estimation created from enquiry']
        // );

        // Create case history entry
        // await connection.execute(
        //     `INSERT INTO case_history 
        //     (reference_type, reference_id, status, notes, created_by) 
        //     VALUES (?, ?, ?, ?, ?)`,
        //     ['estimation', newEstimationId, 'draft', 'Estimation created', 1]
        // );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Estimation created successfully',
            data: { 
                id: newEstimationId,
                estimation_id: estimationId
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error creating estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getEstimationDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get estimation basic info
        const [estimationRows] = await db.execute(`
            SELECT 
                e.*,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                u.full_name as created_by_name
            FROM estimations e
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.id = ?
        `, [id]);
        
        if (estimationRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estimation not found'
            });
        }
        
        const estimation = estimationRows[0];
        
        // Get sections with items (simplified approach for current schema)
        const [sectionsRows] = await db.execute(`
            SELECT 
                es.*,
                COALESCE(es.section_name, es.heading) as section_name,
                COALESCE(es.section_order, es.sort_order, 1) as section_order
            FROM estimation_sections es
            WHERE es.estimation_id = ?
            ORDER BY COALESCE(es.section_order, es.sort_order, 1), es.id
        `, [id]);
        
        for (let section of sectionsRows) {
            // Get real subsections for this section
            const [subsectionsRows] = await db.execute(`
                SELECT 
                    esub.*
                FROM estimation_subsections esub
                WHERE esub.section_id = ?
                ORDER BY esub.subsection_order, esub.id
            `, [section.id]);
            
            // Get items for each subsection
            for (let subsection of subsectionsRows) {
                const [itemsRows] = await db.execute(`
                    SELECT 
                        ei.*,
                        p.name as product_name,
                        p.make,
                        p.model,
                        p.part_code,
                        cat.name as category_name
                    FROM estimation_items ei
                    LEFT JOIN products p ON ei.product_id = p.id
                    LEFT JOIN categories cat ON p.category_id = cat.id
                    WHERE ei.subsection_id = ?
                    ORDER BY ei.id
                `, [subsection.id]);
                
                subsection.items = itemsRows;
            }
            
            // Get legacy items that are still linked to section_id (for backward compatibility)
            const [legacyItemsRows] = await db.execute(`
                SELECT 
                    ei.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    cat.name as category_name
                FROM estimation_items ei
                LEFT JOIN products p ON ei.product_id = p.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE ei.section_id = ? AND ei.subsection_id IS NULL
                ORDER BY ei.id
            `, [section.id]);
            
            section.items = legacyItemsRows;
            section.subsections = subsectionsRows;
        }
        
        estimation.sections = sectionsRows;
        
        res.json({
            success: true,
            data: estimation
        });
        
    } catch (error) {
        console.error('Error fetching estimation details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching estimation details',
            error: error.message
        });
    }
};

exports.addSection = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { section_name, parent_id = null } = req.body;
        const { estimation_id } = req.params;
        
        // Get max sort order for sections at this level
        const [maxSort] = await connection.execute(
            `SELECT MAX(section_order) as max_sort 
             FROM estimation_sections 
             WHERE estimation_id = ? AND parent_id ${parent_id ? '= ?' : 'IS NULL'}`,
            parent_id ? [estimation_id, parent_id] : [estimation_id]
        );
        
        const nextSort = (maxSort[0].max_sort || 0) + 1;
        
        // Insert section
        const [result] = await connection.execute(
            `INSERT INTO estimation_sections 
            (estimation_id, section_name, parent_id, section_order) 
            VALUES (?, ?, ?, ?)`,
            [estimation_id, section_name || 'Main Panel', parent_id, nextSort]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Section added successfully',
            data: { 
                id: result.insertId,
                heading,
                sort_order: nextSort
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error adding section',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.addItems = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { items } = req.body;
        const { estimation_id, section_id } = req.params;
        
        // Validate estimation exists and is in draft status
        const [estimation] = await connection.execute(
            'SELECT status FROM estimations WHERE id = ?',
            [estimation_id]
        );
        
        if (!estimation[0] || estimation[0].status !== 'draft') {
            throw new Error('Invalid estimation or estimation is not in draft status');
        }
        
        // Insert items
        const values = [];
        const params = [];
        
        for (const item of items) {
            // Get product details
            const [product] = await connection.execute(
                'SELECT mrp, last_price FROM products WHERE id = ?',
                [item.product_id]
            );
            
            if (!product[0]) {
                throw new Error(`Product not found: ${item.product_id}`);
            }
            
            const mrp = product[0].mrp;
            const discounted_price = mrp * (1 - (item.discount_percentage || 0) / 100);
            const final_price = discounted_price * item.quantity;
            
            values.push('(?, ?, ?, ?, ?, ?, ?, ?)');
            params.push(
                estimation_id,
                section_id,
                item.product_id,
                item.quantity,
                mrp,
                item.discount_percentage || 0,
                discounted_price,
                final_price
            );
        }
        
        const [result] = await connection.execute(
            `INSERT INTO estimation_items 
            (estimation_id, section_id, product_id, quantity, mrp, 
             discount_percentage, discounted_price, final_price) 
            VALUES ${values.join(',')}`,
            params
        );
        
        // Update estimation totals
        const [totals] = await connection.execute(
            `SELECT 
                SUM(mrp * quantity) as total_mrp,
                SUM((mrp * quantity) - (final_price)) as total_discount,
                SUM(final_price) as total_final_price
            FROM estimation_items
            WHERE estimation_id = ?`,
            [estimation_id]
        );
        
        await connection.execute(
            `UPDATE estimations 
            SET total_mrp = ?, total_discount = ?, total_final_price = ?
            WHERE id = ?`,
            [
                totals[0].total_mrp || 0,
                totals[0].total_discount || 0,
                totals[0].total_final_price || 0,
                estimation_id
            ]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Items added successfully',
            data: {
                items_added: items.length,
                estimation_totals: {
                    total_mrp: totals[0].total_mrp || 0,
                    total_discount: totals[0].total_discount || 0,
                    total_final_price: totals[0].total_final_price || 0
                }
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error adding items',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getEstimation = async (req, res) => {
    try {
        // Get estimation details
        const [estimation] = await db.execute(
            `SELECT e.*, se.enquiry_id as sales_enquiry_id, 
                    se.project_name, c.company_name as client_name,
                    u1.full_name as created_by_name,
                    u2.full_name as approved_by_name
             FROM estimations e
             LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
             LEFT JOIN clients c ON se.client_id = c.id
             LEFT JOIN users u1 ON e.created_by = u1.id
             LEFT JOIN users u2 ON e.approved_by = u2.id
             WHERE e.id = ?`,
            [req.params.id]
        );
        
        if (estimation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estimation not found'
            });
        }
        
        // Get sections with items
        const [sections] = await db.execute(
            `SELECT 
                es.*,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', ei.id,
                        'product_id', ei.product_id,
                        'quantity', ei.quantity,
                        'mrp', ei.mrp,
                        'discount_percentage', ei.discount_percentage,
                        'discounted_price', ei.discounted_price,
                        'final_price', ei.final_price,
                        'product_name', p.name,
                        'make', p.make,
                        'model', p.model,
                        'part_code', p.part_code
                    )
                ) as items
             FROM estimation_sections es
             LEFT JOIN estimation_items ei ON es.id = ei.section_id
             LEFT JOIN products p ON ei.product_id = p.id
             WHERE es.estimation_id = ?
             GROUP BY es.id
             ORDER BY es.parent_id, es.sort_order`,
            [req.params.id]
        );
        
        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             LEFT JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'estimation' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );
        
        // Parse items JSON string for each section
        const parsedSections = sections.map(section => ({
            ...section,
            items: section.items ? JSON.parse(`[${section.items}]`) : []
        }));
        
        res.json({
            success: true,
            data: {
                estimation: estimation[0],
                sections: parsedSections,
                history
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching estimation',
            error: error.message
        });
    }
};

exports.submitForApproval = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Update estimation status
        await connection.execute(
            `UPDATE estimations SET status = 'submitted' WHERE id = ?`,
            [id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['estimation', id, 'submitted', 'Submitted for approval', req.user.id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Estimation submitted for approval successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error submitting estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Update estimation
exports.updateEstimation = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { enquiry_id, date, notes } = req.body;
        
        // Update estimation
        await connection.execute(
            `UPDATE estimations 
             SET enquiry_id = ?, date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [enquiry_id, date, notes, id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Estimation updated successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error updating estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.approve = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Verify user role is director or admin
        if (!['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to approve estimations');
        }
        
        // Update estimation status
        await connection.execute(
            `UPDATE estimations 
             SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [req.user.id, id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['estimation', id, 'approved', 'Estimation approved', req.user.id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Estimation approved successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error approving estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Section Management
exports.addSection = async (req, res) => {
    try {
        const { id } = req.params; // estimation_id
        const { section_name } = req.body;
        
        // Get next section order
        const [orderRows] = await db.execute(
            'SELECT COALESCE(MAX(section_order), 0) + 1 as next_order FROM estimation_sections WHERE estimation_id = ?',
            [id]
        );
        
        const [result] = await db.execute(
            `INSERT INTO estimation_sections (estimation_id, heading, section_name, section_order) 
             VALUES (?, ?, ?, ?)`,
            [id, section_name || 'Main Panel', section_name || 'Main Panel', orderRows[0].next_order]
        );
        
        res.status(201).json({
            success: true,
            message: 'Section added successfully',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('Error adding section:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding section',
            error: error.message
        });
    }
};

exports.updateSection = async (req, res) => {
    try {
        const { id } = req.params; // section_id
        const { section_name } = req.body;
        
        await db.execute(
            'UPDATE estimation_sections SET section_name = ? WHERE id = ?',
            [section_name, id]
        );
        
        res.json({
            success: true,
            message: 'Section updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating section',
            error: error.message
        });
    }
};

exports.deleteSection = async (req, res) => {
    try {
        const { id } = req.params; // section_id
        
        await db.execute('DELETE FROM estimation_sections WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Section deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting section:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting section',
            error: error.message
        });
    }
};

// Subsection Management
exports.addSubsection = async (req, res) => {
    try {
        const { id } = req.params; // section_id
        const { subsection_name } = req.body;
        
        // Get next subsection order
        const [orderRows] = await db.execute(
            'SELECT COALESCE(MAX(subsection_order), 0) + 1 as next_order FROM estimation_subsections WHERE section_id = ?',
            [id]
        );
        
        const [result] = await db.execute(
            `INSERT INTO estimation_subsections (section_id, subsection_name, subsection_order) 
             VALUES (?, ?, ?)`,
            [id, subsection_name || 'General', orderRows[0].next_order]
        );
        
        res.status(201).json({
            success: true,
            message: 'Subsection added successfully',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('Error adding subsection:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding subsection',
            error: error.message
        });
    }
};

exports.updateSubsection = async (req, res) => {
    try {
        const { id } = req.params; // subsection_id
        const { subsection_name } = req.body;
        
        await db.execute(
            'UPDATE estimation_subsections SET subsection_name = ? WHERE id = ?',
            [subsection_name, id]
        );
        
        res.json({
            success: true,
            message: 'Subsection updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating subsection:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subsection',
            error: error.message
        });
    }
};

exports.deleteSubsection = async (req, res) => {
    try {
        const { id } = req.params; // subsection_id
        
        await db.execute('DELETE FROM estimation_subsections WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Subsection deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting subsection:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting subsection',
            error: error.message
        });
    }
};

// Item Management
exports.addItem = async (req, res) => {
    try {
        const { id } = req.params; // subsection_id
        const { 
            product_id, 
            quantity, 
            mrp, 
            discount_percentage, 
            discounted_price, 
            final_price 
        } = req.body;
        
        // Get estimation_id and section_id from subsection
        const [subsectionRows] = await db.execute(
            'SELECT section_id FROM estimation_subsections WHERE id = ?',
            [id]
        );
        
        if (subsectionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subsection not found'
            });
        }
        
        const [sectionRows] = await db.execute(
            'SELECT estimation_id FROM estimation_sections WHERE id = ?',
            [subsectionRows[0].section_id]
        );
        
        if (sectionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }
        
        const estimation_id = sectionRows[0].estimation_id;
        const section_id = subsectionRows[0].section_id;
        
        // Check stock availability (assuming no stock check for now)
        const stockRows = [{ total_stock: 0 }];
        const isStockAvailable = false; // Default to false for now
        
        const [result] = await db.execute(
            `INSERT INTO estimation_items 
             (estimation_id, section_id, subsection_id, product_id, quantity, mrp, discount_percentage, 
              discounted_price, final_price) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [estimation_id, section_id, id, product_id, quantity, mrp, discount_percentage, 
             discounted_price, final_price]
        );
        
        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item',
            error: error.message
        });
    }
};

exports.updateItemDiscount = async (req, res) => {
    try {
        const { id } = req.params; // item_id
        const { discount_percentage } = req.body;
        
        // Get item details to recalculate prices
        const [itemRows] = await db.execute(
            'SELECT mrp, quantity FROM estimation_items WHERE id = ?',
            [id]
        );
        
        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }
        
        const item = itemRows[0];
        const discountedPrice = item.mrp * (1 - (discount_percentage / 100));
        const finalPrice = discountedPrice * item.quantity;
        
        await db.execute(
            `UPDATE estimation_items 
             SET discount_percentage = ?, discounted_price = ?, final_price = ? 
             WHERE id = ?`,
            [discount_percentage, discountedPrice, finalPrice, id]
        );
        
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
};

exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params; // item_id
        
        await db.execute('DELETE FROM estimation_items WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Item deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting item',
            error: error.message
        });
    }
};
