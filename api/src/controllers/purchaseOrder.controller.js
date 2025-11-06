const purchaseOrderService = require('../services/purchaseOrder.service');
const PDFGenerator = require('../utils/pdfGenerator');
const { BaseError } = require('../utils/errors');
const logger = require('../utils/logger');
const db = require('../config/database');
const path = require('path');

exports.getAllPurchaseOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                po.id,
                po.po_number as po_id,
                po.supplier_id,
                po.po_date as date,
                po.expected_delivery_date as delivery_date,
                po.status,
                po.total_amount,
                po.tax_amount,
                po.grand_total,
                po.created_by,
                s.vendor_name as supplier_name,
                u.full_name as created_by_name
            FROM purchase_orders po
            LEFT JOIN inventory_vendors s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.created_by = u.id
            ORDER BY po.po_date DESC
        `;

        const [rows] = await db.execute(query);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase orders',
            error: error.message
        });
    }
};

// Get approved purchase orders for GRN creation
exports.getApprovedPurchaseOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                po.id,
                po.po_number as po_number,
                po.supplier_id,
                po.po_date,
                po.expected_delivery_date,
                po.status,
                po.total_amount,
                po.tax_amount,
                po.grand_total,
                s.vendor_name,
                s.address as supplier_address,
                s.contact_person,
                s.phone as supplier_phone,
                s.email as supplier_email
            FROM purchase_orders po
            LEFT JOIN inventory_vendors s ON po.supplier_id = s.id
            WHERE po.status = 'approved'
            AND po.id NOT IN (
                SELECT DISTINCT purchase_order_id 
                FROM goods_received_notes 
                WHERE purchase_order_id IS NOT NULL
                AND status IN ('draft', 'verified', 'approved')
            )
            ORDER BY po.po_date DESC
        `;

        const [rows] = await db.execute(query);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching approved purchase orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching approved purchase orders',
            error: error.message
        });
    }
};

// Get purchase order with items by ID
exports.getPurchaseOrderWithItems = async (req, res) => {
    try {
        const { id } = req.params;

        // Get purchase order details
        const poQuery = `
            SELECT 
                po.id,
                po.po_number as po_number,
                po.supplier_id,
                po.po_date,
                po.expected_delivery_date,
                po.status,
                po.total_amount,
                po.tax_amount,
                po.grand_total,
                s.vendor_name,
                s.address as supplier_address,
                s.contact_person,
                s.phone as supplier_phone,
                s.email as supplier_email
            FROM purchase_orders po
            LEFT JOIN inventory_vendors s ON po.supplier_id = s.id
            WHERE po.id = ?
        `;

        const [poRows] = await db.execute(poQuery, [id]);

        if (poRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Get purchase order items
        const itemsQuery = `
            SELECT 
                poi.id,
                poi.product_id,
                poi.quantity,
                poi.price as unit_price,
                poi.amount as total_price,
                p.name as product_name,
                p.part_code,
                p.make,
                p.model,
                p.description,
                p.unit
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.po_id = ?
            ORDER BY poi.id
        `;

        const [itemsRows] = await db.execute(itemsQuery, [id]);

        res.json({
            success: true,
            data: {
                ...poRows[0],
                items: itemsRows
            }
        });
    } catch (error) {
        console.error('Error fetching purchase order with items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase order details',
            error: error.message
        });
    }
};

