const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

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
            
            // Generate PDF
            const fileName = `quotation_${quotation.quotation_number}_${Date.now()}.pdf`;
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
                    s.name as supplier_name,
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
                WHERE poi.purchase_order_id = ?
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
                items: itemRows.map(item => ({
                    item_description: item.item_description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price
                })),
                grand_total: po.total_amount,
                terms_and_conditions: po.terms_and_conditions
            };
            
            // Generate PDF
            const fileName = `purchase_order_${po.po_number}_${Date.now()}.pdf`;
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
            
            // Generate PDF
            const fileName = `grn_${grn.grn_number}_${Date.now()}.pdf`;
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
}

module.exports = new PDFController();
