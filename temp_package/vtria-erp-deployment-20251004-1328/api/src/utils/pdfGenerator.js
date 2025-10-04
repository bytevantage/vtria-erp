const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PDFGenerator {
    constructor() {
        // Remove the doc creation from constructor
        this.doc = null;
    }

    createNewDocument() {
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
        return this.doc;
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
            // Create new document for this PDF
            this.createNewDocument();
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
                `Rs.${item.rate.toLocaleString()}`,
                `Rs.${item.amount.toLocaleString()}`
            ]);

            await this.generateTable(headers, tableData, 270);

            // Totals
            const totalsY = 270 + (tableData.length + 2) * 20 + 20;
            this.doc
                .fontSize(10)
                .text(`Subtotal: Rs.${quotationData.total_amount.toLocaleString()}`, 400, totalsY)
                .text(`Tax: Rs.${quotationData.total_tax.toLocaleString()}`, 400, totalsY + 15)
                .fontSize(12)
                .text(`Grand Total: Rs.${quotationData.grand_total.toLocaleString()}`, 400, totalsY + 35);

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
            // Create new document for this PDF
            this.createNewDocument();
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
                `Rs.${item.unit_price.toLocaleString()}`,
                `Rs.${item.total_price.toLocaleString()}`
            ]);

            await this.generateTable(headers, tableData, 270);

            // Totals
            const totalsY = 270 + (tableData.length + 2) * 20 + 20;
            this.doc
                .fontSize(12)
                .text(`Total Amount: Rs.${poData.grand_total.toLocaleString()}`, 400, totalsY);

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

    // Generate sales order PDF
    async generateSalesOrderPDF(salesOrderData, filePath) {
        try {
            // Create new document for this PDF
            this.createNewDocument();
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
            await this.generateDocumentTitle('SALES ORDER', salesOrderData.sales_order_id, salesOrderData.date);

            // Client details
            this.doc
                .fontSize(12)
                .text('To:', 50, 200)
                .fontSize(10)
                .text(salesOrderData.client_name, 50, 220)
                .text(salesOrderData.client_address || '', 50, 235)
                .text(`${salesOrderData.city}, ${salesOrderData.state}`, 50, 250);

            // Sales order details
            this.doc
                .fontSize(10)
                .text(`Expected Delivery: ${salesOrderData.expected_delivery_date ? moment(salesOrderData.expected_delivery_date).format('DD/MM/YYYY') : 'TBD'}`, 400, 220)
                .text(`Priority: ${salesOrderData.production_priority?.toUpperCase() || 'MEDIUM'}`, 400, 235)
                .text(`Project: ${salesOrderData.project_name || 'N/A'}`, 400, 250);

            // Customer PO details if available
            let currentY = 280;
            if (salesOrderData.customer_po_number) {
                this.doc
                    .text(`Customer PO: ${salesOrderData.customer_po_number}`, 50, currentY)
                    .text(`PO Date: ${salesOrderData.customer_po_date ? moment(salesOrderData.customer_po_date).format('DD/MM/YYYY') : 'N/A'}`, 400, currentY);
                currentY += 20;
            }

            // Items section
            currentY += 20;
            this.doc.fontSize(12).text('Items:', 50, currentY);
            currentY += 25;

            if (salesOrderData.items && salesOrderData.items.length > 0) {
                // Improved items layout with better spacing
                salesOrderData.items.forEach((item, index) => {
                    // First line: Item number and name
                    this.doc
                        .fontSize(10)
                        .text(`${index + 1}. ${item.item_name}`, 50, currentY, { width: 200 });

                    // Same line: Quantity, Rate, Amount with adjusted positions
                    this.doc
                        .text(`Qty: ${item.quantity}`, 260, currentY)
                        .text(`Rate: Rs.${parseFloat(item.rate).toLocaleString()}`, 320, currentY)
                        .text(`Amt: Rs.${parseFloat(item.amount).toLocaleString()}`, 420, currentY);

                    currentY += 18;
                });
            } else {
                this.doc.fontSize(10).text('No items found', 50, currentY);
                currentY += 18;
            }

            // Totals with tax breakdown
            currentY += 20;
            const subtotal = parseFloat(salesOrderData.total_amount) || 0;
            const taxAmount = parseFloat(salesOrderData.tax_amount) || 0;
            const grandTotal = subtotal + taxAmount;

            this.doc
                .fontSize(10)
                .text(`Subtotal: Rs.${subtotal.toLocaleString()}`, 350, currentY)
                .text(`GST (18%): Rs.${taxAmount.toLocaleString()}`, 350, currentY + 15)
                .fontSize(12)
                .text(`Total Amount: Rs.${grandTotal.toLocaleString()}`, 350, currentY + 35)
                .fontSize(10)
                .text(`Advance: Rs.${parseFloat(salesOrderData.advance_amount || 0).toLocaleString()}`, 350, currentY + 55)
                .fontSize(12)
                .text(`Balance: Rs.${parseFloat(salesOrderData.balance_amount || grandTotal).toLocaleString()}`, 350, currentY + 75);

            // Terms
            currentY += 100;
            if (salesOrderData.payment_terms || salesOrderData.delivery_terms || salesOrderData.warranty_terms) {
                this.doc.fontSize(10).text('Terms & Conditions:', 50, currentY);
                currentY += 15;

                if (salesOrderData.payment_terms) {
                    this.doc.text(`Payment Terms: ${salesOrderData.payment_terms}`, 50, currentY);
                    currentY += 15;
                }
                if (salesOrderData.delivery_terms) {
                    this.doc.text(`Delivery Terms: ${salesOrderData.delivery_terms}`, 50, currentY);
                    currentY += 15;
                }
                if (salesOrderData.warranty_terms) {
                    this.doc.text(`Warranty Terms: ${salesOrderData.warranty_terms}`, 50, currentY);
                    currentY += 15;
                }
            }

            // Special instructions
            if (salesOrderData.special_instructions) {
                currentY += 15;
                this.doc
                    .fontSize(10)
                    .text('Special Instructions:', 50, currentY)
                    .text(salesOrderData.special_instructions, 50, currentY + 15, { width: 500 });
            }

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating sales order PDF:', error);
            throw error;
        }
    }

    // Generate GRN PDF
    async generateGRNPDF(grnData, filePath) {
        try {
            // Create new document for this PDF
            this.createNewDocument();
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

    // Generate Purchase Requisition PDF
    async generatePurchaseRequisitionPDF(prData, filePath) {
        try {
            // Create new document for this PDF
            this.createNewDocument();
            const companyDetails = {
                name: 'VTRIA Engineering Solutions Pvt Ltd',
                address: 'Industrial Area, Bangalore, Karnataka - 560100',
                phone: '+91-80-1234567890',
                email: 'purchase@vtria.com',
                gstin: '29ABCDE1234F1Z5'
            };

            await this.generateHeader(companyDetails);
            await this.generateDocumentTitle('PURCHASE REQUISITION', prData.pr_number, prData.pr_date);

            // Client and PR details
            this.doc
                .fontSize(10)
                .text(`Client: ${prData.client_name}`, 50, 200)
                .text(`Case Number: ${prData.case_number || 'N/A'}`, 50, 215)
                .text(`Supplier: ${prData.supplier_name || 'TBD'}`, 400, 200)
                .text(`Status: ${prData.status?.toUpperCase()}`, 400, 215)
                .text(`Priority: ${prData.priority?.toUpperCase() || 'NORMAL'}`, 400, 230);

            // Items section with simple layout (like sales orders)
            let currentY = 250;
            this.doc.fontSize(12).text('Items:', 50, currentY);
            currentY += 25;

            if (prData.items && prData.items.length > 0) {
                // Simple items list instead of complex table
                prData.items.forEach((item, index) => {
                    // Truncate long text to fit
                    const partName = (item.part_name || 'N/A').substring(0, 25);
                    const partCode = (item.part_code || 'N/A').substring(0, 15);

                    this.doc
                        .fontSize(10)
                        .text(`${index + 1}. ${partName}`, 50, currentY, { width: 200 })
                        .text(`Code: ${partCode}`, 260, currentY)
                        .text(`Qty: ${item.quantity || 0}`, 360, currentY)
                        .text(`Rate: Rs.${item.estimated_price ? parseFloat(item.estimated_price).toLocaleString() : 'TBD'}`, 420, currentY);

                    currentY += 18;

                    // Add amount on next line if we have pricing
                    if (item.estimated_price && item.quantity) {
                        const amount = parseFloat(item.estimated_price) * parseInt(item.quantity);
                        this.doc
                            .fontSize(10)
                            .text(`Amount: Rs.${amount.toLocaleString()}`, 420, currentY);
                        currentY += 18;
                    }

                    currentY += 5; // Extra spacing between items
                });
            } else {
                this.doc.fontSize(10).text('No items found', 50, currentY);
                currentY += 18;
            }

            // Calculate total
            const totalAmount = prData.items.reduce((sum, item) => {
                if (item.estimated_price && item.quantity) {
                    return sum + (parseFloat(item.estimated_price) * parseInt(item.quantity));
                }
                return sum;
            }, 0);

            // Totals
            currentY += 20;
            if (totalAmount > 0) {
                this.doc
                    .fontSize(12)
                    .text(`Estimated Total: Rs.${totalAmount.toLocaleString()}`, 350, currentY);
            }

            // Notes
            if (prData.notes) {
                currentY += 30;
                this.doc
                    .fontSize(10)
                    .text('Notes:', 50, currentY)
                    .text(prData.notes, 50, currentY + 15, { width: 500 });
                currentY += 70;
            } else {
                currentY += 30;
            }

            // Approval section
            const signatureY = currentY + 20;
            this.doc
                .fontSize(10)
                .text('Prepared By:', 50, signatureY)
                .text('Approved By:', 200, signatureY)
                .text('Purchase Manager:', 350, signatureY)
                .moveTo(50, signatureY + 25)
                .lineTo(150, signatureY + 25)
                .stroke()
                .moveTo(200, signatureY + 25)
                .lineTo(300, signatureY + 25)
                .stroke()
                .moveTo(350, signatureY + 25)
                .lineTo(450, signatureY + 25)
                .stroke();

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating purchase requisition PDF:', error);
            throw error;
        }
    }

    async generateEstimationPDF(estimationData, filePath) {
        try {
            // Create new document for this PDF
            this.createNewDocument();

            // Company details
            const companyDetails = {
                name: 'VTRIA ENGINEERING SOLUTIONS PVT LTD',
                address: 'Plot No. 123, Industrial Area, Bengaluru - 560001, Karnataka, India',
                phone: '+91-80-1234-5678',
                email: 'info@vtria.com',
                gstin: '29ABCDE1234F1Z5',
                website: 'www.vtria.com'
            };

            // Generate header
            await this.generateHeader(companyDetails);

            // Title
            this.doc
                .fontSize(18)
                .text('ESTIMATION', 50, 170, { align: 'center' });

            // Estimation details
            const estimationY = 200;
            this.doc
                .fontSize(12)
                .text(`Estimation No: ${estimationData.estimation_id}`, 50, estimationY)
                .text(`Date: ${moment(estimationData.date).format('DD/MM/YYYY')}`, 400, estimationY)
                .text(`Status: ${estimationData.status.toUpperCase()}`, 400, estimationY + 15);

            // Client details
            const clientY = estimationY + 40;
            this.doc
                .fontSize(10)
                .text('Client Details:', 50, clientY)
                .text(estimationData.client_name || 'N/A', 50, clientY + 15)
                .text(estimationData.client_address || '', 50, clientY + 30)
                .text(`Phone: ${estimationData.client_phone || 'N/A'}`, 50, clientY + 45)
                .text(`Email: ${estimationData.client_email || 'N/A'}`, 50, clientY + 60);

            // Project details
            this.doc
                .text('Project Details:', 300, clientY)
                .text(`Project: ${estimationData.project_name || 'N/A'}`, 300, clientY + 15)
                .text(`Description: ${estimationData.description || 'N/A'}`, 300, clientY + 30);

            let currentY = clientY + 100;

            // Items table header
            this.doc
                .fontSize(10)
                .text('S.No', 50, currentY)
                .text('Item Description', 75, currentY)
                .text('HSN', 240, currentY)
                .text('Qty', 280, currentY)
                .text('Unit', 310, currentY)
                .text('MRP', 340, currentY)
                .text('Disc%', 470, currentY)
                .text('Amount', 510, currentY);

            // Draw line under header
            currentY += 15;
            this.doc
                .moveTo(50, currentY)
                .lineTo(600, currentY)
                .stroke();

            currentY += 10;
            let serialNo = 1;

            // Process sections and items
            for (const [sectionName, items] of Object.entries(estimationData.sections || {})) {
                // Section header
                this.doc
                    .fontSize(11)
                    .fillColor('black')
                    .text(sectionName, 50, currentY);
                currentY += 20;

                // Process items directly (no subsections)
                if (Array.isArray(items)) {
                    for (const item of items) {
                        if (currentY > 700) {
                            this.doc.addPage();
                            currentY = 50;
                        }

                        this.doc
                            .fontSize(9)
                            .fillColor('black')
                            .text(serialNo.toString(), 50, currentY)
                            .text(item.item_name || 'N/A', 75, currentY, { width: 155 })
                            .text(item.hsn_code || '', 240, currentY)
                            .text(parseInt(item.quantity || 0).toString(), 280, currentY)
                            .text(item.unit || '', 310, currentY)
                            .text(`Rs.${parseFloat(item.mrp || 0).toFixed(2)}`, 340, currentY)
                            .text(`${item.discount_percentage || 0}%`, 470, currentY)
                            .text(`Rs.${parseFloat(item.final_price || 0).toFixed(2)}`, 510, currentY);

                        currentY += 20;
                        serialNo++;
                    }
                }
            }

            // Totals section
            currentY += 20;
            this.doc
                .moveTo(50, currentY)
                .lineTo(600, currentY)
                .stroke();

            currentY += 15;
            this.doc
                .fontSize(10)
                .text('Total MRP:', 370, currentY)
                .text(`Rs.${parseFloat(estimationData.total_mrp || 0).toFixed(2)}`, 470, currentY)
                .text('Total Discount:', 370, currentY + 15)
                .text(`Rs.${parseFloat(estimationData.total_discount || 0).toFixed(2)}`, 470, currentY + 15)
                .fontSize(12)
                .text('Final Amount:', 370, currentY + 35)
                .text(`Rs.${parseFloat(estimationData.total_final_price || 0).toFixed(2)}`, 470, currentY + 35);

            // Notes section
            if (estimationData.notes) {
                currentY += 70;
                this.doc
                    .fontSize(10)
                    .text('Notes:', 50, currentY)
                    .text(estimationData.notes, 50, currentY + 15, { width: 500 });
            }

            // Terms and conditions
            currentY += 100;
            this.doc
                .fontSize(10)
                .text('Terms & Conditions:', 50, currentY)
                .text('1. This estimation is valid for 30 days from the date of issue.', 50, currentY + 15)
                .text('2. Prices are subject to change without prior notice.', 50, currentY + 30)
                .text('3. All prices are exclusive of taxes unless specified.', 50, currentY + 45);

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating estimation PDF:', error);
            throw error;
        }
    }

    // Generate Bill of Materials PDF
    async generateBOMPDF(bomData, filePath) {
        try {
            // Create new document for this PDF
            this.createNewDocument();
            const companyDetails = {
                name: 'VTRIA Engineering Solutions Pvt Ltd',
                address: 'Industrial Area, Bangalore, Karnataka - 560100',
                phone: '+91-80-1234567890',
                email: 'production@vtria.com',
                gstin: '29ABCDE1234F1Z5'
            };

            await this.generateHeader(companyDetails);
            await this.generateDocumentTitle('BILL OF MATERIALS', bomData.bom_number, bomData.bom_date);

            // BOM details
            this.doc
                .fontSize(10)
                .text(`Client: ${bomData.client_name || 'N/A'}`, 50, 200)
                .text(`Project: ${bomData.project_name || 'N/A'}`, 50, 215)
                .text(`Quotation: ${bomData.quotation_number || 'N/A'}`, 400, 200)
                .text(`Status: ${bomData.status?.toUpperCase() || 'DRAFT'}`, 400, 215)
                .text(`Created By: ${bomData.created_by_name || 'N/A'}`, 400, 230);

            let currentY = 260;

            // Group items by section for better organization
            if (bomData.items && Object.keys(bomData.items).length > 0) {
                // Process grouped items by section
                for (const [sectionName, subsections] of Object.entries(bomData.items)) {
                    // Section header
                    this.doc
                        .fontSize(12)
                        .fillColor('black')
                        .text(sectionName, 50, currentY);
                    currentY += 25;

                    // Process subsections
                    for (const [subsectionName, items] of Object.entries(subsections)) {
                        if (subsectionName !== 'General') {
                            // Subsection header (only if not General)
                            this.doc
                                .fontSize(10)
                                .text(`  ${subsectionName}`, 60, currentY);
                            currentY += 20;
                        }

                        // Items in this subsection
                        items.forEach((item, index) => {
                            if (currentY > 700) {
                                this.doc.addPage();
                                currentY = 50;
                            }

                            // Item details - compact layout
                            const productName = `${item.product_name || 'N/A'} - ${item.make || ''} ${item.model || ''}`.trim();

                            this.doc
                                .fontSize(9)
                                .text(`• ${productName}`, 70, currentY, { width: 200 })
                                .text(`Code: ${item.part_code || 'N/A'}`, 280, currentY)
                                .text(`Qty: ${item.quantity || 0}`, 360, currentY)
                                .text(`Unit: ${item.unit || 'Nos'}`, 400, currentY)
                                .text(`Cost: Rs.${parseFloat(item.estimated_cost || 0).toLocaleString()}`, 450, currentY);

                            // Stock status indicator
                            if (item.stock_available) {
                                this.doc
                                    .fillColor('green')
                                    .text('✓', 530, currentY)
                                    .fillColor('black');
                            } else {
                                this.doc
                                    .fillColor('red')
                                    .text('✗', 530, currentY)
                                    .fillColor('black');
                            }

                            currentY += 18;
                        });

                        currentY += 10; // Extra spacing between subsections
                    }

                    currentY += 15; // Extra spacing between sections
                }
            } else if (bomData.raw_items && bomData.raw_items.length > 0) {
                // Fallback to raw items if grouped items not available
                this.doc.fontSize(12).text('Items:', 50, currentY);
                currentY += 25;

                bomData.raw_items.forEach((item, index) => {
                    if (currentY > 700) {
                        this.doc.addPage();
                        currentY = 50;
                    }

                    const productName = `${item.product_name || 'N/A'} - ${item.make || ''} ${item.model || ''}`.trim();

                    this.doc
                        .fontSize(9)
                        .text(`${index + 1}. ${productName}`, 50, currentY, { width: 200 })
                        .text(`Code: ${item.part_code || 'N/A'}`, 260, currentY)
                        .text(`Qty: ${item.quantity || 0}`, 340, currentY)
                        .text(`Unit: ${item.unit || 'Nos'}`, 380, currentY)
                        .text(`Cost: Rs.${parseFloat(item.estimated_cost || 0).toLocaleString()}`, 430, currentY);

                    // Stock status
                    if (item.stock_available) {
                        this.doc
                            .fillColor('green')
                            .text('In Stock', 520, currentY)
                            .fillColor('black');
                    } else {
                        this.doc
                            .fillColor('red')
                            .text('Order', 520, currentY)
                            .fillColor('black');
                    }

                    currentY += 18;
                });
            }

            // Totals section
            currentY += 30;
            this.doc
                .moveTo(50, currentY)
                .lineTo(550, currentY)
                .stroke();

            currentY += 15;
            this.doc
                .fontSize(12)
                .text(`Total Estimated Cost: Rs.${parseFloat(bomData.total_estimated_cost || 0).toLocaleString()}`, 350, currentY);

            // Legend
            currentY += 40;
            this.doc
                .fontSize(10)
                .text('Legend:', 50, currentY)
                .fillColor('green')
                .text('✓ In Stock', 50, currentY + 15)
                .fillColor('red')
                .text('✗ Need to Order', 150, currentY + 15)
                .fillColor('black');

            // Notes section
            if (bomData.notes) {
                currentY += 50;
                this.doc
                    .fontSize(10)
                    .text('Notes:', 50, currentY)
                    .text(bomData.notes, 50, currentY + 15, { width: 500 });
                currentY += 70;
            }

            // Approval section
            currentY += 30;
            this.doc
                .fontSize(10)
                .text('Prepared By:', 50, currentY)
                .text('Production Manager:', 200, currentY)
                .text('Approved By:', 400, currentY)
                .moveTo(50, currentY + 25)
                .lineTo(150, currentY + 25)
                .stroke()
                .moveTo(200, currentY + 25)
                .lineTo(350, currentY + 25)
                .stroke()
                .moveTo(400, currentY + 25)
                .lineTo(500, currentY + 25)
                .stroke();

            return await this.savePDF(filePath);
        } catch (error) {
            console.error('Error generating BOM PDF:', error);
            throw error;
        }
    }
}

module.exports = PDFGenerator;