exports.getApprovedPurchaseRequisitions = async (req, res) => {
    try {
        const query = `
            SELECT 
                pr.id,
                pr.pr_number,
                COALESCE(s.supplier_name, iv.vendor_name) as vendor_name,
                pr.status,
                pr.pr_date as created_date,
                cl.company_name as client_name,
                c.case_number,
                COUNT(pri.id) as item_count
            FROM purchase_requisitions pr
            LEFT JOIN cases c ON pr.case_id = c.id
            LEFT JOIN clients cl ON c.client_id = cl.id
            LEFT JOIN suppliers s ON pr.supplier_id = s.id
            LEFT JOIN inventory_vendors iv ON pr.supplier_id = iv.id
            LEFT JOIN purchase_requisition_items pri ON pr.id = pri.pr_id
            WHERE pr.status = 'approved' 
            AND pr.id NOT IN (
                SELECT purchase_request_id FROM purchase_orders 
                WHERE purchase_request_id IS NOT NULL
            )
            GROUP BY pr.id, pr.pr_number, COALESCE(s.supplier_name, iv.vendor_name), pr.status, pr.pr_date, cl.company_name, c.case_number
            ORDER BY pr.pr_date DESC
        `;

        const [rows] = await db.execute(query);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error fetching approved purchase requisitions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching approved purchase requisitions',
            error: error.message
        });
    }
};

