const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');
const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// Helper function to generate smart pricing suggestions based on vendor history
async function generateSmartPricingSuggestions(enquiry_id, estimation_id, connection) {
    try {
        // Get enquiry details to understand the project requirements
        const [enquiryData] = await connection.execute(
            `SELECT project_name, description, client_id FROM sales_enquiries WHERE id = ?`,
            [enquiry_id]
        );

        if (enquiryData.length === 0) {
            return [];
        }

        const enquiry = enquiryData[0];
        const suggestions = [];

        // Get common electrical components that might be relevant
        const [commonProducts] = await connection.execute(`
            SELECT DISTINCT p.id, p.name, p.category, p.unit,
                   AVG(vph.price) as avg_price,
                   MIN(vph.price) as min_price,
                   MAX(vph.price) as max_price,
                   COUNT(vph.id) as price_count,
                   s.supplier_name as best_supplier_name
            FROM products p
            JOIN vendor_price_history vph ON p.id = vph.product_id
            JOIN suppliers s ON vph.supplier_id = s.id
            WHERE vph.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            AND p.category IN ('Electrical Panel', 'Generator', 'UPS', 'Switchgear', 'Cables', 'Protection Equipment')
            GROUP BY p.id, p.name, p.category, p.unit, s.supplier_name
            HAVING price_count >= 2
            ORDER BY p.category, avg_price ASC
            LIMIT 20
        `);

        // Create suggestions for each product category
        const categoryMap = {};

        for (const product of commonProducts) {
            if (!categoryMap[product.category]) {
                categoryMap[product.category] = [];
            }

            categoryMap[product.category].push({
                product_id: product.id,
                product_name: product.name,
                unit: product.unit,
                suggested_price: Math.round(product.min_price * 1.15), // 15% markup from minimum
                avg_market_price: Math.round(product.avg_price),
                price_range: {
                    min: product.min_price,
                    max: product.max_price
                },
                best_supplier: product.best_supplier_name,
                confidence_score: Math.min(product.price_count / 5, 1), // Higher confidence with more data points
                last_updated: new Date()
            });
        }

        // Build final suggestions with category grouping
        for (const [category, products] of Object.entries(categoryMap)) {
            suggestions.push({
                category: category,
                products: products.slice(0, 5), // Top 5 products per category
                estimated_section: mapCategoryToSection(category),
                total_estimated_value: products.reduce((sum, p) => sum + p.suggested_price, 0)
            });
        }

        return suggestions;

    } catch (error) {
        console.error('Error generating smart pricing suggestions:', error);
        return [];
    }
}

// Helper to map product categories to estimation sections
function mapCategoryToSection(category) {
    const categoryMap = {
        'Electrical Panel': 'Main Panel',
        'Generator': 'Generator',
        'UPS': 'UPS',
        'Switchgear': 'Incoming',
        'Cables': 'Outgoing',
        'Protection Equipment': 'Main Panel'
    };

    return categoryMap[category] || 'Main Panel';
}

