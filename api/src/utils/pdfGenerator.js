const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PDFGenerator {
    constructor() {
        this.doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: 'VTRIA ERP Document',
                Author: 'VTRIA Engineering Solutions Pvt Ltd',
                Subject: 'Business Document',
                Creator: 'VTRIA ERP System'
            }
        });
    }

    async generateHeader(companyDetails) {
        // Add logo
        if (companyDetails.logo && fs.existsSync(companyDetails.logo)) {
            this.doc.image(companyDetails.logo, 50, 45, { width: 100 });
        }

        // Company details
        this.doc
            .fontSize(16)
            .text(companyDetails.name, 160, 50)
            .fontSize(10)
            .text(companyDetails.address, 160, 70)
            .text(`Phone: ${companyDetails.phone}`, 160, 85)
            .text(`Email: ${companyDetails.email}`, 160, 100)
            .text(`GSTIN: ${companyDetails.gstin}`, 160, 115);

        if (companyDetails.website) {
            this.doc.text(`Website: ${companyDetails.website}`, 160, 130);
        }

        // Draw line under header
        this.doc
            .moveTo(50, 150)
            .lineTo(550, 150)
            .stroke();

        return this;
    }

    async generateDocumentTitle(title, documentNumber, date) {
        this.doc
            .fontSize(18)
            .text(title, 50, 160, { align: 'center' })
            .fontSize(12)
            .text(`${title} No: ${documentNumber}`, 50, 180)
            .text(`Date: ${moment(date).format('DD/MM/YYYY')}`, 400, 180);

        return this;
    }

    async generateTable(headers, data, startY) {
        const tableTop = startY;
        const itemCodeX = 50;
        const itemDescriptionX = 100;
        const quantityX = 300;
        const priceX = 350;
        const amountX = 450;

        // Calculate column widths based on content
        const colWidths = this.calculateColumnWidths(headers, data);
        let currentX = 50;

        // Draw table headers
        this.doc
            .fontSize(10)
            .fillColor('black');

        headers.forEach((header, i) => {
            this.doc
                .rect(currentX, tableTop, colWidths[i], 20)
                .stroke()
                .text(header, currentX + 5, tableTop + 5, { width: colWidths[i] - 10 });
            currentX += colWidths[i];
        });

        // Draw table rows
        data.forEach((row, rowIndex) => {
            const rowY = tableTop + 20 + (rowIndex * 20);
            currentX = 50;

            row.forEach((cell, colIndex) => {
                this.doc
                    .rect(currentX, rowY, colWidths[colIndex], 20)
                    .stroke()
                    .text(cell.toString(), currentX + 5, rowY + 5, { width: colWidths[colIndex] - 10 });
                currentX += colWidths[colIndex];
            });
        });

        return this;
    }

    calculateColumnWidths(headers, data) {
        const totalWidth = 500;
        const numCols = headers.length;
        
        // Simple equal width distribution for now
        const colWidth = totalWidth / numCols;
        return new Array(numCols).fill(colWidth);
    }

    async generateSignatureBlock(startY) {
        this.doc
            .fontSize(10)
            .text('For VTRIA Engineering Solutions Pvt Ltd', 50, startY)
            .text('Authorized Signatory', 400, startY)
            .moveTo(380, startY - 10)
            .lineTo(530, startY - 10)
            .stroke();

        return this;
    }

    async savePDF(filePath) {
        return new Promise((resolve, reject) => {
            try {
                // Create directory if it doesn't exist
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Create write stream
                const stream = fs.createWriteStream(filePath);
                
                // Pipe PDF to file
                this.doc.pipe(stream);
                
                // Finalize the PDF
                this.doc.end();
                
                // Handle stream events
                stream.on('finish', () => {
                    console.log(`PDF generated successfully: ${filePath}`);
                    resolve(filePath);
                });
                
                stream.on('error', (error) => {
                    console.error('Error writing PDF:', error);
                    reject(error);
                });
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                reject(error);
            }
        });
    }

    // Generate VTRIA branded quotation PDF
    async generateQuotationPDF(quotationData, filePath) {
        try {
            // Company details
            const companyDetails = {
                name: 'VTRIA Engineering Solutions Pvt Ltd',
                address: 'Industrial Area, Bangalore, Karnataka - 560100',
                phone: '+91-80-1234567890',
                email: 'info@vtria.com',
                gstin: '29ABCDE1234F1Z5',
                website: 'www.vtria.com'
            };

            await this.generateHeader(companyDetails);
            await this.generateDocumentTitle('QUOTATION', quotationData.quotation_id, quotationData.date);

            // Client details
            this.doc
                .fontSize(12)
                .text('To:', 50, 200)
                .fontSize(10)
                .text(quotationData.client_name, 50, 220)
                .text(quotationData.client_address || '', 50, 235);

            // Quotation details
            this.doc
                .fontSize(10)
                .text(`Valid Until: ${moment(quotationData.valid_until).format('DD/MM/YYYY')}`, 400, 220)
                .text(`Project: ${quotationData.project_name || ''}`, 400, 235);

            // Items table
            const headers = ['S.No', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Amount'];
            const tableData = quotationData.items.map((item, index) => [
                (index + 1).toString(),
                item.item_name,
                item.hsn_code || '',
                item.quantity.toString(),
                item.unit || 'Nos',
                `₹${item.rate.toLocaleString()}`,
                `₹${item.amount.toLocaleString()}`
            ]);

            await this.generateTable(headers, tableData, 270);

            // Totals
            const totalsY = 270 + (tableData.length + 2) * 20 + 20;
            this.doc
                .fontSize(10)
                .text(`Subtotal: ₹${quotationData.total_amount.toLocaleString()}`, 400, totalsY)
                .text(`Tax: ₹${quotationData.total_tax.toLocaleString()}`, 400, totalsY + 15)
                .fontSize(12)
                .text(`Grand Total: ₹${quotationData.grand_total.toLocaleString()}`, 400, totalsY + 35);

            // Terms and conditions
            if (quotationData.terms_conditions) {
                this.doc
                    .fontSize(10)
                    .text('Terms & Conditions:', 50, totalsY + 60)
                    .text(quotationData.terms_conditions, 50, totalsY + 75, { width: 500 });
            }

            // Signature
            await this.generateSignatureBlock(totalsY + 120);

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating quotation PDF:', error);
            throw error;
        }
    }

    // Generate purchase order PDF
    async generatePurchaseOrderPDF(poData, filePath) {
        try {
            const companyDetails = {
                name: 'VTRIA Engineering Solutions Pvt Ltd',
                address: 'Industrial Area, Bangalore, Karnataka - 560100',
                phone: '+91-80-1234567890',
                email: 'purchase@vtria.com',
                gstin: '29ABCDE1234F1Z5'
            };

            await this.generateHeader(companyDetails);
            await this.generateDocumentTitle('PURCHASE ORDER', poData.po_number, poData.po_date);

            // Supplier details
            this.doc
                .fontSize(12)
                .text('To:', 50, 200)
                .fontSize(10)
                .text(poData.supplier_name, 50, 220)
                .text(poData.supplier_address || '', 50, 235);

            // PO details
            this.doc
                .fontSize(10)
                .text(`Delivery Date: ${moment(poData.expected_delivery_date).format('DD/MM/YYYY')}`, 400, 220)
                .text(`Payment Terms: ${poData.payment_terms || 'Net 30 days'}`, 400, 235);

            // Items table
            const headers = ['S.No', 'Description', 'Qty', 'Unit Price', 'Total'];
            const tableData = poData.items.map((item, index) => [
                (index + 1).toString(),
                item.item_description,
                item.quantity.toString(),
                `₹${item.unit_price.toLocaleString()}`,
                `₹${item.total_price.toLocaleString()}`
            ]);

            await this.generateTable(headers, tableData, 270);

            // Totals
            const totalsY = 270 + (tableData.length + 2) * 20 + 20;
            this.doc
                .fontSize(12)
                .text(`Total Amount: ₹${poData.grand_total.toLocaleString()}`, 400, totalsY);

            // Terms
            if (poData.terms_and_conditions) {
                this.doc
                    .fontSize(10)
                    .text('Terms & Conditions:', 50, totalsY + 30)
                    .text(poData.terms_and_conditions, 50, totalsY + 45, { width: 500 });
            }

            await this.generateSignatureBlock(totalsY + 100);

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating PO PDF:', error);
            throw error;
        }
    }

    // Generate GRN PDF
    async generateGRNPDF(grnData, filePath) {
        try {
            const companyDetails = {
                name: 'VTRIA Engineering Solutions Pvt Ltd',
                address: 'Industrial Area, Bangalore, Karnataka - 560100',
                phone: '+91-80-1234567890',
                email: 'stores@vtria.com',
                gstin: '29ABCDE1234F1Z5'
            };

            await this.generateHeader(companyDetails);
            await this.generateDocumentTitle('GOODS RECEIVED NOTE', grnData.grn_number, grnData.received_date);

            // Supplier and PO details
            this.doc
                .fontSize(10)
                .text(`Supplier: ${grnData.supplier_name}`, 50, 200)
                .text(`PO Number: ${grnData.po_number}`, 50, 215)
                .text(`Invoice No: ${grnData.invoice_number || 'N/A'}`, 400, 200)
                .text(`Invoice Date: ${grnData.invoice_date ? moment(grnData.invoice_date).format('DD/MM/YYYY') : 'N/A'}`, 400, 215);

            // Items table
            const headers = ['S.No', 'Description', 'Ordered', 'Received', 'Accepted', 'Rejected', 'Remarks'];
            const tableData = grnData.items.map((item, index) => [
                (index + 1).toString(),
                item.item_description,
                item.ordered_quantity.toString(),
                item.received_quantity.toString(),
                item.accepted_quantity.toString(),
                item.rejected_quantity.toString(),
                item.quality_remarks || ''
            ]);

            await this.generateTable(headers, tableData, 250);

            await this.generateSignatureBlock(400);

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating GRN PDF:', error);
            throw error;
        }
    }
}

module.exports = PDFGenerator;