exports.createFromPurchaseRequisition = async (req, res) => {
    console.log('=== CREATE PO FROM PR START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            purchase_requisition_id,
            delivery_date,
            items,
            notes
        } = req.body;

        let { supplier_id } = req.body;

        console.log('Extracted values:', {
            purchase_requisition_id,
            supplier_id: supplier_id || 'undefined',
            delivery_date,
            items: items?.length || 0,
            notes
        });

        // Validation
        if (!purchase_requisition_id) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Purchase requisition ID is required',
                error: 'MISSING_PURCHASE_REQUISITION_ID'
            });
        }

        // Get PR details
        const [prDetails] = await connection.execute(
            'SELECT * FROM purchase_requisitions WHERE id = ?',
            [purchase_requisition_id]
        );

        if (prDetails.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: `Purchase requisition with ID ${purchase_requisition_id} not found`,
                error: 'PR_NOT_FOUND'
            });
        }

        // If supplier_id is not provided, try to get it from the PR or use a default
        if (!supplier_id) {
            // Check if the PR has a supplier_id
            if (prDetails[0].supplier_id) {
                supplier_id = prDetails[0].supplier_id;
                console.log(`Using supplier_id from PR: ${supplier_id}`);
            } else {
                // For now, use the first available supplier as fallback
                const [suppliers] = await connection.execute('SELECT id FROM inventory_vendors LIMIT 1');
                if (suppliers.length > 0) {
                    supplier_id = suppliers[0].id;
                    console.log(`Using fallback supplier_id: ${supplier_id}`);
                } else {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'No supplier available for purchase order creation',
                        error: 'NO_SUPPLIER_AVAILABLE'
                    });
                }
            }
        }

        // Generate PO number
        const [lastPO] = await connection.execute(
            'SELECT po_id FROM purchase_orders ORDER BY id DESC LIMIT 1'
        );

        let nextPoNumber = 'VESPL/PO/2526/001';
        if (lastPO.length > 0) {
            const parts = lastPO[0].po_id.split('/');
            // Only use the number if it matches our expected format
            if (parts.length >= 4 && parts[0] === 'VESPL' && parts[1] === 'PO') {
                const lastNumber = parseInt(parts[3]);
                if (!isNaN(lastNumber)) {
                    nextPoNumber = `VESPL/PO/2526/${String(lastNumber + 1).padStart(3, '0')}`;
                }
            }
            // If format doesn't match, keep the default 001
        }

        // Get PR items if not provided in request
        let prItems = items;
        let itemsResult = []; // Declare itemsResult outside the if block

        if (!prItems || prItems.length === 0) {
            const [queryResult] = await connection.execute(
                `SELECT pri.*, p.name as product_name 
                 FROM purchase_requisition_items pri 
                 LEFT JOIN products p ON pri.product_id = p.id 
                 WHERE pri.pr_id = ?`,
                [purchase_requisition_id]
            );
            itemsResult = queryResult; // Store the result for later reference
            // Process items and try to match with existing products
            prItems = [];
            for (const item of itemsResult) {
                let productId = item.product_id;

                // If no product_id, try to find matching product by name
                if (!productId && item.item_name) {
                    const [matchingProducts] = await connection.execute(
                        'SELECT id FROM products WHERE name LIKE ? LIMIT 1',
                        [`%${item.item_name}%`]
                    );

                    if (matchingProducts.length > 0) {
                        productId = matchingProducts[0].id;
                        console.log(`Matched item "${item.item_name}" to product ID ${productId}`);
                    } else {
                        // Create a new generic product for this item
                        const [newProduct] = await connection.execute(
                            'INSERT INTO products (name, description, unit, created_at) VALUES (?, ?, ?, NOW())',
                            [item.item_name || 'Generic Item', item.description || '', item.unit || 'Nos']
                        );
                        productId = newProduct.insertId;
                        console.log(`Created new product ID ${productId} for item "${item.item_name}"`);
                    }
                }

                prItems.push({
                    product_id: productId,
                    product_name: item.item_name || item.product_name || 'Generic Item',
                    description: item.description || '',
                    quantity: item.quantity,
                    unit_price: item.estimated_price || 0,
                    unit: item.unit || 'Nos',
                    hsn_code: item.hsn_code || ''
                });
            }

            console.log(`Processing ${prItems.length} items from purchase requisition`);
        }

        // Validate that we have items to process
        if (!prItems || prItems.length === 0) {
            // Return 400 for business logic errors, not 500
            const prRef = prDetails[0]?.pr_number || prDetails[0]?.id || purchase_requisition_id;
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Purchase Requisition ${prRef} has no items. Please add items to the purchase requisition before creating a purchase order.`,
                error: 'NO_ITEMS_FOUND'
            });
        }

        // Calculate totals
        let totalAmount = 0;
        let totalTax = 0;

        // Get supplier details for tax calculation (handle both suppliers and inventory_vendors tables)
        let supplier = null;
        try {
            const [supplierResult] = await connection.execute(
                'SELECT state FROM inventory_vendors WHERE id = ?',
                [supplier_id]
            );
            if (supplierResult.length > 0) {
                supplier = supplierResult[0];
            } else {
                // Try inventory_vendors table
                const [vendorResult] = await connection.execute(
                    'SELECT state FROM inventory_vendors WHERE id = ?',
                    [supplier_id]
                );
                supplier = vendorResult[0] || { state: 'Karnataka' }; // Default state
            }
        } catch (err) {
            console.warn('Could not fetch supplier state, using default:', err.message);
            supplier = { state: 'Karnataka' }; // Default state
        }

        const isInterState = supplier?.state !== 'Karnataka';

        // Create purchase order
        const [po] = await connection.execute(
            `INSERT INTO purchase_orders 
            (po_id, po_number, purchase_request_id, supplier_id, date, po_date, expected_delivery_date,
             total_amount, tax_amount, grand_total, status, created_by) 
            VALUES (?, ?, ?, ?, CURDATE(), CURDATE(), ?, ?, ?, ?, ?, ?)`,
            [
                nextPoNumber,
                nextPoNumber,
                purchase_requisition_id || null,
                supplier_id || null,
                delivery_date || null,
                0, // Will update after adding items
                0, // Will update after adding items
                0, // Will update after adding items
                'pending', // Set status to pending instead of draft
                req.user?.id || 1
            ]
        );

        // Add items
        for (const item of prItems) {
            const amount = item.quantity * item.unit_price;
            const taxPercentage = isInterState ? 18 : 9;
            const taxAmount = (amount * taxPercentage) / 100;

            totalAmount += amount;
            totalTax += taxAmount;

            await connection.execute(
                `INSERT INTO purchase_order_items 
                (po_id, product_id, quantity, unit, price, tax_percentage, amount) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    po.insertId,
                    item.product_id || null,
                    item.quantity || 0,
                    item.unit || 'Nos',
                    item.unit_price || 0,
                    taxPercentage,
                    amount
                ]
            );
        }

        // Update purchase order totals
        const grandTotal = totalAmount + totalTax;
        await connection.execute(
            `UPDATE purchase_orders 
             SET total_amount = ?, tax_amount = ?, grand_total = ?
             WHERE id = ?`,
            [totalAmount, totalTax, grandTotal, po.insertId]
        );

        // Update purchase requisition status to indicate PO has been created
        await connection.execute(
            'UPDATE purchase_requisitions SET status = ? WHERE id = ?',
            ['closed', purchase_requisition_id]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: {
                id: po.insertId,
                po_id: nextPoNumber,
                total_amount: totalAmount,
                total_tax: totalTax,
                grand_total: grandTotal
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating purchase order from requisition:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);

        // Differentiate between business logic errors and server errors
        const isBusinesLogicError =
            error.message.includes('not found') ||
            error.message.includes('no items') ||
            error.message.includes('invalid') ||
            error.message.includes('missing required');

        const statusCode = isBusinesLogicError ? 400 : 500;
        const message = isBusinesLogicError ? error.message : 'Internal server error creating purchase order';

        res.status(statusCode).json({
            success: false,
            message,
            error: isBusinesLogicError ? 'BUSINESS_LOGIC_ERROR' : 'INTERNAL_SERVER_ERROR',
            details: statusCode === 500 ? 'Please contact support' : error.message
        });
    } finally {
        connection.release();
    }
};