// Get all estimations with related information
exports.getAllEstimations = async (req, res) => {
    try {
        console.log('INFO: Fetching estimations...');

        // First check if database connection is working
        const [testResult] = await db.execute('SELECT 1 as test');
        console.log('INFO: Database connection test:', testResult);

        const query = `
            SELECT DISTINCT
                e.id,
                e.estimation_id,
                e.enquiry_id,
                e.case_id,
                e.date,
                e.status,
                e.total_mrp,
                e.total_discount,
                e.total_final_price,
                e.notes,
                e.created_at,
                e.updated_at,
                e.created_by,
                e.approved_by,
                e.approved_at,
                se.enquiry_id as se_enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                u.full_name as created_by_name,
                au.full_name as approved_by_name,
                cases.case_number,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM purchase_requisitions pr WHERE pr.estimation_id = e.id) THEN 1 
                    ELSE 0 
                END as has_purchase_requisition
            FROM estimations e
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN users au ON e.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE e.deleted_at IS NULL AND e.status != 'approved'
            ORDER BY e.created_at DESC
        `;

        console.log('INFO: Executing estimation query...');
        const [estimations] = await db.execute(query);
        console.log('INFO: Query executed successfully, found:', estimations.length, 'estimations');

        res.json({
            success: true,
            data: estimations,
            count: estimations.length
        });
    } catch (error) {
        console.error('ERROR: Error fetching estimations:', error.message);
        console.error('ERROR: Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Database connection error. Please ensure the database is running and properly configured.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

exports.createEstimation = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { enquiry_id } = req.body;
        
        // Get created_by user ID - if no authenticated user, get first available user
        let created_by = req.user?.id;
        if (!created_by) {
            const [users] = await connection.execute('SELECT id FROM users ORDER BY id LIMIT 1');
            if (users.length === 0) {
                throw new Error('No users found in database. Cannot create estimation without a valid user.');
            }
            created_by = users[0].id;
        }

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

        // Check if an active estimation already exists for this enquiry
        const [existingEstimations] = await connection.execute(
            'SELECT id, estimation_id FROM estimations WHERE enquiry_id = ? AND deleted_at IS NULL',
            [enquiry_id]
        );

        if (existingEstimations.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `An estimation already exists for this enquiry (${existingEstimations[0].estimation_id}). Please edit the existing estimation instead of creating a new one.`
            });
        }

        let case_id = enquiryResult[0].case_id;

        // Create case if it doesn't exist (outside transaction)
        if (!case_id) {
            // Generate case number
            const caseId = await generateDocumentId(DOCUMENT_TYPES.CASE);

            // Create case (convert undefined to null for MySQL compatibility)
            const [caseResult] = await connection.execute(
                `INSERT INTO cases
                (case_number, enquiry_id, current_state, client_id, project_name, requirements,
                 created_by, status)
                VALUES (?, ?, 'estimation', ?, ?, ?, ?, ?)`,
                [
                    caseId,
                    enquiry_id,
                    enquiryResult[0].client_id || null,
                    enquiryResult[0].project_name || null,
                    enquiryResult[0].description || null,
                    created_by,
                    'active'
                ]
            );

            case_id = caseResult.insertId;

            // Update enquiry with case_id
            await connection.execute(
                'UPDATE sales_enquiries SET case_id = ? WHERE id = ?',
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
                (estimation_id, heading, sort_order) 
                VALUES (?, ?, ?)`,
                [newEstimationId, section.name, section.order]
            );
        }

        // Generate smart pricing suggestions for common components
        // This will help estimators start with competitive prices from vendor history
        const smartPricingSuggestions = await generateSmartPricingSuggestions(enquiry_id, newEstimationId, connection);

        // Store pricing suggestions for later use in estimation items
        if (smartPricingSuggestions.length > 0) {
            const suggestionData = JSON.stringify(smartPricingSuggestions);
            await connection.execute(
                `UPDATE estimations SET pricing_suggestions = ? WHERE id = ?`,
                [suggestionData, newEstimationId]
            );
        }

        // Update sales enquiry status
        await connection.execute(
            'UPDATE sales_enquiries SET status = \'estimation\' WHERE id = ?',
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

        // Update case state to estimation
        await connection.execute(
            'UPDATE cases SET current_state = \'estimation\', updated_at = NOW() WHERE id = ?',
            [case_id]
        );

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
        console.error('Error creating estimation:', error);
        console.error('Error stack:', error.stack);
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
        let idField = 'e.id';
        const idValue = id;

        // Check if the ID is a formatted estimation_id rather than a numeric ID
        if (isNaN(parseInt(id)) && id.includes('/')) {
            idField = 'e.estimation_id';
            console.log(`Handling request with formatted estimation_id: ${id}`);
        } else {
            console.log(`Handling request with numeric id: ${id}`);
        }

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
            WHERE ${idField} = ? AND e.deleted_at IS NULL
        `, [idValue]);

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
                es.heading as section_name,
                COALESCE(es.sort_order, 1) as section_order
            FROM estimation_sections es
            WHERE es.estimation_id = ?
            ORDER BY COALESCE(es.sort_order, 1), es.id
        `, [estimation.id]);

        for (const section of sectionsRows) {
            // Get items for this section
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
                WHERE ei.section_id = ?
                ORDER BY ei.subsection_id, ei.id
            `, [section.id]);

            // Get subsections for this section
            const [subsectionsRows] = await db.execute(`
                SELECT 
                    id,
                    section_id,
                    subsection_name,
                    subsection_order,
                    created_at,
                    updated_at
                FROM estimation_subsections
                WHERE section_id = ?
                ORDER BY subsection_order, id
            `, [section.id]);

            // If there are no subsections but there are items, create a default subsection
            if (subsectionsRows.length === 0 && itemsRows.length > 0) {
                subsectionsRows.push({
                    id: 'default-' + section.id,
                    section_id: section.id,
                    subsection_name: 'General',
                    subsection_order: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                    items: itemsRows
                });
                // Don't put items directly on section when we have subsections
                section.items = [];
            } else {
                // For each subsection, initialize empty items array
                for (const subsection of subsectionsRows) {
                    subsection.items = [];
                }

                // Distribute items to their correct subsections based on subsection_id
                if (subsectionsRows.length > 0) {
                    // Group items by subsection_id
                    const itemsBySubsection = {};

                    for (const item of itemsRows) {
                        const subsectionId = item.subsection_id;

                        if (subsectionId) {
                            // Item has a specific subsection_id
                            if (!itemsBySubsection[subsectionId]) {
                                itemsBySubsection[subsectionId] = [];
                            }
                            itemsBySubsection[subsectionId].push(item);
                        } else {
                            // Item has no subsection_id (legacy data), put in first subsection
                            if (!itemsBySubsection[subsectionsRows[0].id]) {
                                itemsBySubsection[subsectionsRows[0].id] = [];
                            }
                            itemsBySubsection[subsectionsRows[0].id].push(item);
                        }
                    }

                    // Assign items to their respective subsections
                    for (const subsection of subsectionsRows) {
                        if (itemsBySubsection[subsection.id]) {
                            subsection.items = itemsBySubsection[subsection.id];
                        }
                    }

                    section.items = []; // Clear items from section level
                } else {
                    // No subsections exist, keep items at section level
                    section.items = itemsRows;
                }
            }

            section.subsections = subsectionsRows;
        }

        estimation.sections = sectionsRows;

        res.json({
            success: true,
            data: estimation
        });

    } catch (error) {
        console.error('Error fetching estimation details:', error);
        console.error('Request params:', req.params);

        // Log detailed error information
        if (error.sql) {
            console.error('SQL Error:', error.sql);
            console.error('SQL Error Code:', error.code);
            console.error('SQL Error Number:', error.errno);
            console.error('SQL Error State:', error.sqlState);
        }

        let statusCode = 500;
        let errorMessage = 'Error fetching estimation details';

        if (error.code === 'ER_BAD_FIELD_ERROR') {
            statusCode = 400;
            errorMessage = 'Invalid field in estimation query';
        } else if (error.code === 'ER_PARSE_ERROR') {
            statusCode = 400;
            errorMessage = 'SQL syntax error in estimation query';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            details: {
                id: req.params.id,
                errorCode: error.code || 'UNKNOWN_ERROR'
            }
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
             WHERE e.id = ? AND e.deleted_at IS NULL`,
            [req.params.id]
        );

        if (estimation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estimation not found'
            });
        }

        // Get sections with proper subsection structure
        const [sectionsRows] = await db.execute(`
            SELECT 
                es.*,
                es.heading as section_name,
                COALESCE(es.sort_order, 1) as section_order
            FROM estimation_sections es
            WHERE es.estimation_id = ?
            ORDER BY COALESCE(es.sort_order, 1), es.id
        `, [req.params.id]);

        for (const section of sectionsRows) {
            // Get items for this section
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
                WHERE ei.section_id = ?
                ORDER BY ei.subsection_id, ei.id
            `, [section.id]);

            // Get subsections for this section
            const [subsectionsRows] = await db.execute(`
                SELECT 
                    id,
                    section_id,
                    subsection_name,
                    subsection_order,
                    created_at,
                    updated_at
                FROM estimation_subsections
                WHERE section_id = ?
                ORDER BY subsection_order, id
            `, [section.id]);

            // If there are no subsections but there are items, create a default subsection
            if (subsectionsRows.length === 0 && itemsRows.length > 0) {
                subsectionsRows.push({
                    id: 'default-' + section.id,
                    section_id: section.id,
                    subsection_name: 'General',
                    subsection_order: 1,
                    created_at: new Date(),
                    updated_at: new Date(),
                    items: itemsRows
                });
                // Don't put items directly on section when we have subsections
                section.items = [];
            } else {
                // For each subsection, initialize empty items array
                for (const subsection of subsectionsRows) {
                    subsection.items = [];
                }

                // Distribute items to their correct subsections based on subsection_id
                if (subsectionsRows.length > 0) {
                    // Group items by subsection_id
                    const itemsBySubsection = {};

                    for (const item of itemsRows) {
                        const subsectionId = item.subsection_id;

                        if (subsectionId) {
                            // Item has a specific subsection_id
                            if (!itemsBySubsection[subsectionId]) {
                                itemsBySubsection[subsectionId] = [];
                            }
                            itemsBySubsection[subsectionId].push(item);
                        } else {
                            // Item has no subsection_id (legacy data), put in first subsection
                            if (!itemsBySubsection[subsectionsRows[0].id]) {
                                itemsBySubsection[subsectionsRows[0].id] = [];
                            }
                            itemsBySubsection[subsectionsRows[0].id].push(item);
                        }
                    }

                    // Assign items to their respective subsections
                    for (const subsection of subsectionsRows) {
                        if (itemsBySubsection[subsection.id]) {
                            subsection.items = itemsBySubsection[subsection.id];
                        }
                    }

                    section.items = []; // Clear items from section level
                } else {
                    // No subsections exist, keep items at section level
                    section.items = itemsRows;
                }
            }

            section.subsections = subsectionsRows;
        }

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

        const parsedSections = sectionsRows;

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
            'UPDATE estimations SET status = \'submitted\' WHERE id = ?',
            [id]
        );

        // Create case history entry (temporarily commented out)
        // await connection.execute(
        //     `INSERT INTO case_history 
        //     (reference_type, reference_id, status, notes, created_by) 
        //     VALUES (?, ?, ?, ?, ?)`,
        //     ['estimation', id, 'submitted', 'Submitted for approval', req.user.id]
        // );

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

        // Get the case_id from the estimation to update case state
        const [estimationData] = await connection.execute(
            'SELECT case_id FROM estimations WHERE id = ?',
            [id]
        );

        if (estimationData[0]?.case_id) {
            // Update case current_state to 'estimation' when estimation is approved
            await connection.execute(
                `UPDATE cases 
                 SET current_state = 'estimation', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [estimationData[0].case_id]
            );

            // Create case state transition history
            await connection.execute(
                `INSERT INTO case_state_transitions 
                (case_id, from_state, to_state, notes, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [estimationData[0].case_id, 'enquiry', 'estimation', 'Estimation approved - case moved to estimation stage', req.user.id]
            );
        }

        // Create case history entry (temporarily commented out)
        // await connection.execute(
        //     `INSERT INTO case_history 
        //     (reference_type, reference_id, status, notes, created_by) 
        //     VALUES (?, ?, ?, ?, ?)`,
        //     ['estimation', id, 'approved', 'Estimation approved', req.user.id]
        // );

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

exports.reject = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { reason } = req.body;

        // Verify user role is director or admin
        if (!['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to reject estimations');
        }

        // Update estimation status (only updating status since rejected_by, rejected_at, rejection_reason columns don't exist)
        await connection.execute(
            `UPDATE estimations 
             SET status = 'rejected', notes = CASE 
                 WHEN notes IS NULL THEN ?
                 ELSE CONCAT(notes, '\n--- REJECTED ---\n', ?)
             END
             WHERE id = ?`,
            [reason ? `Rejected: ${reason}` : 'Rejected', reason ? `Rejected: ${reason}` : 'Rejected', id]
        );

        // Create case history entry (temporarily commented out)
        // await connection.execute(
        //     `INSERT INTO case_history 
        //     (reference_type, reference_id, status, notes, created_by) 
        //     VALUES (?, ?, ?, ?, ?)`,
        //     ['estimation', id, 'rejected', reason ? `Estimation rejected: ${reason}` : 'Estimation rejected', req.user.id]
        // );

        // Use audit logging
        const { auditFunctions } = require('../middleware/auditLogger');
        await auditFunctions.reject(req.user.id, 'ESTIMATION', id, reason, req.ip);

        await connection.commit();

        res.json({
            success: true,
            message: 'Estimation rejected successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error rejecting estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.returnToDraft = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Verify estimation is in rejected status
        const [estimation] = await connection.execute(
            'SELECT status, created_by FROM estimations WHERE id = ?',
            [id]
        );

        if (estimation.length === 0) {
            throw new Error('Estimation not found');
        }

        if (estimation[0].status !== 'rejected') {
            throw new Error('Only rejected estimations can be returned to draft');
        }

        // Check if user is the creator or has admin/director role
        if (estimation[0].created_by !== req.user.id && !['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to return estimation to draft');
        }

        // Update estimation status back to draft (only updating status since rejection columns don't exist)
        await connection.execute(
            `UPDATE estimations 
             SET status = 'draft'
             WHERE id = ?`,
            [id]
        );

        // Create case history entry (temporarily commented out)
        // await connection.execute(
        //     `INSERT INTO case_history 
        //     (reference_type, reference_id, status, notes, created_by) 
        //     VALUES (?, ?, ?, ?, ?)`,
        //     ['estimation', id, 'draft', 'Estimation returned to draft for corrections', req.user.id]
        // );

        await connection.commit();

        res.json({
            success: true,
            message: 'Estimation returned to draft successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error returning estimation to draft',
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
            'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM estimation_sections WHERE estimation_id = ?',
            [id]
        );

        const [result] = await db.execute(
            `INSERT INTO estimation_sections (estimation_id, heading, sort_order) 
             VALUES (?, ?, ?)`,
            [id, section_name || 'Main Panel', orderRows[0].next_order]
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

        // Validate estimation is in draft status before allowing modifications
        const [estimationStatus] = await db.execute(
            'SELECT status FROM estimations WHERE id = ?',
            [estimation_id]
        );

        if (!estimationStatus[0] || estimationStatus[0].status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify approved estimation. Please return to draft status first.'
            });
        }

        // Ensure product exists in products table (sync from inventory if needed)
        const [existingProduct] = await db.execute(
            'SELECT id FROM products WHERE id = ?',
            [product_id]
        );

        if (existingProduct.length === 0) {
            // Get product details from inventory_items_enhanced and create in products table
            const [inventoryItem] = await db.execute(
                'SELECT id, item_name, item_code, standard_cost, primary_unit FROM inventory_items_enhanced WHERE id = ?',
                [product_id]
            );

            if (inventoryItem.length > 0) {
                const item = inventoryItem[0];
                await db.execute(
                    'INSERT INTO products (id, name, product_code, make, model, mrp, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.id, item.item_name, item.item_code, item.brand || item.manufacturer || null, item.model_number || null, item.standard_cost || 0, item.primary_unit || 'nos']
                );
            } else {
                return res.status(404).json({
                    success: false,
                    message: `Product with ID ${product_id} not found in inventory. Please add products to the inventory first or select an existing product.`
                });
            }
        }

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

        // Update estimation totals after adding item
        const [totals] = await db.execute(
            `SELECT 
                SUM(mrp * quantity) as total_mrp,
                SUM((mrp * quantity) - (final_price)) as total_discount,
                SUM(final_price) as total_final_price
            FROM estimation_items
            WHERE estimation_id = ?`,
            [estimation_id]
        );

        await db.execute(
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

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: {
                id: result.insertId,
                estimation_totals: {
                    total_mrp: totals[0].total_mrp || 0,
                    total_discount: totals[0].total_discount || 0,
                    total_final_price: totals[0].total_final_price || 0
                }
            }
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
            'SELECT mrp, quantity, estimation_id FROM estimation_items WHERE id = ?',
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

        // Update estimation totals after updating item discount
        const [totals] = await db.execute(
            `SELECT 
                SUM(mrp * quantity) as total_mrp,
                SUM((mrp * quantity) - (final_price)) as total_discount,
                SUM(final_price) as total_final_price
            FROM estimation_items
            WHERE estimation_id = ?`,
            [item.estimation_id]
        );

        await db.execute(
            `UPDATE estimations 
            SET total_mrp = ?, total_discount = ?, total_final_price = ?
            WHERE id = ?`,
            [
                totals[0].total_mrp || 0,
                totals[0].total_discount || 0,
                totals[0].total_final_price || 0,
                item.estimation_id
            ]
        );

        res.json({
            success: true,
            message: 'Item discount updated successfully',
            data: {
                estimation_totals: {
                    total_mrp: totals[0].total_mrp || 0,
                    total_discount: totals[0].total_discount || 0,
                    total_final_price: totals[0].total_final_price || 0
                }
            }
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

        // Get estimation_id before deleting the item
        const [itemRows] = await db.execute(
            'SELECT estimation_id FROM estimation_items WHERE id = ?',
            [id]
        );

        if (itemRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const estimation_id = itemRows[0].estimation_id;

        await db.execute('DELETE FROM estimation_items WHERE id = ?', [id]);

        // Update estimation totals after deleting item
        const [totals] = await db.execute(
            `SELECT 
                SUM(mrp * quantity) as total_mrp,
                SUM((mrp * quantity) - (final_price)) as total_discount,
                SUM(final_price) as total_final_price
            FROM estimation_items
            WHERE estimation_id = ?`,
            [estimation_id]
        );

        await db.execute(
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

        res.json({
            success: true,
            message: 'Item deleted successfully',
            data: {
                estimation_totals: {
                    total_mrp: totals[0].total_mrp || 0,
                    total_discount: totals[0].total_discount || 0,
                    total_final_price: totals[0].total_final_price || 0
                }
            }
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

// Get estimation by case number
exports.getEstimationByCase = async (req, res) => {
    try {
        const { caseNumber } = req.params;

        const query = `
            SELECT 
                e.*,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                u.full_name as created_by_name,
                au.full_name as approved_by_name,
                cases.case_number
            FROM estimations e
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN users au ON e.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE cases.case_number = ? AND e.deleted_at IS NULL AND e.status != 'approved'
            ORDER BY e.created_at DESC
            LIMIT 1
        `;

        const [results] = await db.execute(query, [caseNumber]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No estimation found for case ${caseNumber}`
            });
        }

        res.json({
            success: true,
            data: results[0]
        });

    } catch (error) {
        console.error('Error fetching estimation by case:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching estimation by case number',
            error: error.message
        });
    }
};

// Recalculate totals for all existing estimations (one-time fix)
exports.recalculateAllTotals = async (req, res) => {
    try {
        // Get all estimations
        const [estimations] = await db.execute(
            'SELECT id FROM estimations WHERE deleted_at IS NULL'
        );

        let updated = 0;

        for (const estimation of estimations) {
            // Calculate totals for this estimation
            const [totals] = await db.execute(
                `SELECT 
                    SUM(mrp * quantity) as total_mrp,
                    SUM((mrp * quantity) - (final_price)) as total_discount,
                    SUM(final_price) as total_final_price
                FROM estimation_items
                WHERE estimation_id = ?`,
                [estimation.id]
            );

            // Update the estimation with calculated totals
            await db.execute(
                `UPDATE estimations 
                SET total_mrp = ?, total_discount = ?, total_final_price = ?
                WHERE id = ?`,
                [
                    totals[0].total_mrp || 0,
                    totals[0].total_discount || 0,
                    totals[0].total_final_price || 0,
                    estimation.id
                ]
            );

            updated++;
        }

        res.json({
            success: true,
            message: `Totals recalculated for ${updated} estimations`
        });

    } catch (error) {
        console.error('Error recalculating totals:', error);
        res.status(500).json({
            success: false,
            message: 'Error recalculating totals',
            error: error.message
        });
    }
};

// Generate estimation PDF
exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch estimation data
        const query = `
            SELECT 
                e.*,
                se.enquiry_id,
                se.project_name,
                se.description,
                c.company_name as client_name,
                c.address as client_address,
                c.phone as client_phone,
                c.email as client_email,
                c.city,
                c.state
            FROM estimations e
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            WHERE e.id = ? AND e.deleted_at IS NULL
        `;

        const [estimationRows] = await db.execute(query, [id]);

        if (estimationRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Estimation not found'
            });
        }

        const estimation = estimationRows[0];

        // Fetch estimation sections, subsections, and items
        const itemsQuery = `
            SELECT 
                ei.*,
                p.name as item_name,
                p.hsn_code,
                p.unit,
                es.heading as section_name
            FROM estimation_items ei
            LEFT JOIN products p ON ei.product_id = p.id
            LEFT JOIN estimation_sections es ON ei.section_id = es.id
            WHERE ei.estimation_id = ?
            ORDER BY es.sort_order, ei.id
        `;

        const [itemRows] = await db.execute(itemsQuery, [id]);

        // Group items by sections
        const sections = {};
        itemRows.forEach(item => {
            const sectionName = item.section_name || 'General';

            if (!sections[sectionName]) {
                sections[sectionName] = [];
            }

            sections[sectionName].push({
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                mrp: item.mrp,
                discount_percentage: item.discount_percentage,
                discounted_price: item.discounted_price,
                final_price: item.final_price
            });
        });

        // Prepare estimation data for PDF
        const estimationData = {
            estimation_id: estimation.estimation_id,
            date: estimation.created_at,
            client_name: estimation.client_name,
            client_address: estimation.client_address,
            client_phone: estimation.client_phone,
            client_email: estimation.client_email,
            project_name: estimation.project_name,
            description: estimation.description,
            sections: sections,
            total_mrp: estimation.total_mrp,
            total_discount: estimation.total_discount,
            total_final_price: estimation.total_final_price,
            status: estimation.status,
            notes: estimation.notes
        };

        // Generate PDF with clean filename
        const cleanEstimationId = estimation.estimation_id.replace(/\//g, '_');
        const fileName = `estimation_${cleanEstimationId}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../../uploads/documents', fileName);

        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filePath);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const pdfGenerator = new PDFGenerator();
        await pdfGenerator.generateEstimationPDF(estimationData, filePath);

        // Return file path for download
        res.json({
            success: true,
            message: 'PDF generated successfully',
            filePath: `/uploads/documents/${fileName}`,
            downloadUrl: `/api/pdf/download/${fileName}`
        });

    } catch (error) {
        console.error('Error generating estimation PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            message: error.message
        });
    }
};

// Delete estimation (soft delete)
exports.deleteEstimation = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Check if estimation exists - handle both numeric ID and estimation_id format
        let estimation;
        if (isNaN(id)) {
            // String ID like VESPL/ES/2526/001
            [estimation] = await connection.execute(
                'SELECT id, status, created_by, estimation_id FROM estimations WHERE estimation_id = ? AND deleted_at IS NULL',
                [id]
            );
        } else {
            // Numeric ID
            [estimation] = await connection.execute(
                'SELECT id, status, created_by, estimation_id FROM estimations WHERE id = ? AND deleted_at IS NULL',
                [id]
            );
        }

        if (estimation.length === 0) {
            throw new Error('Estimation not found');
        }

        // Check if user has permission to delete (creator or admin/director)
        if (estimation[0].created_by !== req.user.id && !['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to delete estimation');
        }

        // Soft delete the estimation using the numeric ID
        await connection.execute(
            'UPDATE estimations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [estimation[0].id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Estimation deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error deleting estimation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get smart pricing suggestions for an estimation
exports.getSmartPricingSuggestions = async (req, res) => {
    try {
        const { id } = req.params;

        // Get estimation details
        const [estimationResult] = await db.execute(
            `SELECT id, enquiry_id, pricing_suggestions FROM estimations WHERE id = ?`,
            [id]
        );

        if (estimationResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estimation not found'
            });
        }

        const estimation = estimationResult[0];
        let suggestions = [];

        // Check if we have cached suggestions
        if (estimation.pricing_suggestions) {
            try {
                suggestions = JSON.parse(estimation.pricing_suggestions);
            } catch (error) {
                console.error('Error parsing cached suggestions:', error);
            }
        }

        // If no cached suggestions or they're old, generate new ones
        if (suggestions.length === 0) {
            const connection = await db.getConnection();
            try {
                suggestions = await generateSmartPricingSuggestions(
                    estimation.enquiry_id,
                    estimation.id,
                    connection
                );

                // Cache the new suggestions
                if (suggestions.length > 0) {
                    const suggestionData = JSON.stringify(suggestions);
                    await connection.execute(
                        `UPDATE estimations SET pricing_suggestions = ? WHERE id = ?`,
                        [suggestionData, estimation.id]
                    );
                }
            } finally {
                connection.release();
            }
        }

        res.json({
            success: true,
            message: 'Smart pricing suggestions retrieved successfully',
            data: {
                estimation_id: estimation.id,
                suggestions: suggestions,
                generated_at: new Date(),
                suggestion_count: suggestions.length
            }
        });

    } catch (error) {
        console.error('Error getting smart pricing suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving smart pricing suggestions',
            error: error.message
        });
    }
};

// Get vendor price comparison for specific products
exports.getVendorPriceComparison = async (req, res) => {
    try {
        const { productIds } = req.body; // Array of product IDs

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs array is required'
            });
        }

        const connection = await db.getConnection();
        try {
            const comparisons = [];

            for (const productId of productIds) {
                // Get recent price history for this product
                const [priceHistory] = await connection.execute(`
                    SELECT vph.*, s.name as supplier_name, s.rating, s.location,
                           p.name as product_name, p.category, p.unit
                    FROM vendor_price_history vph
                    JOIN suppliers s ON vph.supplier_id = s.id
                    JOIN products p ON vph.product_id = p.id
                    WHERE vph.product_id = ?
                    AND vph.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    ORDER BY vph.unit_price ASC, s.rating DESC
                    LIMIT 5
                `, [productId]);

                if (priceHistory.length > 0) {
                    const product = priceHistory[0];

                    comparisons.push({
                        product_id: productId,
                        product_name: product.product_name,
                        category: product.category,
                        unit: product.unit,
                        vendor_options: priceHistory.map(vh => ({
                            supplier_id: vh.supplier_id,
                            supplier_name: vh.supplier_name,
                            unit_price: vh.unit_price,
                            rating: vh.rating,
                            location: vh.location,
                            last_quoted: vh.created_at,
                            discount_available: vh.discount_percentage || 0,
                            min_quantity: vh.min_quantity || 1
                        })),
                        best_price: Math.min(...priceHistory.map(vh => vh.unit_price)),
                        avg_price: priceHistory.reduce((sum, vh) => sum + vh.unit_price, 0) / priceHistory.length,
                        price_variance: Math.max(...priceHistory.map(vh => vh.unit_price)) - Math.min(...priceHistory.map(vh => vh.unit_price))
                    });
                }
            }

            res.json({
                success: true,
                message: 'Vendor price comparison retrieved successfully',
                data: {
                    comparisons: comparisons,
                    generated_at: new Date(),
                    products_analyzed: comparisons.length
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error getting vendor price comparison:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving vendor price comparison',
            error: error.message
        });
    }
};
