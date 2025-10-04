const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

class PDFController {
    // Generate quotation PDF
    async generateQuotationPDF(req, res) {
        try {
            const { quotationId } = req.params;

            // Fetch quotation data from database
            const quotationQuery = `
                SELECT 
                    q.*,
                    c.name as client_name,
                    c.address as client_address,
                    c.phone as client_phone,
                    c.email as client_email
                FROM quotations q
                LEFT JOIN clients c ON q.client_id = c.id
                WHERE q.id = ?
            `;

            const [quotationRows] = await req.db.execute(quotationQuery, [quotationId]);

            if (quotationRows.length === 0) {
                return res.status(404).json({ error: 'Quotation not found' });
            }

            const quotation = quotationRows[0];

            // Fetch quotation items
            const itemsQuery = `
                SELECT 
                    qi.*,
                    p.name as item_name,
                    p.hsn_code,
                    p.unit
                FROM quotation_items qi
                LEFT JOIN products p ON qi.product_id = p.id
                WHERE qi.quotation_id = ?
                ORDER BY qi.id
            `;

            const [itemRows] = await req.db.execute(itemsQuery, [quotationId]);

            // Prepare quotation data for PDF
            const quotationData = {
                quotation_id: quotation.quotation_number,
                date: quotation.created_at,
                client_name: quotation.client_name,
                client_address: quotation.client_address,
                project_name: quotation.project_name,
                valid_until: quotation.valid_until,
                items: itemRows.map(item => ({
                    item_name: item.item_name,
                    hsn_code: item.hsn_code,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.unit_price,
                    amount: item.total_price
                })),
                total_amount: quotation.subtotal,
                total_tax: quotation.tax_amount,
                grand_total: quotation.total_amount,
                terms_conditions: quotation.terms_and_conditions
            };

            // Generate PDF with clean filename
            const cleanQuotationNumber = quotation.quotation_number.replace(/\//g, '_');
            const fileName = `quotation_${cleanQuotationNumber}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generateQuotationPDF(quotationData, filePath);

            // Return file path for download
            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating quotation PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }

    // Generate purchase order PDF
    async generatePurchaseOrderPDF(req, res) {
        try {
            const { poId } = req.params;

            // Fetch PO data from database
            const poQuery = `
                SELECT 
                    po.*,
                    s.supplier_name,
                    s.address as supplier_address,
                    s.phone as supplier_phone,
                    s.email as supplier_email
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = ?
            `;

            const [poRows] = await req.db.execute(poQuery, [poId]);

            if (poRows.length === 0) {
                return res.status(404).json({ error: 'Purchase order not found' });
            }

            const po = poRows[0];

            // Fetch PO items
            const itemsQuery = `
                SELECT 
                    poi.*,
                    p.name as item_description
                FROM purchase_order_items poi
                LEFT JOIN products p ON poi.product_id = p.id
                WHERE poi.po_id = ?
                ORDER BY poi.id
            `;

            const [itemRows] = await req.db.execute(itemsQuery, [poId]);

            // Prepare PO data for PDF
            const poData = {
                po_number: po.po_number,
                po_date: po.created_at,
                supplier_name: po.supplier_name,
                supplier_address: po.supplier_address,
                expected_delivery_date: po.expected_delivery_date,
                payment_terms: po.payment_terms,
                items: itemRows.map((item, index) => ({
                    item_description: item.item_description ||
                        (item.product_id ? `Product ID: ${item.product_id}` : `Item ${index + 1}`),
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: item.amount
                })),
                grand_total: po.total_amount,
                terms_and_conditions: po.terms_and_conditions
            };

            // Generate PDF with clean filename
            const cleanPoNumber = po.po_number.replace(/\//g, '_');
            const fileName = `purchase_order_${cleanPoNumber}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generatePurchaseOrderPDF(poData, filePath);

            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating PO PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }

    // Generate sales order PDF
    async generateSalesOrderPDF(req, res) {
        try {
            const { salesOrderId } = req.params;

            // Fetch sales order data from database
            const salesOrderQuery = `
                SELECT 
                    so.*,
                    q.quotation_id,
                    q.id as quotation_table_id,
                    c.company_name as client_name,
                    c.address as client_address,
                    c.phone as client_phone,
                    c.email as client_email,
                    c.city,
                    c.state,
                    se.project_name
                FROM sales_orders so
                LEFT JOIN quotations q ON so.quotation_id = q.id
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                WHERE so.id = ?
            `;

            const [salesOrderRows] = await req.db.execute(salesOrderQuery, [salesOrderId]);

            if (salesOrderRows.length === 0) {
                return res.status(404).json({ error: 'Sales order not found' });
            }

            const salesOrder = salesOrderRows[0];

            // Fetch quotation items (since sales orders inherit items from quotations)
            const itemsQuery = `
                SELECT 
                    qi.*,
                    qi.item_name,
                    qi.hsn_code,
                    qi.unit,
                    qi.rate as unit_price,
                    qi.amount as total_price,
                    qi.quantity
                FROM quotation_items qi
                WHERE qi.quotation_id = ?
                ORDER BY qi.id
            `;

            const [itemRows] = await req.db.execute(itemsQuery, [salesOrder.quotation_table_id]);

            // Prepare sales order data for PDF
            const salesOrderData = {
                sales_order_id: salesOrder.sales_order_id,
                date: salesOrder.created_at,
                client_name: salesOrder.client_name,
                client_address: salesOrder.client_address,
                city: salesOrder.city,
                state: salesOrder.state,
                project_name: salesOrder.project_name,
                customer_po_number: salesOrder.customer_po_number,
                customer_po_date: salesOrder.customer_po_date,
                expected_delivery_date: salesOrder.expected_delivery_date,
                items: itemRows.map(item => ({
                    item_name: item.item_name,
                    hsn_code: item.hsn_code,
                    quantity: item.quantity,
                    unit: item.unit || 'Nos',
                    rate: item.rate,
                    amount: item.amount
                })),
                total_amount: salesOrder.total_amount,
                tax_amount: salesOrder.tax_amount,
                advance_amount: salesOrder.advance_amount,
                balance_amount: salesOrder.balance_amount,
                production_priority: salesOrder.production_priority,
                special_instructions: salesOrder.special_instructions,
                payment_terms: salesOrder.payment_terms,
                delivery_terms: salesOrder.delivery_terms,
                warranty_terms: salesOrder.warranty_terms
            };

            // Generate PDF with clean filename
            const cleanSalesOrderId = salesOrder.sales_order_id.replace(/\//g, '_');
            const fileName = `sales_order_${cleanSalesOrderId}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generateSalesOrderPDF(salesOrderData, filePath);

            // Return file path for download
            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating sales order PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }

    // Generate GRN PDF
    async generateGRNPDF(req, res) {
        try {
            const { grnId } = req.params;

            // Fetch GRN data from database
            const grnQuery = `
                SELECT 
                    grn.*,
                    s.name as supplier_name,
                    po.po_number
                FROM goods_received_notes grn
                LEFT JOIN suppliers s ON grn.supplier_id = s.id
                LEFT JOIN purchase_orders po ON grn.purchase_order_id = po.id
                WHERE grn.id = ?
            `;

            const [grnRows] = await req.db.execute(grnQuery, [grnId]);

            if (grnRows.length === 0) {
                return res.status(404).json({ error: 'GRN not found' });
            }

            const grn = grnRows[0];

            // Fetch GRN items
            const itemsQuery = `
                SELECT 
                    grni.*,
                    p.name as item_description
                FROM grn_items grni
                LEFT JOIN products p ON grni.product_id = p.id
                WHERE grni.grn_id = ?
                ORDER BY grni.id
            `;

            const [itemRows] = await req.db.execute(itemsQuery, [grnId]);

            // Prepare GRN data for PDF
            const grnData = {
                grn_number: grn.grn_number,
                received_date: grn.received_date,
                supplier_name: grn.supplier_name,
                po_number: grn.po_number,
                invoice_number: grn.invoice_number,
                invoice_date: grn.invoice_date,
                items: itemRows.map(item => ({
                    item_description: item.item_description,
                    ordered_quantity: item.ordered_quantity,
                    received_quantity: item.received_quantity,
                    accepted_quantity: item.accepted_quantity,
                    rejected_quantity: item.rejected_quantity,
                    quality_remarks: item.quality_remarks
                }))
            };

            // Generate PDF with clean filename
            const cleanGrnNumber = grn.grn_number.replace(/\//g, '_');
            const fileName = `grn_${cleanGrnNumber}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generateGRNPDF(grnData, filePath);

            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating GRN PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF' });
        }
    }

    // Download PDF file
    async downloadPDF(req, res) {
        try {
            const { fileName } = req.params;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Error downloading PDF:', error);
            res.status(500).json({ error: 'Failed to download PDF' });
        }
    }

    // View PDF in browser
    async viewPDF(req, res) {
        try {
            const { fileName } = req.params;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // Set headers for PDF viewing
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Error viewing PDF:', error);
            res.status(500).json({ error: 'Failed to view PDF' });
        }
    }

    // Generate BOM PDF
    async generateBOMPDF(req, res) {
        try {
            const { bomId } = req.params;

            // Fetch BOM data from database
            const bomQuery = `
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

            const [bomRows] = await db.execute(bomQuery, [bomId]);

            if (bomRows.length === 0) {
                return res.status(404).json({ error: 'BOM not found' });
            }

            const bom = bomRows[0];

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

            const [items] = await db.execute(itemsQuery, [bomId]);

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

            // Prepare BOM data for PDF
            const bomData = {
                bom_number: bom.bom_number,
                bom_date: bom.bom_date,
                quotation_number: bom.quotation_number,
                project_name: bom.project_name,
                client_name: bom.client_name,
                status: bom.status,
                created_by_name: bom.created_by_name,
                total_estimated_cost: bom.total_estimated_cost,
                notes: bom.notes,
                items: groupedItems,
                raw_items: items
            };

            // Generate PDF with clean filename
            const cleanBomNumber = bom.bom_number.replace(/\//g, '_');
            const fileName = `bom_${cleanBomNumber}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generateBOMPDF(bomData, filePath);

            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating BOM PDF:', error);
            res.status(500).json({ error: 'Failed to generate BOM PDF' });
        }
    }
}

module.exports = new PDFController();