exports.createPurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const {
            purchase_request_id,
            supplier_id,
            delivery_date,
            shipping_address,
            billing_address,
            payment_terms,
            delivery_terms,
            notes,
            items
        } = req.body;

        // Generate purchase order ID (VESPL/PO/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const poId = await DocumentNumberGenerator.generateNumber('PO', financialYear);

        // Calculate totals
        let totalAmount = 0;
        let totalTax = 0;

        // Get supplier details for tax calculation
        const [supplier] = await connection.execute(
            'SELECT state FROM suppliers WHERE id = ?',
            [supplier_id]
        );

        const isInterState = supplier[0].state !== 'Karnataka';

        // Create purchase order
        const [po] = await connection.execute(
            `INSERT INTO purchase_orders 
            (po_id, purchase_request_id, supplier_id, date, delivery_date,
             shipping_address, billing_address, payment_terms, delivery_terms,
             total_amount, total_tax, grand_total, notes, created_by) 
            VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                poId,
                purchase_request_id,
                supplier_id,
                delivery_date,
                shipping_address,
                billing_address,
                payment_terms,
                delivery_terms,
                0, // Will update after adding items
                0, // Will update after adding items
                0, // Will update after adding items
                notes,
                req.user.id
            ]
        );

        // Add items
        for (const item of items) {
            const amount = item.quantity * item.price;
            const taxPercentage = isInterState ? 18 : 9; // Example: 18% IGST or 9% each for CGST/SGST
            const taxAmount = (amount * taxPercentage) / 100;

            totalAmount += amount;
            totalTax += taxAmount;

            await connection.execute(
                `INSERT INTO purchase_order_items 
                (po_id, product_id, quantity, unit, price, tax_percentage, amount) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    po.insertId,
                    item.product_id,
                    item.quantity,
                    item.unit,
                    item.price,
                    taxPercentage,
                    amount
                ]
            );
        }

        // Update purchase order totals
        const grandTotal = totalAmount + totalTax;
        await connection.execute(
            `UPDATE purchase_orders 
             SET total_amount = ?, total_tax = ?, grand_total = ?
             WHERE id = ?`,
            [totalAmount, totalTax, grandTotal, po.insertId]
        );

        // Update purchase request status
        await connection.execute(
            'UPDATE purchase_requisitions SET status = \'closed\' WHERE id = ?',
            [purchase_request_id]
        );

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['purchase_order', po.insertId, 'draft', 'Purchase order created', req.user.id]
        );

        // Generate proforma invoice ID (VESPL/PI/2526/XXX)
        const piId = await DocumentNumberGenerator.generateNumber('PI', financialYear);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: {
                id: po.insertId,
                po_id: poId,
                pi_id: piId,
                total_amount: totalAmount,
                total_tax: totalTax,
                grand_total: grandTotal
            }
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error creating purchase order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        // Get PO details
        const [po] = await db.execute(
            `SELECT po.*, 
                    '' as pr_reference,
                    s.vendor_name,
                    s.contact_person as supplier_contact,
                    s.address as supplier_address,
                    '' as supplier_gstin,
                    u1.full_name as created_by_name,
                    u2.full_name as approved_by_name
             FROM purchase_orders po
             JOIN inventory_vendors s ON po.supplier_id = s.id
             JOIN users u1 ON po.created_by = u1.id
             LEFT JOIN users u2 ON po.approved_by = u2.id
             WHERE po.id = ?`,
            [req.params.id]
        );

        if (po.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Get PO items
        const [items] = await db.execute(
            `SELECT poi.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.description as specifications
             FROM purchase_order_items poi
             JOIN products p ON poi.product_id = p.id
             WHERE poi.po_id = ?`,
            [req.params.id]
        );

        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'purchase_order' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                purchase_order: po[0],
                items,
                history
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase order',
            error: error.message
        });
    }
};

