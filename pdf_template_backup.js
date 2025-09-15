const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
// const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class QuotationEnhancedController {
    // Generate HTML template for PDF
    generateQuotationHTML(quotation, summaryItems, detailedItems, company) {
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2
            }).format(amount);
        };

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-IN');
        };

        // Use summary items for now - we'll improve this later
        const itemsHTML = summaryItems.map((item, index) => `
            <tr>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">
                    <strong>${item.item_name}</strong><br>
                    <small>${item.description}</small>
                </td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.hsn_code}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.unit}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${formatCurrency(parseFloat(item.rate) || 0)}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px; font-weight: 600;">${formatCurrency(parseFloat(item.amount) || 0)}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation ${quotation.quotation_id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1976d2; }
        .quotation-title { font-size: 20px; margin-top: 15px; background: #1976d2; color: white; padding: 10px; }
        .details-section { display: flex; justify-content: space-between; margin: 20px 0; }
        .details-box { width: 48%; }
        .details-box h3 { color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #1976d2; color: white; padding: 10px; border: 1px solid #1976d2; }
        .totals-table { float: right; margin-top: 20px; border-collapse: collapse; }
        .totals-table td { padding: 8px 12px; border: 1px solid #ddd; }
        .grand-total { background: #1976d2; color: white; font-weight: bold; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${company.company_name || 'VTRIA ENGINEERING SOLUTIONS PVT LTD'}</div>
        <div class="quotation-title">QUOTATION - ${quotation.quotation_id}</div>
    </div>
    
    <div class="details-section">
        <div class="details-box">
            <h3>Bill To:</h3>
            <strong>${quotation.client_name || 'Client Name'}</strong><br>
            ${quotation.client_address || ''}<br>
            ${quotation.client_city || ''}, ${quotation.client_state || ''}
        </div>
        <div class="details-box">
            <h3>Quotation Details:</h3>
            <strong>Date:</strong> ${formatDate(quotation.date)}<br>
            <strong>Valid Until:</strong> ${formatDate(quotation.valid_until)}<br>
            <strong>Project:</strong> ${quotation.project_name || 'N/A'}
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Sr.</th>
                <th>Description</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>

    <table class="totals-table">
        <tr>
            <td><strong>Subtotal:</strong></td>
            <td style="text-align: right;">${formatCurrency(parseFloat(quotation.total_amount) || 0)}</td>
        </tr>
        <tr>
            <td><strong>Tax:</strong></td>
            <td style="text-align: right;">${formatCurrency(parseFloat(quotation.total_tax) || 0)}</td>
        </tr>
        <tr class="grand-total">
            <td><strong>Grand Total:</strong></td>
            <td style="text-align: right;"><strong>${formatCurrency(parseFloat(quotation.grand_total) || 0)}</strong></td>
        </tr>
    </table>

    <div class="footer">
        This is a computer generated quotation.<br>
        For queries, contact: ${company.email || 'info@vtria.com'} | ${company.phone || '+91 80 1234 5678'}
    </div>
</body>
</html>`;
    }
}

module.exports = new QuotationEnhancedController();