exports.approvePurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Verify user role is director or admin
        if (!['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to approve purchase orders');
        }

        // Update PO status
        await connection.execute(
            `UPDATE purchase_orders 
             SET status = 'approved',
                 approved_by = ?,
                 approved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [req.user.id, id]
        );

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['purchase_order', id, 'approved', 'Purchase order approved', req.user.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Purchase order approved successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error approving purchase order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.generatePDF = async (req, res) => {
    try {
        console.log('=== GENERATE PDF FUNCTION CALLED ===');
        const { id, type = 'po' } = req.params; // type can be 'po' or 'pi'
        console.log('PDF Generation params:', { id, type });

        // Get PO details
        const [po] = await db.execute(
            `SELECT po.*, 
                    '' as pr_reference,
                    s.vendor_name,
                    s.contact_person as supplier_contact,
                    s.address as supplier_address,
                    '' as supplier_gstin,
                    '' as bank_name,
                    '' as account_number,
                    '' as ifsc_code
             FROM purchase_orders po
             JOIN inventory_vendors s ON po.supplier_id = s.id
             WHERE po.id = ?`,
            [id]
        );

        if (!po[0]) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Get PO items
        const [items] = await db.execute(
            `SELECT poi.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.description as specifications
             FROM purchase_order_items poi
             JOIN products p ON poi.product_id = p.id
             WHERE poi.po_id = ?`,
            [id]
        );

        // Initialize PDF generator
        const pdf = new PDFGenerator();
        pdf.createNewDocument();

        // Generate PDF
        await pdf.generateHeader({
            logo: path.join(__dirname, '../../public/assets/logo.png'),
            address: 'Your Company Address',
            phone: 'Phone Number',
            email: 'email@company.com',
            gstin: 'GSTIN Number'
        });

        await pdf.generateDocumentTitle(
            type === 'po' ? 'PURCHASE ORDER' : 'PROFORMA INVOICE',
            type === 'po' ? po[0].po_id : po[0].pi_id,
            po[0].date
        );

        // Add supplier details
        pdf.doc
            .fontSize(10)
            .text('To:', 50, 200)
            .text(po[0].supplier_name, 50, 215)
            .text(po[0].supplier_address, 50, 230)
            .text(`GSTIN: ${po[0].supplier_gstin}`, 50, 260)
            .text(`Contact: ${po[0].supplier_contact}`, 50, 275);

        // Add reference information
        pdf.doc
            .text(`Ref: ${po[0].pr_reference}`, 350, 200)
            .text(`Delivery Date: ${po[0].delivery_date}`, 350, 215);

        // Add items table
        const headers = ['Sr No', 'Item', 'Specifications', 'Qty', 'Unit', 'Rate', 'Tax %', 'Amount'];
        const tableData = items.map((item, index) => [
            index + 1,
            `${item.product_name}\n${item.make || ''}/${item.model || ''}\n${item.part_code || ''}`,
            item.specifications || '',
            item.quantity || 0,
            item.unit || '',
            (parseFloat(item.price) || 0).toFixed(2),
            item.tax_percentage || 0,
            (parseFloat(item.amount) || 0).toFixed(2)
        ]);

        await pdf.generateTable(headers, tableData, 300);

        // Add totals
        pdf.doc
            .fontSize(10)
            .text('Sub Total:', 400, pdf.doc.y + 20)
            .text((parseFloat(po[0].total_amount) || 0).toFixed(2), 480, pdf.doc.y - 12)
            .text('Tax:', 400, pdf.doc.y + 5)
            .text((parseFloat(po[0].total_tax) || 0).toFixed(2), 480, pdf.doc.y - 12)
            .text('Grand Total:', 400, pdf.doc.y + 5)
            .text((parseFloat(po[0].grand_total) || 0).toFixed(2), 480, pdf.doc.y - 12);

        // Add terms
        if (type === 'pi') {
            pdf.doc
                .addPage()
                .fontSize(12)
                .text('Bank Details:', 50, 50)
                .fontSize(10)
                .text(`Bank Name: ${po[0].bank_name}`, 50, 70)
                .text(`Account Number: ${po[0].account_number}`, 50, 85)
                .text(`IFSC Code: ${po[0].ifsc_code}`, 50, 100);
        }

        pdf.doc
            .fontSize(12)
            .text('Terms and Conditions:', 50, pdf.doc.y + 20)
            .fontSize(10)
            .text('Payment Terms:', 50, pdf.doc.y + 10)
            .text('As per agreement', 70, pdf.doc.y)
            .text('Delivery Terms:', 50, pdf.doc.y + 10)
            .text('As per agreement', 70, pdf.doc.y);

        // Generate PDF and send as response
        const folder = type === 'po' ? 'purchase_orders' : 'proforma_invoices';
        const fileName = type === 'po' ? po[0].po_id : po[0].pi_id;

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);

        // Generate and stream PDF directly to response
        pdf.doc.end();
        pdf.doc.pipe(res);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};

// Update purchase order
exports.updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_date, payment_terms, delivery_terms, notes, status } = req.body;

        // Check if purchase order exists
        const [existingPO] = await db.execute(
            'SELECT id, po_id FROM purchase_orders WHERE id = ?',
            [id]
        );

        if (existingPO.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Update purchase order (only use existing columns)
        const updateQuery = `
            UPDATE purchase_orders 
            SET 
                expected_delivery_date = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        await db.execute(updateQuery, [
            delivery_date || null,
            status || 'draft',
            id
        ]);

        // Return updated purchase order
        const [updatedPO] = await db.execute(`
            SELECT 
                po.id,
                po.po_number,
                po.purchase_request_id,
                po.supplier_id,
                po.po_date,
                po.expected_delivery_date,
                po.status,
                po.total_amount,
                po.tax_amount,
                po.grand_total,
                po.created_by,
                s.vendor_name,
                u.full_name as created_by_name
            FROM purchase_orders po
            LEFT JOIN inventory_vendors s ON po.supplier_id = s.id
            LEFT JOIN users u ON po.created_by = u.id
            WHERE po.id = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Purchase order updated successfully',
            data: updatedPO[0]
        });

    } catch (error) {
        console.error('Error updating purchase order:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating purchase order',
            error: error.message
        });
    }
};
